// src/tools/PieceTool.js

const { Tool } = require('../agent/Tool');

/**
 * PieceTool
 * A generic tool adapter for Activepieces integrations.
 * 
 * Converts any Activepieces action into a callable Tool instance.
 * Handles dynamic authentication key injection to support
 * pieces that expect credentials in different formats (auth object, propsValue, etc.).
 * 
 * Example usage:
 * 
 * const slackSendMessage = new PieceTool({
 *   pieceName: 'slack',
 *   actionKey: 'send_channel_message',
 *   action: slack._actions['send_channel_message'](),
 *   authToken: process.env.SLACK_ACCESS_TOKEN,
 * });
 * 
 * const result = await slackSendMessage.call({
 *   channel: '#general',
 *   message: 'Hello from AI!',
 * });
 */
class PieceTool extends Tool {

    /**
   * @param {object} config
   * @param {string} config.pieceName - Name of the piece (e.g. 'slack').
   * @param {string} config.actionKey - Name of the action inside the piece.
   * @param {object} config.action - The action object (factory output, not the factory itself).
   * @param {string|object} config.authToken - Authentication token (string or key-value map).
   */
  constructor({ pieceName, actionKey, action, authToken }) {
    console.log("authToken: ", authToken);
    const name = PieceTool.normalizeName(pieceName, actionKey);
    const description = action.description || action.displayName || name;
    const parameters = PieceTool.mapPropsToJsonSchema(action.props);

    const authContext = PieceTool.normalizeAuth(authToken);

    const implementation = async (args) => {
      const authKeysToTry = ['access_token', 'token', 'api_key', 'bearer_token', 'key'];

      let lastError = null;

      for (const key of authKeysToTry) {
        const authAttempt = { [key]: authContext[key] || authContext.access_token || authContext.token || authContext.api_key || authContext.bearer_token || authContext.key };
        console.log("authAttempt: ", authAttempt);
        
        // 🔥 Also inject into props in case the piece requires it there
        const propsWithAuth = {
          ...args,
          [key]: authAttempt[key],
        };

        try {
          const result = await action.run({
            propsValue: propsWithAuth,
            auth: authAttempt,
            store: {},
          });

          // ✅ Success
          return result;

        } catch (err) {
          const errorMessage = err?.message || err?.data?.error || '';

          // 🔥 If error suggests auth failure, try next key
          if (errorMessage.includes('not_authed') || errorMessage.includes('invalid_auth') || errorMessage.includes('missing_auth')) {
            console.warn(`[PieceTool] Auth with key "${key}" failed: ${errorMessage}`);
            lastError = err;
            continue;
          }

          // 🔥 Other error, not auth — throw it
          throw err;
        }
      }

      // 🚫 If none of the keys worked, throw last error
      throw new Error(`[PieceTool] All auth attempts failed for ${name}: ${lastError?.message || lastError}`);
    };

    super({
      name,
      description,
      parameters,
      implementation,
    });

    this.pieceName = pieceName;
    this.actionKey = actionKey;
    this.action = action;
    this.authContext = authContext;
  }

  /**
   * Normalize tool name to camelCase format based on piece and action.
   * @param {string} pieceName 
   * @param {string} actionKey 
   * @returns {string}
   */
  static normalizeName(pieceName, actionKey) {
    const str = `${pieceName}_${actionKey}`;
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  /**
   * Convert piece action props into JSON schema.
   * @param {object} props 
   * @returns {object} JSON Schema object
   */
  static mapPropsToJsonSchema(props = {}) {
    const properties = {};
    const required = [];

    for (const [key, prop] of Object.entries(props)) {
      properties[key] = {
        type: PieceTool.mapPropertyType(prop),
        description: prop.description || prop.displayName || '',
      };
      if (prop.required) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  /**
   * Map Activepieces property types to JSON Schema types.
   * @param {object} prop 
   * @returns {string} JSON schema type
   */
  static mapPropertyType(prop) {
    const typeMap = {
      SHORT_TEXT: 'string',
      LONG_TEXT: 'string',
      NUMBER: 'number',
      CHECKBOX: 'boolean',
      DROPDOWN: 'string',
      DATE_TIME: 'string',
      JSON: 'object',
    };
    return typeMap[prop.type] || 'string';
  }

  /**
   * Normalize the auth token input into an auth context object.
   * @param {string|object} rawAuth - Token string or an auth object.
   * @returns {object} Normalized auth object
   */
  static normalizeAuth(rawAuth) {
    if (!rawAuth) return {};
    if (typeof rawAuth === 'object') return rawAuth;
    return {
      access_token: rawAuth,
      token: rawAuth,
      api_key: rawAuth,
      bearer_token: rawAuth,
      key: rawAuth,
    };
  }
}

module.exports = { PieceTool };