const { ToolValidator } = require('../utils/ToolValidator');

class MissingInfoResolver {
  constructor({ memory = null, rag = null, askUser = null }) {
    this.validator = new ToolValidator();
    this.memory = memory;
    this.rag = rag;
    this.askUser = askUser;
    this.maxCycles = 5;
  }

  /**
   * Resolves missing arguments for a given tool.
   * @param {Tool} tool 
   * @param {object} args 
   * @returns {Promise<object>} Completed arguments
   */
  async resolve(tool, args = {}) {
    const spec = tool.spec || null;

    if (!spec) {
      console.warn(`[Resolver] Tool "${tool.name}" has no spec defined.`);
      throw new Error(
        `🚫 I'm currently not able to handle the tool "${tool.name}". It might require manual setup or isn't yet fully supported.`
      );
    }

    let currentArgs = { ...args };
    let cycles = 0;

    while (cycles < this.maxCycles) {
      cycles++;
      const validation = this.validator.validate(tool, currentArgs);
      console.log(`[Resolver] Validating tool "${tool.name}" with args:`, currentArgs);
      console.log(`[Resolver] Validation result:`, validation);

      if (validation.valid) {
        console.log(`[Resolver] ✅ All required arguments for "${tool.name}" are resolved.`);
        return currentArgs;
      }

      for (const missingField of validation.missingFields) {
        // First try entity memory
        let value = await this.memory?.get(missingField);
        if (value) {
            console.log(`[Resolver] Found "${missingField}" in memory: ${value}`);
            currentArgs[missingField] = value;
            continue;
        }

        // 📚 2. Try RAG
        if (this.rag) {
          value = await this.rag.query(missingField);
          if (value) {
            console.log(`[Resolver] Found "${missingField}" in RAG: ${value}`);
            currentArgs[missingField] = value;
            continue;
          }
        }

        // 💬 3. Ask the user directly
        if (this.askUser) {
          const prompt = spec?.getPromptForField(missingField) 
                      || this.generateGenericPrompt(tool, missingField);

          while (true) {
            const userInput = await this.askUser(missingField, tool, prompt);
            if (!userInput) break;

            const isValid = spec?.isValidValueForField 
              ? spec.isValidValueForField(missingField, userInput) 
              : true; // ✅ Default to true if no check
            console.log(`[Validation] Field: ${missingField}, Value: ${userInput}, Valid: ${isValid}`);

            if (isValid) {
              currentArgs[missingField] = userInput;
              break;
            } else {
              console.warn(`❌ Invalid input "${userInput}" for field "${missingField}". Please try again.`);
              continue;
            }
          }

          if (currentArgs[missingField]) continue;
        }

        // ❌ 4. Cannot resolve
        console.warn(`[Resolver] Cannot resolve missing field: ${missingField}`);
        throw new Error(`Missing required field "${missingField}" for tool "${tool.name}"`);
      }
    }

    // 🔥 Failsafe triggered
    throw new Error(`⚠️ Resolver exceeded maximum attempts (${this.maxCycles}) for tool "${tool.name}".`);
  }

  /**
   * Generate a helpful prompt for the user, especially for IDs.
   */
  generateGenericPrompt(tool, field) {
    return `I need "${field}" to execute "${tool.name}". Please provide it.`;
  }
}

module.exports = { MissingInfoResolver };