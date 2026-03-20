const fs = require('fs');
const path = require('path');
const { ApiLoader } = require('./ApiLoader');

class PostmanLoader {
  static load(input, { serviceName = 'postman', authToken = null, variables = {} } = {}) {
    const collection = typeof input === 'string'
      ? JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'))
      : input;

    if (!collection || !Array.isArray(collection.item)) {
      throw new Error('PostmanLoader requires a Postman collection with an item array.');
    }

    const apiSpec = this.toApiSpec(collection, { variables });
    return ApiLoader.load({
      serviceName,
      authToken,
      apiSpec,
    });
  }

  static toApiSpec(collection, { variables = {} } = {}) {
    const mergedVariables = {
      ...Object.fromEntries((collection.variable || []).map(entry => [entry.key, entry.value])),
      ...variables,
    };

    const endpoints = {};
    const walk = (items = [], prefix = []) => {
      for (const item of items) {
        if (Array.isArray(item.item)) {
          walk(item.item, prefix.concat(item.name || 'group'));
          continue;
        }
        if (!item.request) {
          continue;
        }

        const nameParts = prefix.concat(item.name || 'request').filter(Boolean);
        const endpointId = nameParts.join('_').replace(/\W+/g, '_');
        endpoints[endpointId] = this._requestToEndpoint(item.request, mergedVariables);
      }
    };

    walk(collection.item);

    const firstUrl = Object.values(endpoints)[0]?.__rawUrl || '';
    const firstParsed = firstUrl ? new URL(firstUrl) : null;
    const baseUrl = firstParsed ? `${firstParsed.protocol}//${firstParsed.host}` : '';

    for (const endpoint of Object.values(endpoints)) {
      delete endpoint.__rawUrl;
    }

    return {
      baseUrl,
      endpoints,
    };
  }

  static _requestToEndpoint(request, variables) {
    const method = (request.method || 'GET').toUpperCase();
    const resolvedUrl = this._resolveUrl(request.url, variables);
    const parsed = new URL(resolvedUrl);
    const queryParams = {};
    for (const [key] of parsed.searchParams.entries()) {
      queryParams[key] = { type: 'string' };
    }

    const headers = {};
    for (const header of request.header || []) {
      if (!header || !header.key || header.disabled) {
        continue;
      }
      if (header.key.toLowerCase() === 'authorization') {
        continue;
      }
      headers[header.key] = { type: 'string', required: false };
    }

    let bodyParams = {};
    if (request.body?.mode === 'raw' && typeof request.body.raw === 'string' && request.body.raw.trim()) {
      try {
        bodyParams = this._jsonToParams(JSON.parse(this._applyVariables(request.body.raw, variables)));
      } catch {
        bodyParams = {
          body: {
            type: 'string',
            description: 'Raw request body imported from Postman.',
          },
        };
      }
    }

    return {
      __rawUrl: resolvedUrl,
      path: parsed.pathname,
      method,
      description: request.description || `Imported from Postman ${method} ${parsed.pathname}`,
      queryParams,
      bodyParams,
      headers,
      requiresAuth: Boolean(request.auth || (request.header || []).find(header => header.key?.toLowerCase() === 'authorization')),
    };
  }

  static _resolveUrl(urlValue, variables) {
    if (typeof urlValue === 'string') {
      return this._applyVariables(urlValue, variables);
    }
    if (urlValue?.raw) {
      return this._applyVariables(urlValue.raw, variables);
    }
    throw new Error('PostmanLoader could not resolve a request URL.');
  }

  static _applyVariables(value, variables) {
    return String(value).replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
      return variables[key] != null ? String(variables[key]) : '';
    });
  }

  static _jsonToParams(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (Array.isArray(entry)) {
          return [key, { type: 'array', items: { type: this._inferPrimitiveType(entry[0]) } }];
        }
        if (entry && typeof entry === 'object') {
          return [key, { type: 'object', properties: this._jsonToParams(entry) }];
        }
        return [key, { type: this._inferPrimitiveType(entry) }];
      })
    );
  }

  static _inferPrimitiveType(value) {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    return 'string';
  }
}

module.exports = { PostmanLoader };
