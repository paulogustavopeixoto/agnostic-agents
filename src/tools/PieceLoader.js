const { PieceTool } = require('./PieceTool');

/**
 * PieceLoader
 * Dynamically loads actions, triggers from a piece,
 * and API Spec tools with flexible authentication handling.
 */
class PieceLoader {
  /**
   * 
   * @param {object} config
   * @param {string} config.pieceName
   * @param {object} config.piece - The imported piece module (optional)
   * @param {string} config.authToken
   * @param {object} [config.spec] - Optional AppSpec (transform/aliases)
   * @param {object} [config.apiSpec] - Optional API spec JSON
   * @returns {object} { tools: PieceTool[], triggers: object }
   */
  static load({ pieceName, piece = null, authToken, spec = null, apiSpec = null }) {
    const tools = [];
    const triggers = {};

    // ✅ Load piece-based actions
    if (piece) {
      const actions = (piece.actions && Object.keys(piece.actions).length > 0)
        ? piece.actions
        : piece._actions;

      const loadedTriggers = (piece.triggers && Object.keys(piece.triggers).length > 0)
        ? piece.triggers
        : piece._triggers;

      if (actions) {
        for (const [actionKey, actionFactory] of Object.entries(actions)) {
          const tool = new PieceTool({
            pieceName,
            actionKey,
            action: actionFactory,
            authToken,
            spec,
          });
          tools.push(tool);
        }
      }

      if (loadedTriggers) {
        for (const [triggerKey, triggerFactory] of Object.entries(loadedTriggers)) {
          triggers[`${pieceName}_${triggerKey}`] = triggerFactory;
        }
      }
    }

    // ✅ Load API spec-defined tools
    if (apiSpec) {
      const baseUrl = apiSpec.baseUrl;
      const authConfig = apiSpec.auth || {
        type: 'header',
        key: 'Authorization',
        format: 'Bearer {token}', // Default fallback
      };

      const applyAuth = (headers, query) => {
        if (!authToken) {
          throw new Error('Missing authToken for authenticated API call.');
        }

        if (authConfig.type === 'query') {
          query[authConfig.key] = authToken;
        } else if (authConfig.type === 'header') {
          const value = authConfig.format
            ? authConfig.format.replace('{token}', authToken)
            : authToken;

          headers[authConfig.key] = value;
        }
      };

      for (const [key, specEntry] of Object.entries(apiSpec.endpoints)) {
        const {
          path,
          method,
          description,
          queryParams = {},
          bodyParams = {},
          requiresAuth = true,
        } = specEntry;

        const name = `${pieceName}${path.replace(/[\/{}]/g, '_')}`;
        const httpMethod = method.toUpperCase();

        // 🔥 Build properties with descriptions if available
        const properties = {};

        for (const [param, desc] of Object.entries(queryParams)) {
          properties[param] = {
            type: 'string',
            description: desc || `Query parameter ${param}`,
          };
        }

        for (const [param, desc] of Object.entries(bodyParams)) {
          properties[param] = {
            type: 'string',
            description: desc || `Body parameter ${param}`,
          };
        }

        const tool = new PieceTool({
          pieceName,
          actionKey: name,
          action: {
            name,
            displayName: name,
            description: description || `API call to ${path}`,
            props: properties,
            run: async (params = {}, context = {}) => {
              const query = {};
              const body = {};
              const headers = {
                'Content-Type': 'application/json',
                ...(params.headers || {}),
              };

              // ✅ Path parameter replacement
              const finalPath = path.replace(/{(\w+)}/g, (_, key) => {
                if (!params[key]) {
                  throw new Error(`Missing path parameter: ${key}`);
                }
                return params[key];
              });

              // ✅ Query and body population
              for (const param of Object.keys(queryParams)) {
                if (params[param] !== undefined) {
                  query[param] = params[param];
                }
              }

              for (const param of Object.keys(bodyParams)) {
                if (params[param] !== undefined) {
                  body[param] = params[param];
                }
              }

              // ✅ Apply auth
              if (requiresAuth) {
                applyAuth(headers, query);
              }

              const queryString = Object.keys(query).length
                ? '?' + new URLSearchParams(query).toString()
                : '';

              const url = `${baseUrl}${finalPath}${queryString}`;

              const response = await fetch(url, {
                method: httpMethod,
                headers,
                body: ['POST', 'PATCH', 'PUT'].includes(httpMethod)
                  ? JSON.stringify(body)
                  : undefined,
              });

              const contentType = response.headers.get('content-type') || '';
              const isJson = contentType.includes('application/json');

              const data = isJson ? await response.json() : await response.text();

              if (!response.ok) {
                throw new Error(
                  `API Error ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
                );
              }

              return { status: response.status, data };
            },
          },
          authToken,
          spec,
        });

        tools.push(tool);
        console.log(`[PieceLoader] ✅ Registered API spec tool for ${pieceName}: ${name}`);
      }
    }

    return { tools, triggers };
  }
}

module.exports = { PieceLoader };