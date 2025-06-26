// src/tools/PieceTool.js

const { Tool } = require('../agent/Tool');

/**
 * PieceTool
 * Converts an Activepieces action into a universal Tool definition,
 * with support for function calling, metadata extraction, semantic aliases,
 * authentication handling, and example generation.
 */
class PieceTool extends Tool {
  /**
   * @param {object} config
   * @param {string} config.pieceName - The piece name (e.g., 'slack').
   * @param {string} config.actionKey - The action key inside the piece (e.g., 'send_channel_message').
   * @param {object} config.action - The action function (already instantiated, not the factory itself).
   * @param {string|object} config.authToken - The authentication token or object.
   */
  constructor({ pieceName, actionKey, action, authToken }) {
    const name = PieceTool.normalizeName(pieceName, actionKey);
    const description = action.description || action.displayName || name;
    const parameters = PieceTool.mapPropsToJsonSchema(action.props);

    const authContext = PieceTool.normalizeAuth(authToken);

    const implementation = async (args) => {
      const authKeysToTry = ['access_token', 'token', 'api_key', 'bearer_token', 'key'];

      let lastError = null;

      for (const key of authKeysToTry) {
        const authAttempt = {
          [key]:
            authContext[key] ||
            authContext.access_token ||
            authContext.token ||
            authContext.api_key ||
            authContext.bearer_token ||
            authContext.key,
        };

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

          return result;
        } catch (err) {
          const errorMessage = err?.message || err?.data?.error || '';

          if (
            errorMessage.includes('not_authed') ||
            errorMessage.includes('invalid_auth') ||
            errorMessage.includes('missing_auth')
          ) {
            console.warn(`[PieceTool] Auth with key "${key}" failed: ${errorMessage}`);
            lastError = err;
            continue;
          }

          throw err; // Other errors not related to auth
        }
      }

      throw new Error(
        `[PieceTool] All auth attempts failed for ${name}: ${lastError?.message || lastError}`
      );
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
    this.requiresAuth = !!authToken;
  }

  /**
   * Export tool metadata for use by AI agents, function calling, or UI generation.
   * Includes name, description, parameters, and auth requirement.
   * @returns {object} Metadata object
   */
  toMetadata() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      requiresAuth: this.requiresAuth,
      examples: PieceTool.generateExample(this.parameters),
    };
  }

  /**
   * Normalize tool name to camelCase from pieceName_actionKey
   */
  static normalizeName(pieceName, actionKey) {
    const str = `${pieceName}_${actionKey}`;
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  /**
   * Convert Activepieces props into JSON Schema with semantic alias injection.
   */
  static mapPropsToJsonSchema(props = {}) {
    const properties = {};
    const required = [];

    for (const [key, prop] of Object.entries(props)) {
      properties[key] = {
        type: PieceTool.mapPropertyType(prop),
        description: prop.description || prop.displayName || '',
        aliases: PieceTool.getAliases(key),
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
   * Map Activepieces prop types to JSON Schema types.
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
   * Normalize auth input: token string → key-value object.
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

  /**
   * Lookup aliases for common parameter names.
   */
  static getAliases(paramName) {
    const aliasMap = {
      channel: ['conversation_id', 'chatId'],
      message: ['text', 'body', 'content'],
      user: ['user_id', 'recipient', 'handle'],
      file: ['file_id', 'filePath'],
      thread: ['thread_id', 'thread_ts'],
    };
    return aliasMap[paramName] || [];
  }

  /**
   * Generate a dummy example input based on parameter schema.
   */
  static generateExample(parameters) {
    const example = {};
    const props = parameters?.properties || {};

    for (const [key, schema] of Object.entries(props)) {
      switch (schema.type) {
        case 'string':
          if (key.toLowerCase().includes('channel')) {
            example[key] = '#general';
          } else if (key.toLowerCase().includes('message') || key.toLowerCase().includes('text')) {
            example[key] = 'Hello world!';
          } else if (key.toLowerCase().includes('user')) {
            example[key] = '@username';
          } else if (key.toLowerCase().includes('file')) {
            example[key] = 'file-id-or-path';
          } else {
            example[key] = 'sample-text';
          }
          break;
        case 'number':
          example[key] = 123;
          break;
        case 'boolean':
          example[key] = true;
          break;
        case 'object':
          example[key] = { key: 'value' };
          break;
        default:
          example[key] = 'example';
      }
    }

    return example;
  }
}

module.exports = { PieceTool };