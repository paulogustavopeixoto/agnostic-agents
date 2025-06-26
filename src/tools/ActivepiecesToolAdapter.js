/**
 * Activepieces → Tool Adapter
 * Dynamically converts Activepieces integrations into Agent Tools.
 *
 * Location: src/tools/ActivepiecesToolAdapter.js
 * 
 * Correct way for providing auth tokens:
 * Example:
 * const auth = {
 *  slack: process.env.SLACK_ACCESS_TOKEN,
 *  notion: process.env.NOTION_ACCESS_TOKEN,
 *  github: process.env.GITHUB_ACCESS_TOKEN,
 * };
 */
const { Tool } = require('../agent/Tool');

// ✅ Map Activepieces property types to JSON Schema types
function mapPropertyType(prop) {
  const typeMap = {
    SHORT_TEXT: 'string',
    LONG_TEXT: 'string',
    NUMBER: 'number',
    CHECKBOX: 'boolean',
    DROPDOWN: 'string',
    DATE_TIME: 'string',
    JSON: 'object',
  };
  return typeMap[prop.type] || 'string';
}

// ✅ Convert Activepieces props to JSON Schema
function mapPropsToJsonSchema(props = {}) {
  const properties = {};
  const required = [];

  for (const [key, prop] of Object.entries(props)) {
    properties[key] = {
      type: mapPropertyType(prop),
      description: prop.description || prop.displayName || '',
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

// ✅ Create Tool instance from Activepieces action
function createToolFromAction({ pieceName, actionKey, action, authContext = {} }) {
  const name = `${pieceName}_${actionKey}`;
  const description = action.description || action.displayName || name;
  const parameters = mapPropsToJsonSchema(action.props);

  const implementation = async (args) => {
    const result = await action.run({
      propsValue: args,
      auth: authContext || {},
      store: {}, 
    });
    return result;
  };

  return new Tool({
    name,
    description,
    parameters,
    implementation,
  });
}

function normalizeAuth(rawAuth) {
  // If the auth is already an object, assume the user knew what they were doing
  if (typeof rawAuth === 'object') {
    return rawAuth;
  }

  // Otherwise, assume it's a string (the token) and inject it under common keys
  return {
    token: rawAuth,
    access_token: rawAuth,
    api_key: rawAuth,
    bearer_token: rawAuth, // Some APIs use this
    key: rawAuth,          // Generic fallback
  };
}

/**
 * ✅ Load Tools from Activepieces pieces.
 * @param {object} options
 * @param {object} options.pieces - { pieceName: pieceObject } mapping
 * @param {object} options.auth - { pieceName: credentialsObject } mapping
 * @returns {Tool[]} Array of Tool instances
 */
function loadToolsFromPieces({ pieces = {}, auth = {} }) {
  const tools = [];

  for (const [pieceName, piece] of Object.entries(pieces)) {
    const normalizedAuth = normalizeAuth(auth[pieceName]);

    const actions = piece.actions && Object.keys(piece.actions).length > 0
      ? piece.actions
      : piece._actions;

    if (!actions) {
      console.warn(`No actions found for piece: ${pieceName}`);
      continue;
    }

    for (const [actionKey, action] of Object.entries(actions)) {
      const tool = createToolFromAction({
        pieceName,
        actionKey,
        action,
        authContext: normalizedAuth,
      });
      tools.push(tool);
    }
  }

  return tools;
}

module.exports = {
  loadToolsFromPieces,
};

