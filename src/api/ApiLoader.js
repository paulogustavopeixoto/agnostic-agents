// src/tools/adapters/ApiLoader.js
const { ApiTool } = require('./ApiTool');
const { invokeWithDeadline } = require('../runtime/InvocationControl');

function normalizeType(type) {
  const valid = ['string', 'number', 'integer', 'boolean', 'object', 'array'];
  const t = (type || '').toLowerCase();
  return valid.includes(t) ? t : 'string';
}

function convertParamsToProperties(params = {}) {
  const properties = {};
  for (const [key, val] of Object.entries(params)) {
    const type = normalizeType(val?.type || (val.properties ? 'object' : 'string'));
    const prop = {
      type,
      description: val.description || '',
      required: val.required === true,
      ...(val.enum && { enum: val.enum }),
    };

    if (type === 'object' && val.properties) {
      prop.properties = convertParamsToProperties(val.properties);
    }

    if (type === 'array' && val.items) {
      prop.items = { type: normalizeType(val.items.type) };
    }

    properties[key] = prop;
  }
  return properties;
}

function getRequiredKeys(props) {
  return Object.entries(props)
    .filter(([_, def]) => def.required === true)
    .map(([key]) => key);
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();
  for (const key in query) {
    const val = query[key];
    if (Array.isArray(val)) val.forEach(v => params.append(key, v));
    else if (val != null) params.append(key, String(val));
  }
  return params.toString() ? '?' + params.toString() : '';
}

function coerceValue(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true';
  if (type === 'string') return String(value);
  return value;
}

class ApiLoader {
  static load({ serviceName, authToken, apiSpec, spec = null }) {
    if (!apiSpec || !apiSpec.endpoints) throw new Error('[ApiLoader] Missing valid API spec');

    const baseUrl = apiSpec.baseUrl;
    const authConfig = apiSpec.auth || { type: 'header', key: 'Authorization', format: 'Bearer {token}' };

    const applyAuth = (headers, query) => {
      if (!authToken) throw new Error('Missing authToken for authenticated API call');
      switch (authConfig.type) {
        case 'query':
          query[authConfig.key] = authToken;
          break;
        case 'header':
          headers[authConfig.key] = authConfig.format.replace('{token}', authToken);
          break;
        case 'bearer':
          headers[authConfig.key || 'Authorization'] = `${authConfig.prefix || 'Bearer'} ${authToken}`;
          break;
        default:
          throw new Error(`Unsupported auth type: ${authConfig.type}`);
      }
    };

    const tools = [];

    for (const [id, endpoint] of Object.entries(apiSpec.endpoints)) {
      const {
        path,
        method,
        description,
        queryParams = {},
        bodyParams = {},
        pathParams = {},
        headers: headerParams = {},
        requiresAuth = true,
      } = endpoint;

      const httpMethod = method.toUpperCase();
      const name = `${serviceName}_${id.replace(/^\//, '')}`;

      const props = {
        ...Object.fromEntries(Object.entries(convertParamsToProperties(queryParams)).map(([k, v]) => [k, { ...v, location: 'query' }])),
        ...Object.fromEntries(Object.entries(convertParamsToProperties(bodyParams)).map(([k, v]) => [k, { ...v, location: 'body' }])),
        ...Object.fromEntries(Object.entries(convertParamsToProperties(headerParams)).map(([k, v]) => [k, { ...v, location: 'header' }])),
        ...Object.fromEntries(Object.entries(convertParamsToProperties(pathParams)).map(([k, v]) => [k, { ...v, location: 'path' }])),
      };

      const required = getRequiredKeys(props);

      const tool = new ApiTool({
        serviceName,
        endpointId: id,
        authToken,
        spec,
        action: {
          name,
          description: description || `Call ${path}`,
          props,
          required,
          run: async (params = {}, context = {}) => {
            const input = params.propsValue || params;
            const query = {};
            const body = {};
            const headers = { 'Content-Type': 'application/json' };

            // Interpolate path
            const finalPath = path.replace(/{(\w+)}/g, (_, key) => {
              if (!(key in input)) throw new Error(`Missing path param: ${key}`);
              if (['.', '..'].includes(String(input[key]))) throw new Error('Invalid path segment');
              return encodeURIComponent(input[key]);
            });

            for (const [k, def] of Object.entries(props)) {
              if (input[k] === undefined) continue;

              let val = input[k];
              if (['string', 'number', 'boolean'].includes(def.type)) {
                val = coerceValue(val, def.type);
              }

              if (def.type === 'object' && typeof val === 'string') {
                try {
                  val = JSON.parse(val);
                } catch {
                  throw new Error(`Expected JSON object for param "${k}"`);
                }
              }

              if (def.type === 'array' && Array.isArray(val) && def.items) {
                val = val.map(v => coerceValue(v, def.items.type));
              }

              switch (def.location) {
                case 'query': query[k] = val; break;
                case 'body': body[k] = val; break;
                case 'header': headers[k] = val; break;
              }
            }

            if (requiresAuth) applyAuth(headers, query);

            const queryString = buildQueryString(query);
            const url = `${baseUrl}${finalPath}${queryString}`;
            const base = new URL(baseUrl);
            const target = new URL(url);
            if (!['http:', 'https:'].includes(base.protocol) || target.origin !== base.origin || target.username || target.password) {
              throw new Error('API request must use the configured HTTP origin');
            }

            return invokeWithDeadline(async signal => {
            const res = await fetch(url, {
              method: httpMethod,
              headers,
              signal,
              redirect: 'manual',
              body: ['POST', 'PATCH', 'PUT'].includes(httpMethod) ? JSON.stringify(body) : undefined,
            });

            const contentType = res.headers.get('content-type') || '';
            if (!res.ok) {
              await res.body?.cancel?.();
              throw new Error(`API request failed with status ${res.status}`);
            }
            let data;
            if (res.body?.getReader) {
              const reader = res.body.getReader();
              const chunks = [];
              let size = 0;
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  size += value.byteLength;
                  if (size > 1048576) throw new Error('API response exceeds size limit');
                  chunks.push(Buffer.from(value));
                }
              } finally { await reader.cancel(); reader.releaseLock(); }
              const text = Buffer.concat(chunks).toString('utf8');
              data = contentType.includes('application/json') && text ? JSON.parse(text) : text;
            } else {
              // Compatibility for injected/mock response implementations.
              data = contentType.includes('application/json') ? await res.json() : await res.text();
              if (Buffer.byteLength(JSON.stringify(data) || '') > 1048576) throw new Error('API response exceeds size limit');
            }

            return { status: res.status, data };
            }, { signal: context.signal, timeoutMs: 30000 });
          },
        },
      });

      tools.push(tool);
    }

    if (new Set(tools.map(tool => tool.name)).size !== tools.length) throw new Error('API tool name collision.');
    return { tools, triggers: {} };
  }
}

module.exports = { ApiLoader };
