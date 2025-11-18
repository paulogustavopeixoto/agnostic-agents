// src/agent/MissingInfoResolver.js
const { ToolValidator } = require('../utils/ToolValidator');

class MissingInfoResolver {
  constructor({ memory = null, rag = null, askUser = null, tools = [] }) {
    this.validator = new ToolValidator();
    this.memory = memory;
    this.rag = rag;
    this.askUser = askUser;
    this.tools = tools; // 🆕 Full list of tools available to the agent
    this.maxCycles = 3;
  }

  /**
   * Main resolve function
   * @param {Tool} tool 
   * @param {object} args 
   * @returns {Promise<object>}
   */
  async resolve(tool, args = {}) {
    const spec = tool.spec || null;

    if (!spec) {
      console.warn(`[Resolver] Tool "${tool.name}" has no spec defined.`);
      throw new Error(`🚫 Tool "${tool.name}" has no spec defined.`);
    }

    let currentArgs = { ...args };

    // Apply aliases
    this._applyAliases(currentArgs, spec);

    // Apply defaults
    this._applyDefaults(currentArgs, tool);

    let cycles = 0;

    while (cycles < this.maxCycles) {
      cycles++;

      const validation = this.validator.validate(tool, currentArgs);
      console.log(`[Resolver] Validation result for "${tool.name}":`, validation);

      if (validation.valid) {
        console.log(`[Resolver] ✅ All required arguments for "${tool.name}" are resolved.`);
        return currentArgs;
      }

      for (const missingField of validation.missingFields) {
        const resolved = await this._resolveField(missingField, currentArgs);
        if (!resolved) {
          throw new Error(`❌ Missing required field "${missingField}" for tool "${tool.name}".`);
        }
      }
    }

    throw new Error(`⚠️ Resolver exceeded max attempts (${this.maxCycles}) for "${tool.name}".`);
  }

  /**
   * Resolve a single missing field
   */
  async _resolveField(field, currentArgs) {
    // Check Memory
    const fromMemory = await this.memory?.get(field);
    if (fromMemory) {
      console.log(`[Resolver] Found "${field}" in memory: ${fromMemory}`);
      currentArgs[field] = fromMemory;
      return true;
    }

    // Check RAG
    if (this.rag) {
      const fromRag = await this.rag.query(field);
      if (fromRag) {
        console.log(`[Resolver] Found "${field}" in RAG: ${fromRag}`);
        currentArgs[field] = fromRag;
        return true;
      }
    }

    // Check Other Tools 🆕
    const producingTool = this.findToolThatProduces(field);

    if (producingTool) {
      console.log(`[Resolver] Found tool "${producingTool.name}" that produces "${field}". Running it...`);

      const subArgs = await this.resolve(producingTool, {}); // Recursively resolve inputs for sub tool

      const result = await producingTool.call(subArgs);

      if (result && result[field] !== undefined) {
        console.log(`[Resolver] ✅ "${field}" obtained from tool "${producingTool.name}": ${result[field]}`);
        currentArgs[field] = result[field];
        this.memory?.set(field, result[field]);
        return true;
      } else {
        console.warn(`[Resolver] ⚠️ Tool "${producingTool.name}" did not return "${field}".`);
      }
    }

    // Ask the user
    if (this.askUser) {
      const prompt = this.generateGenericPrompt(field);
      const userInput = await this.askUser(field, null, prompt);

      if (userInput) {
        console.log(`[Resolver] ✅ Got "${field}" from user: ${userInput}`);
        currentArgs[field] = userInput;
        this.memory?.set(field, userInput);
        return true;
      }
    }

    console.warn(`[Resolver] ❌ Could not resolve "${field}".`);
    return false;
  }

  /**
   * Find a tool that produces the requested field
   */
  findToolThatProduces(field) {
    return this.tools.find(t => 
      t.outputs && Object.keys(t.outputs).includes(field)
    );
  }

  /**
   * Apply aliases from spec to args
   */
  _applyAliases(args, spec) {
    const aliases = spec?.getAliases() || {};
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        if (args[alias] !== undefined && args[canonical] === undefined) {
          args[canonical] = args[alias];
          console.log(`[Resolver] Applied alias: ${alias} → ${canonical}`);
        }
      }
    }
  }

  /**
   * Apply default values from tool schema
   */
  _applyDefaults(args, tool) {
    if (tool.action?.props) {
      for (const [key, schema] of Object.entries(tool.action.props)) {
        if (schema?.default !== undefined && args[key] === undefined) {
          args[key] = schema.default;
          console.log(`[Resolver] Applied default for "${key}":`, schema.default);
        }
      }
    }
  }

  /**
   * Default prompt generator
   */
  generateGenericPrompt(field) {
    return `I need "${field}" to proceed. Please provide it.`;
  }
}

module.exports = { MissingInfoResolver };