// src/orchestrator/Task.js
const { Agent } = require("../agent/Agent");
const { RAG } = require("../rag/RAG");

class Task {
  /**
   * @param {object} options
   * @param {string} options.description - A clear statement of the task
   * @param {string} [options.name] - Optional unique identifier
   * @param {Agent} [options.agent] - The agent to perform this task
   * @param {Tool[]} [options.tools] - Tools used just for this task (overrides agent.tools)
   * @param {Function} [options.guardrail] - A validation/transform function for the output
   * @param {any} [options.input] - Input data for this task (from prior tasks or external)
   * @param {string} [options.expectedOutput] - A short statement describing desired output
   * @param {string[]} [options.dependsOn=[]] - Names of tasks this task depends on
   * @param {RAG} [options.rag] - Optional RAG instance for retrieval-augmented context
   * @param {number} [options.timeout] - Optional timeout in milliseconds
   * @param {number} [options.retries] - Optional number of retries
   */
  constructor({
    description,
    name,
    agent,
    tools,
    guardrail,
    input,
    expectedOutput,
    dependsOn = [],
    rag = null,
    timeout,
    retries,
  }) {
    this.name = name || "untitledTask";
    this.description = description;
    this.agent = agent;
    this.tools = tools || [];
    this.guardrail = guardrail;
    this.input = input;
    this.expectedOutput = expectedOutput;
    this.dependsOn = dependsOn;
    this.rag = rag; // New: RAG instance for task context
    this.timeout = timeout;
    this.retries = retries;
    this.status = "PENDING";
  }

  /**
   * Run this task, ensuring dependencies are met if context is provided.
   * @param {object} [context] - Optional context object mapping task names to outputs
   * @returns {Promise<any>} - Task output (string or object)
   */
  async run(context = {}) {
    try {
      this.status = "RUNNING";
      if (!this.agent) throw new Error(`No agent assigned for Task "${this.name}"`);

      if (this.dependsOn.length > 0) {
        for (const depName of this.dependsOn) {
          if (!(depName in context)) {
            throw new Error(`Dependency "${depName}" not found in context for Task "${this.name}"`);
          }
        }
      }

      const originalTools = this.agent.tools;
      if (this.tools.length > 0) this.agent.tools = this.tools;

      const userPrompt = await this._buildPrompt(context);
      const response = await this.agent.sendMessage(userPrompt, { useRag: !!this.rag }); // Pass RAG usage to agent

      this.agent.tools = originalTools;

      let finalOutput = response;
      if (this.guardrail) {
        const [ok, validatedOrError] = await this.guardrail(finalOutput);
        if (!ok) throw new Error(`Task "${this.name}" guardrail failed: ${JSON.stringify(validatedOrError)}`);
        finalOutput = validatedOrError;
      }

      this.output = finalOutput;
      this.status = "DONE";
      return finalOutput;
    } catch (error) {
      this.status = "ERROR";
      console.error(`Task "${this.name}" failed:`, error.message);
      throw error;
    }
  }

  /**
   * Build a user prompt incorporating task description, input, dependency outputs, and RAG context.
   * @param {object} context - Context object mapping task names to outputs
   * @returns {Promise<string>} - The constructed prompt
   */
  async _buildPrompt(context = {}) {
    let basePrompt = `You are assigned the following task:\n${this.description}\n`;

    if (this.rag) {
      const ragContext = await this.rag.query(this.description); // Retrieve task-specific context
      basePrompt += `Retrieved Context:\n${ragContext}\n`;
    }

    if (this.dependsOn.length > 0) {
      basePrompt += "Dependencies:\n";
      for (const depName of this.dependsOn) {
        if (depName in context) {
          basePrompt += `${depName}: ${JSON.stringify(context[depName], null, 2)}\n`;
        }
      }
    }

    if (this.input) {
      basePrompt += `Additional Input/Context:\n${JSON.stringify(this.input, null, 2)}\n`;
    }

    if (this.expectedOutput) {
      basePrompt += `Expected Output: ${this.expectedOutput}\n`;
    }

    return basePrompt;
  }
}

module.exports = { Task };