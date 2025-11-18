// src/tools/adapters/ToolRegistry.js

/**
 * ToolRegistry
 * 
 * A dynamic registry for managing Tool instances.
 * Supports registering, searching, filtering, and exporting tool metadata.
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.triggers = new Map();
  }

  register({ tools = [], triggers = {} }) {
    // Register tools
    for (const tool of tools) {
      if (!tool?.name) {
        console.warn('[ToolRegistry] Tool missing name, skipping:', tool);
        continue;
      }
      this.tools.set(tool.name, tool);
    }

    // Register triggers
    for (const [name, trigger] of Object.entries(triggers)) {
      if (!name) {
        console.warn('[ToolRegistry] Trigger missing name, skipping:', trigger);
        continue;
      }
      this.triggers.set(name, trigger);
    }
  }

  findToolByName(name) {
    return this.tools.get(name);
  }

  findTriggerByName(name) {
    return this.triggers.get(name);
  }

  listTools() {
    return Array.from(this.tools.values());
  }

  listTriggers() {
    return Array.from(this.triggers.entries()).map(([name, trig]) => ({
      name,
      ...trig
    }));
  }

 toMetadata() {
    return this.listTools().map(tool => tool.toUnifiedSchema());
  }

  getToolsByNames(names = []) {
    return this.listTools().filter(tool => names.includes(tool.name));
  }
}

module.exports = { ToolRegistry };