
class BaseAppSpec {
  constructor() {}

  getGenericCustomApiSpec(baseUrl) {
    return {
        name: `${this.constructor.name.replace('Spec', '')}CustomApiCall`,
        description: `Make a raw API call to ${baseUrl}`,
        parameters: {
        type: 'object',
        properties: {
            endpoint: { type: 'string', description: 'API path (e.g., /scheduled_events)' },
            method: { type: 'string', enum: ['GET', 'POST', 'PATCH', 'DELETE'] },
            headers: { type: 'object', default: {}, description: 'Optional headers' },
            query: { type: 'object', default: {}, description: 'Query params' },
            body: { type: 'object', default: {}, description: 'Request body for POST/PATCH' },
        },
        required: ['endpoint', 'method'],
        },
        implementation: async ({ endpoint, method, headers = {}, query = {}, body = {} }, context) => {
        const finalEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${baseUrl}${finalEndpoint}`;

        const queryString = Object.keys(query).length
            ? '?' + Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
            : '';

        const res = await fetch(url + queryString, {
            method: method.toUpperCase(),
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.authToken}`,
            ...headers,
            },
            body: ['POST', 'PATCH'].includes(method.toUpperCase()) ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`${baseUrl} API Error: ${res.status} ${JSON.stringify(data)}`);
        }

        return { status: res.status, data };
        },
    };
  }

  /**
   * Transform arguments before sending to the API
   * Override in subclasses.
   */
  transformArgs(actionKey, args) {
    return args;
  }

  /**
   * Optional: post-process output from API
   */
  transformResult(actionKey, result) {
    return result;
  }

  /**
   * Optional: map semantic aliases
   */
  getAliases() {
    return {};
  }
}

module.exports = { BaseAppSpec };