// src/tools/adapters/ApiLoader.js
const { ApiTool } = require('../tools/adapters/ApiTool');

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
            const headers = { 'Content-Type': 'application/json', ...(input.headers || {}) };

            // Interpolate path
            const finalPath = path.replace(/{(\w+)}/g, (_, key) => {
              if (!(key in input)) throw new Error(`Missing path param: ${key}`);
              return input[key];
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

            const res = await fetch(url, {
              method: httpMethod,
              headers,
              body: ['POST', 'PATCH', 'PUT'].includes(httpMethod) ? JSON.stringify(body) : undefined,
            });

            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : await res.text();

            if (!res.ok) {
              throw new Error(`API Error ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
            }

            return { status: res.status, data };
          },
        },
      });

      tools.push(tool);
    }

    return { tools, triggers: {} };
  }
}

module.exports = { ApiLoader };