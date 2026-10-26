// src/tools/adapters/ApiTool.js
const { Tool } = require('../tools/adapters/Tool');
const { BaseAppSpec } = require('../tools/adapters/BaseAppSpec');

class ApiTool extends Tool {
  constructor({ serviceName, endpointId, action, authToken, spec = new BaseAppSpec() }) {
    spec = spec || new BaseAppSpec();
    const name = ApiTool.normalizeName(serviceName, endpointId);

    const parameters = ApiTool.mapPropsToJsonSchema(action.props, spec);

    const outputSchema = action.outputSchema || null;
    for (const key of action.required || []) {
      if (!parameters.required.includes(key)) parameters.required.push(key);
    }

    const implementation = async (args, context = {}) => {
      const transformed = spec.transformArgs(endpointId, args);
      const parameterLocations = Object.fromEntries(
        Object.entries(action.props || {}).map(([key, value]) => [key, value.location || null])
      );

      // Credentials belong to transport context, never model-visible arguments.
      const merged = { ...transformed, __parameterLocations: parameterLocations };

      const result = await action.run(merged, {
        ...context,
        authToken: authToken,
        props: action.props
      });

      return spec.transformResult(endpointId, result);
    };

    super({
      name,
      description: action.description || `Call ${endpointId}`,
      parameters,
      outputSchema,
      implementation,
      strict: true,
      metadata: {
        examples: ApiTool.generateExample(parameters),
        tags: [serviceName, "api"],
        version: "1.0.0",
        sideEffectLevel: 'external_write',
        retryabilityHint: 'never',
        ...(action.metadata || {}),
      }
    });

    this.serviceName = serviceName;
    this.endpointId = endpointId;
    this.action = action;
    this.spec = spec;
    this.authToken = authToken;
  }

  toMetadata() {
    return this.toUnifiedSchema();
  }

  static normalizeName(serviceName, endpointId) {
    // Convert `/bookings_create` → BookingsCreate
    const clean = endpointId
      .replace(/^\/+/, '')                         // Remove leading slashes
      .split(/[_/]/)                                // Split by _ or /
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');                                    // Rejoin as PascalCase

    const name = `${serviceName}${clean}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!name || name.length > 64) throw new Error('API tool name must contain 1 to 64 supported characters.');
    return name;
  }

  static mapPropsToJsonSchema(props = {}, spec = new BaseAppSpec()) {
    const properties = {};
    const required = [];

    for (const [key, prop] of Object.entries(props)) {
      const type = ApiTool.mapPropertyType(prop);

      const propertySchema = {
        ...Object.fromEntries(Object.entries(prop).filter(([name]) =>
          !['location', 'required', 'type', 'aliases'].includes(name))),
        type,
        description: prop.description || '',
        aliases: [
          ...(ApiTool.getDefaultAliases(key) || []),
          ...((spec?.getAliases?.()?.[key]) || []),
        ],
      };

      if (type === 'object' && prop.properties) {
        const nested = ApiTool.mapPropsToJsonSchema(prop.properties, spec);
        propertySchema.properties = nested.properties;
        propertySchema.required = Array.isArray(prop.required) ? prop.required : nested.required;
      }

      if (type === 'array') {
        const itemType = (prop.items && prop.items.type) ? prop.items.type : 'string';
        propertySchema.items = { ...prop.items, type: itemType };
      }

      properties[key] = propertySchema;

      if (prop.required === true) {
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
      MARKDOWN: 'string',
      TEXT: 'string',
      CODE: 'string',
      RICH_TEXT: 'string',
      NUMBER: 'number',
      INTEGER: 'integer',
      CHECKBOX: 'boolean',
      BOOLEAN: 'boolean',
      DROPDOWN: 'string',
      DATE_TIME: 'string',
      JSON: 'object',
      OBJECT: 'object',
      ARRAY: 'array',
      STRING: 'string',
    };

    const rawType = (prop.type || '').toString().trim().toUpperCase();
    return typeMap[rawType] || 'string';
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
          example[key] = 'sample-text';
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

module.exports = { ApiTool };
