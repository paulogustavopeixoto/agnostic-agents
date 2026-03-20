const { ApiLoader } = require('./ApiLoader');

class CurlLoader {
  static load(curlCommand, { serviceName = 'curl', authToken = null } = {}) {
    const parsed = this.parse(curlCommand);
    const apiSpec = this.toApiSpec(parsed);
    const effectiveAuthToken = authToken || this._extractAuthToken(parsed.headers || {});
    return ApiLoader.load({
      serviceName,
      authToken: effectiveAuthToken,
      apiSpec,
    });
  }

  static parse(curlCommand = '') {
    if (typeof curlCommand !== 'string' || !curlCommand.trim()) {
      throw new Error('CurlLoader requires a non-empty curl command string.');
    }

    const tokens = this._tokenize(curlCommand.trim());
    if (!tokens.length || tokens[0] !== 'curl') {
      throw new Error('CurlLoader expects a curl command.');
    }

    let method = 'GET';
    let url = null;
    const headers = {};
    let body = null;

    for (let index = 1; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token === '-X' || token === '--request') {
        method = (tokens[index + 1] || 'GET').toUpperCase();
        index += 1;
        continue;
      }
      if (token === '-H' || token === '--header') {
        const header = tokens[index + 1] || '';
        const separator = header.indexOf(':');
        if (separator !== -1) {
          const key = header.slice(0, separator).trim();
          const value = header.slice(separator + 1).trim();
          headers[key] = value;
        }
        index += 1;
        continue;
      }
      if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
        body = tokens[index + 1] || '';
        if (method === 'GET') {
          method = 'POST';
        }
        index += 1;
        continue;
      }
      if (!token.startsWith('-') && !url) {
        url = token;
      }
    }

    if (!url) {
      throw new Error('CurlLoader could not find a URL in the curl command.');
    }

    return {
      method,
      url,
      headers,
      body,
    };
  }

  static toApiSpec(parsed = {}) {
    const url = new URL(parsed.url);
    const queryParams = {};
    for (const [key] of url.searchParams.entries()) {
      queryParams[key] = { type: 'string' };
    }

    const headerParams = {};
    for (const [key] of Object.entries(parsed.headers || {})) {
      if (key.toLowerCase() === 'authorization') {
        continue;
      }
      headerParams[key] = { type: 'string' };
    }

    let bodyParams = {};
    if (parsed.body) {
      try {
        const parsedBody = JSON.parse(parsed.body);
        bodyParams = this._jsonToParams(parsedBody);
      } catch {
        bodyParams = {
          body: {
            type: 'string',
            description: 'Raw request body imported from curl.',
          },
        };
      }
    }

    const hasAuthHeader = Object.keys(parsed.headers || {}).some(key => key.toLowerCase() === 'authorization');
    const authHeader = Object.entries(parsed.headers || {}).find(([key]) => key.toLowerCase() === 'authorization')?.[1] || '';
    const isBearerAuth = /^Bearer\s+/i.test(String(authHeader));

    return {
      baseUrl: `${url.protocol}//${url.host}`,
      auth: hasAuthHeader
        ? { type: 'header', key: 'Authorization', format: isBearerAuth ? 'Bearer {token}' : '{token}' }
        : { type: 'header', key: 'Authorization', format: 'Bearer {token}' },
      endpoints: {
        importedCurl: {
          path: url.pathname,
          method: parsed.method || 'GET',
          description: `Imported from curl ${parsed.method || 'GET'} ${url.pathname}`,
          queryParams,
          bodyParams,
          headers: headerParams,
          requiresAuth: hasAuthHeader,
        },
      },
    };
  }

  static _jsonToParams(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (Array.isArray(entry)) {
          return [
            key,
            {
              type: 'array',
              items: {
                type: this._inferPrimitiveType(entry[0]),
              },
            },
          ];
        }
        if (entry && typeof entry === 'object') {
          return [
            key,
            {
              type: 'object',
              properties: this._jsonToParams(entry),
            },
          ];
        }
        return [
          key,
          {
            type: this._inferPrimitiveType(entry),
          },
        ];
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

  static _extractAuthToken(headers = {}) {
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'authorization');
    if (!entry) {
      return null;
    }
    const [, value] = entry;
    const bearerMatch = String(value).match(/^Bearer\s+(.+)$/i);
    return bearerMatch ? bearerMatch[1] : String(value);
  }

  static _tokenize(input) {
    const tokens = [];
    let current = '';
    let quote = null;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (quote) {
        if (char === quote) {
          quote = null;
        } else if (char === '\\' && input[index + 1] === quote) {
          current += input[index + 1];
          index += 1;
        } else {
          current += char;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }
}

module.exports = { CurlLoader };
