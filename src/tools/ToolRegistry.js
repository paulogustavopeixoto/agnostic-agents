/**
 * ToolRegistry
 * 
 * A dynamic registry for managing Tool instances.
 * Supports registering, searching, filtering, and exporting tool metadata.
 */

class ToolRegistry {
  constructor() {
    /** @type {Map<string, Tool>} */
    this.tools = new Map();
  }

  /**
   * Register one or more tools.
   * @param {Tool | Tool[]} toolOrArray 
   */
  register(toolOrArray) {
    const tools = Array.isArray(toolOrArray) ? toolOrArray : [toolOrArray];

    for (const tool of tools) {
      if (!tool.name) {
        console.warn('[ToolRegistry] Tool missing name, skipping:', tool);
        continue;
      }
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Find a tool by its name.
   * @param {string} name 
   * @returns {Tool | undefined}
   */
  findByName(name) {
    return this.tools.get(name);
  }

  /**
   * Find all tools from a given piece (e.g., 'slack').
   * @param {string} pieceName 
   * @returns {Tool[]}
   */
  findByPiece(pieceName) {
    return Array.from(this.tools.values()).filter(tool => 
      tool.pieceName === pieceName
    );
  }

  /**
   * Search tools by partial name or description.
   * @param {string} query 
   * @returns {Tool[]}
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values()).filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * List all tools.
   * @returns {Tool[]}
   */
  list() {
    return Array.from(this.tools.values());
  }

  /**
   * Export metadata for all tools.
   * @returns {object[]} Array of metadata objects.
   */
  toMetadata() {
    return this.list().map(tool => tool.toMetadata());
  }
}

module.exports = { ToolRegistry };