const { ToolValidator } = require('../utils/ToolValidator');

class MissingInfoResolver {
  constructor({ memory = null, rag = null, askUser = null }) {
    this.validator = new ToolValidator();
    this.memory = memory;
    this.rag = rag;
    this.askUser = askUser; // Function (fieldName) => Promise<string>
  }

  /**
   * Resolves missing arguments for a given tool.
   * @param {Tool} tool 
   * @param {object} args 
   * @returns {Promise<object>} Completed arguments
   */
  async resolve(tool, args = {}) {
    let currentArgs = { ...args };

    while (true) {
      const validation = this.validator.validate(tool, currentArgs);

      if (validation.valid) {
        return currentArgs;
      }

      for (const missingField of validation.missingFields) {
        // 1. Try memory
        const fromMemory = this.memory?.get(missingField);
        if (fromMemory) {
          console.log(`[Resolver] Found "${missingField}" in memory: ${fromMemory}`);
          currentArgs[missingField] = fromMemory;
          continue;
        }

        // 2. Try RAG (if available)
        const fromRag = this.rag ? await this.rag.query(missingField) : null;
        if (fromRag) {
          console.log(`[Resolver] Found "${missingField}" in RAG: ${fromRag}`);
          currentArgs[missingField] = fromRag;
          continue;
        }

        // 3. Ask user
        if (this.askUser) {
          const userResponse = await this.askUser(missingField, tool);
          if (userResponse) {
            currentArgs[missingField] = userResponse;
            continue;
          }
        }

        // 4. Cannot resolve
        console.warn(`[Resolver] Cannot resolve missing field: ${missingField}`);
        throw new Error(`Missing required field "${missingField}" for tool "${tool.name}"`);
      }
    }
  }
}

module.exports = { MissingInfoResolver };