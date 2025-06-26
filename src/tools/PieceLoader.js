const { PieceTool } = require('./PieceTool');

/**
 * PieceLoader
 * Dynamically loads all actions from a given Activepieces piece
 * and wraps them as PieceTool instances.
 */
class PieceLoader {
  /**
   * Load tools from an Activepieces piece.
   * @param {object} config
   * @param {string} config.pieceName - Name of the piece (e.g., 'slack').
   * @param {object} config.piece - The imported piece object (e.g., `require('@activepieces/piece-slack')`).
   * @param {string|object} config.authToken - Auth token (or key-object) for this piece.
   * @returns {PieceTool[]} Array of PieceTool instances.
   */
  static load({ pieceName, piece, authToken }) {
    const tools = [];

    const actions = piece.actions && Object.keys(piece.actions).length > 0
      ? piece.actions
      : piece._actions;

    if (!actions) {
      console.warn(`[PieceLoader] No actions found for piece: ${pieceName}`);
      return tools;
    }

    for (const [actionKey, actionFactory] of Object.entries(actions)) {
      try {
        const action = actionFactory;
        const tool = new PieceTool({
          pieceName,
          actionKey,
          action,
          authToken,
        });
        tools.push(tool);
      } catch (err) {
        console.error(
          `[PieceLoader] Failed to load action ${actionKey} from ${pieceName}:`,
          err.message
        );
      }
    }

    return tools;
  }
}

module.exports = { PieceLoader };