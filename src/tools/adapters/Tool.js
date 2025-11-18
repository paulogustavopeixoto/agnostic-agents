// src/tools/adapters/Tool.js

/**
 * Unified Tool abstraction.
 * This is the canonical representation of a tool inside agnostic-agents.
 */

class Tool {
  constructor({
    name,
    description = "",
    parameters = { type: "object", properties: {} },
    outputSchema = null,
    implementation,
    strict = true,
    metadata = {}
  }) {
    if (!name) throw new Error("Tool must have a name");
    if (typeof implementation !== "function") {
      throw new Error(`Tool "${name}" missing implementation function`);
    }

    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.outputSchema = outputSchema;
    this.implementation = implementation;
    this.strict = strict;

    this.metadata = {
      examples: metadata.examples || [],
      tags: metadata.tags || [],
      version: metadata.version || "1.0.0"
    };
  }

  /**
   * Canonical internal schema used by Agent + Planner + Orchestrator.
   */
  toUnifiedSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      outputSchema: this.outputSchema,
      strict: this.strict,
      metadata: this.metadata
    };
  }

  /**
   * Execute the tool implementation
   */
  async call(args, context = {}) {
    return await this.implementation(args, context);
  }

  /**
   * Provider adapters
   */

  toOpenAIFunction() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  toGeminiFunctionDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  toAnthropicTool() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.parameters
    };
  }
}

module.exports = { Tool };