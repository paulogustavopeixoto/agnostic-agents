// src/api/OpenAPILoader.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const axios = require("axios");
const { ApiTool } = require("./ApiTool");

/**
 * Load an OpenAPI 3.0/3.1 file and convert all endpoints into ApiTool instances.
 */
class OpenAPILoader {
  static load(filePath, { serviceName = "api", authToken = null } = {}) {
    if (!filePath) throw new Error("OpenAPI Loader requires file path");

    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, "utf8");

    const spec = (ext === ".yaml" || ext === ".yml")
      ? yaml.load(raw)
      : JSON.parse(raw);

    const baseUrl = spec.servers?.[0]?.url || "";
    const paths = spec.paths || {};

    const tools = [];

    for (const [route, definition] of Object.entries(paths)) {
      for (const [method, endpoint] of Object.entries(definition)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) continue;

        const name = OpenAPILoader.normalizeName(serviceName, method, route);
        const description = endpoint.summary || endpoint.description || `Call ${method.toUpperCase()} ${route}`;

        // ---------------------------
        // 1. Build JSON Schema parameters
        // ---------------------------
        const parameters = OpenAPILoader.buildParameterSchema([...(definition.parameters || []), ...(endpoint.parameters || [])]);

        // Request body → put into properties.body
        if (endpoint.requestBody?.content?.["application/json"]?.schema) {
          parameters.properties.body = {
            ...endpoint.requestBody.content["application/json"].schema,
            location: 'body',
          };
          if (endpoint.requestBody.required) {
            parameters.required.push('body');
          }
        }

        // ---------------------------
        // 2. Build output schema
        // ---------------------------
        const outputSchema = OpenAPILoader.extractResponseSchema(endpoint);

        // ---------------------------
        // 3. Build the tool implementation (actual API call)
        // ---------------------------
        const implementation = OpenAPILoader.buildImplementation({
          baseUrl,
          route,
          method,
          authToken
        });

        // Register the tool
        tools.push(
          new ApiTool({
            serviceName,
            endpointId: `${method}_${route}`,
            action: {
              name,
              description,
              props: parameters.properties,
              required: parameters.required,
              outputSchema,
              run: implementation
            },
            authToken
          })
        );
      }
    }

    if (new Set(tools.map(tool => tool.name)).size !== tools.length) throw new Error('OpenAPI tool name collision.');
    return { tools, triggers: {} };
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  static normalizeName(service, method, route) {
    return (
      service +
      method.toUpperCase() +
      route.replace(/[\/{}]/g, "_").replace(/__+/g, "_")
    );
  }

  static buildParameterSchema(params = []) {
    const properties = {};
    const required = [];

    for (const p of params) {
      const schema = p.schema || { type: "string" };

      properties[p.name] = {
        ...schema,
        type: schema.type || "string",
        description: p.description || "",
        location: p.in || 'query',
        ...(schema.enum && { enum: schema.enum }),
      };

      if (p.required) required.push(p.name);
    }

    return { properties, required };
  }

  static extractResponseSchema(endpoint) {
    const responses = endpoint.responses || {};
    const success =
      responses["200"] ||
      responses["201"] ||
      responses["202"];

    const payload = success?.content?.['application/json']?.schema;
    return payload ? { type: 'object', properties: { status: { type: 'integer' }, data: payload }, required: ['status', 'data'] } : null;
  }

  static buildImplementation({ baseUrl, route, method, authToken }) {
    return async (params = {}, context = {}) => {
      let finalPath = route.replace(/{(\w+)}/g, (_, key) => {
        if (params[key] === undefined) {
          throw new Error(`Missing path param: ${key}`);
        }
        if (['.', '..'].includes(String(params[key]))) throw new Error('Invalid path segment');
        return encodeURIComponent(params[key]);
      });

      const query = {};
      const headers = { "Content-Type": "application/json" };
      let body = params.body || {};

      for (const [k, v] of Object.entries(params)) {
        if (k === 'body' || k === '__parameterLocations') {
          continue;
        }

        const location = params.__parameterLocations?.[k];
        if (!location) continue;
        if (location === 'path') {
          continue;
        }
        if (location === 'header') {
          headers[k] = v;
          continue;
        }
        query[k] = v;
      }

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const qs = Object.keys(query).length
        ? "?" + new URLSearchParams(query).toString()
        : "";

      const url = baseUrl + finalPath + qs;
      const base = new URL(baseUrl);
      const target = new URL(url);
      if (!['http:', 'https:'].includes(base.protocol) || target.origin !== base.origin || target.username || target.password) {
        throw new Error('API request must use the configured HTTP origin');
      }

      const response = await axios.request({
        url,
        method,
        headers,
        signal: context.signal,
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 1048576,
        maxBodyLength: 1048576,
        data: ["post", "put", "patch"].includes(method) ? body : undefined,
      });

      return {
        status: response.status,
        data: response.data,
      };
    };
  }
}

module.exports = { OpenAPILoader };
