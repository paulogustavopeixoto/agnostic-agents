const { Tool } = require('../agent/Tool');
const { BaseAppSpec } = require('./specs/BaseAppSpec'); 

class PieceTool extends Tool {
  constructor({ pieceName, actionKey, action, authToken, spec = new BaseAppSpec() }) {
    const name = PieceTool.normalizeName(pieceName, actionKey);
    const description = action.description || action.displayName || name;

    const parameters = PieceTool.mapPropsToJsonSchema(action.props, spec);
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

        const argsWithAuth = {
          ...args,
          [key]: authAttempt[key],
        };

        const transformedArgs = spec.transformArgs(actionKey, argsWithAuth);

        try {
          const result = await action.run({
            propsValue: transformedArgs,
            auth: authAttempt,
            store: {},
          });

          return spec.transformResult(actionKey, result);
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

          throw err;
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
    this.spec = spec;
  }

  /**
   * ✅ Metadata export
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
   * 🔥 Name normalization
   */
  static normalizeName(pieceName, actionKey) {
    const str = `${pieceName}_${actionKey}`;
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  /**
   * 🔥 Parameter mapping with alias support
   */
  static mapPropsToJsonSchema(props = {}, spec = new BaseAppSpec()) {
    const properties = {};
    const required = [];

    for (const [key, prop] of Object.entries(props)) {
      properties[key] = {
        type: PieceTool.mapPropertyType(prop),
        description: prop.description || prop.displayName || '',
        aliases: [...(PieceTool.getDefaultAliases(key) || []), ...(spec.getAliases()?.[key] || [])],
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

  static mapPropertyType(prop) {
    const typeMap = {
      SHORT_TEXT: 'string',
      LONG_TEXT: 'string',
      NUMBER: 'number',
      CHECKBOX: 'boolean',
      DROPDOWN: 'string',
      DATE_TIME: 'string',
      JSON: 'object',
      OBJECT: 'object',
    };
    return typeMap[prop.type] || 'string';
  }

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

  static getDefaultAliases(paramName) {
    const aliasMap = {
      channel: ['conversation_id', 'chatId'],
      message: ['text', 'body', 'content'],
      user: ['user_id', 'recipient', 'handle'],
      file: ['file_id', 'filePath'],
      thread: ['thread_id', 'thread_ts'],
    };
    return aliasMap[paramName] || [];
  }

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