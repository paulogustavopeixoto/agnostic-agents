const { PieceTool } = require('./PieceTool');

function loadApiSpec(apiSpecJson, { pieceName, authToken }) {
  const baseUrl = apiSpecJson.baseUrl;
  const tools = [];

  for (const [path, spec] of Object.entries(apiSpecJson.endpoints)) {
    const name = `${pieceName}${path.replace(/[\/{}]/g, '_')}`;
    const method = spec.method.toUpperCase();

    const tool = new PieceTool({
      pieceName,
      actionKey: name,
      action: {
        name,
        displayName: name,
        description: spec.description,
        props: {
          ...(spec.queryParams?.reduce((acc, param) => {
            acc[param] = { type: 'string', description: `Query param ${param}` };
            return acc;
          }, {}) || {}),
          ...(spec.bodyParams?.reduce((acc, param) => {
            acc[param] = { type: 'string', description: `Body param ${param}` };
            return acc;
          }, {}) || {})
        },
        run: async (params = {}, context) => {
          const query = {};
          const body = {};

          for (const param of spec.queryParams || []) {
            if (params[param]) query[param] = params[param];
          }
          for (const param of spec.bodyParams || []) {
            if (params[param]) body[param] = params[param];
          }

          const urlQuery = Object.keys(query).length
            ? '?' + new URLSearchParams(query).toString()
            : '';

          const url = `${baseUrl}${path}${urlQuery}`;
          const headers = {
            'Content-Type': 'application/json',
          };

          if (spec.requiresAuth) {
            headers['Authorization'] = `Bearer ${context.authToken}`;
          }

          const response = await fetch(url, {
            method,
            headers,
            body: ['POST', 'PATCH', 'PUT'].includes(method) ? JSON.stringify(body) : undefined,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${JSON.stringify(data)}`);
          }

          return { status: response.status, data };
        }
      },
      authToken
    });

    tools.push(tool);
  }

  return { tools, triggers: {} };
}

module.exports = { loadApiSpec };