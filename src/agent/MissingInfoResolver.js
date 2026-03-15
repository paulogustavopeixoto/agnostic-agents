const { ToolValidator } = require('../utils/ToolValidator');
const { ToolExecutionError } = require('../errors');

class MissingInfoResolver {
  constructor({ memory = null, rag = null, askUser = null, tools = [] } = {}) {
    this.validator = new ToolValidator();
    this.memory = memory;
    this.rag = rag;
    this.askUser = askUser;
    this.tools = tools;
    this.maxCycles = 3;
  }

  async resolve(tool, args = {}) {
    const schema = tool?.parameters || { type: 'object', properties: {} };
    let currentArgs = this._applyDefaults(args, schema);
    let cycles = 0;

    while (cycles < this.maxCycles) {
      cycles += 1;

      const validation = this.validator.validate(tool, currentArgs);
      if (validation.valid) {
        return currentArgs;
      }

      let progress = false;
      for (const missingField of validation.missingFields) {
        const resolved = await this._resolveField(missingField, currentArgs, tool);
        progress = progress || resolved;
      }

      currentArgs = this._applyDefaults(currentArgs, schema);

      if (!progress) {
        break;
      }
    }

    const finalValidation = this.validator.validate(tool, currentArgs);
    if (!finalValidation.valid) {
      const missing = finalValidation.missingFields.join(', ');
      throw new ToolExecutionError(`Missing required field(s) for tool "${tool.name}": ${missing}`);
    }

    return currentArgs;
  }

  async _resolveField(field, currentArgs, tool) {
    const fromMemory = await this.memory?.get?.(field);
    if (fromMemory !== undefined && fromMemory !== null && fromMemory !== '') {
      currentArgs[field] = fromMemory;
      return true;
    }

    if (this.rag?.query) {
      try {
        const fromRag = await this.rag.query(`Provide a value for "${field}" needed by tool "${tool.name}".`, {
          useTools: false,
        });

        if (typeof fromRag === 'string' && fromRag.trim()) {
          currentArgs[field] = fromRag.trim();
          return true;
        }
      } catch (error) {
        // Ignore retrieval failures and continue to the next resolution strategy.
      }
    }

    if (this.askUser) {
      const prompt = this.generateGenericPrompt(field, tool);
      const userInput = await this.askUser(field, tool, prompt);

      if (userInput !== undefined && userInput !== null && userInput !== '') {
        currentArgs[field] = userInput;

        if (typeof this.memory?.set === 'function') {
          await this.memory.set(field, userInput);
        }

        return true;
      }
    }

    return false;
  }

  _applyDefaults(args, schema) {
    const nextArgs = { ...args };
    const properties = schema?.properties || {};

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (nextArgs[key] === undefined && propertySchema?.default !== undefined) {
        nextArgs[key] = propertySchema.default;
      }
    }

    return nextArgs;
  }

  generateGenericPrompt(field, tool) {
    return `I need "${field}" to run "${tool.name}". Please provide it.`;
  }
}

module.exports = { MissingInfoResolver };
