// src/agent/Tool.js

/**
 * A generic "Tool" definition that can be mapped to provider-specific function calling.
 * This structure is somewhat universal but should be adapted for each provider's function calling format.
 */
class Tool {
    /**
     * @param {string} name - Unique identifier for the tool (function name).
     * @param {string} description - Brief description (function "description" for OpenAI/Gemini).
     * @param {object} parameters - JSON schema for the function parameters.
     * @param {Function} implementation - The actual function to run when the LLM requests this tool call.
     * @param {boolean} [strict=true] - Whether to enforce strict parameter validation (provider-dependent).
     */
    constructor({ 
      name, 
      description, 
      parameters, 
      implementation, 
      strict = true 
    }) {
      this.name = name;
      this.description = description;
      this.parameters = parameters;
      this.implementation = implementation;
      this.strict = strict;
    }
  
    /**
     * Call this tool's implementation with the parsed arguments.
     * @param {object} args - The parsed arguments from the LLM's function call.
     * @returns {Promise<any>}
     */
    async call(args) {
      return await this.implementation(args);
    }
  
    /**
     * Convert this tool’s definition to OpenAI’s function schema
     * (or any other provider’s function calling schema).
     * Providers can interpret `strict` or other fields as needed.
     */
    toOpenAIFunction() {
      return {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
        // "strict" is an OpenAI 2023-06 function-calling feature.
        // If needed, you can handle it like:
        // "strict": this.strict
      };
    }
  
    /**
     * Convert this tool’s definition to Gemini-style function declaration.
     * This is just conceptual. You’d adapt it to match Google Generative AI’s format.
     */
    toGeminiFunctionDeclaration() {
      return {
        name: this.name,
        parameters: {
          ...this.parameters,
        },
        // Gemini might ignore or handle `description` differently
      };
    }

    /**
     * Return a tool definition in Anthropic's expected format for "beta" function calling.
     */
    toAnthropicTool() {
      return {
        name: this.name,
        description: this.description,
        // Anthropic expects an `input_schema` with JSON schema
        input_schema: {
          ...this.parameters,
        },
        // Possibly add more fields if needed:
        // input_schema: {
        //   type: 'object',
        //   properties: { ... },
        //   required: [...]
        // },
        // strict: this.strict, etc.
      };
    }
}

module.exports = { Tool };