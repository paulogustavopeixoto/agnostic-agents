// src/orchestrator/Task.js

class Task {
    /**
     * @param {object} options
     * @param {string} options.description   - A clear statement of the task.
     * @param {string} [options.name]        - Optional unique identifier.
     * @param {Agent}  [options.agent]       - The agent to perform this task.
     * @param {Tool[]} [options.tools]       - Tools used just for this task (overrides agent.tools).
     * @param {Function} [options.guardrail] - A validation/transform function for the output.
     * @param {any} [options.input]          - Input data for this task (from prior tasks).
     * @param {string} [options.expectedOutput] - A short statement describing desired output.
     */
    constructor({
      description,
      name,
      agent,
      tools,
      guardrail,
      input,
      expectedOutput,
    }) {
      this.name = name || "untitledTask";
      this.description = description;
      this.agent = agent;
      this.tools = tools || [];
      this.guardrail = guardrail;
      this.input = input;
      this.expectedOutput = expectedOutput;
  
      this.output = null;    // Will hold the final result after execution
      this.status = "PENDING"; // For tracking state: “PENDING” | “RUNNING” | “DONE” | “ERROR”
    }
  
    /**
     * Run this task. Returns the output (string or object).
     */
    async run() {
      try {
        this.status = "RUNNING";
  
        // If the agent is not set, throw or do dynamic assignment
        if (!this.agent) {
          throw new Error(`No agent assigned for Task "${this.name}"`);
        }
  
        // Optionally override the agent’s default tools with this.tasks
        const originalTools = this.agent.tools;
        if (this.tools.length > 0) {
          this.agent.tools = this.tools;
        }
  
        // Construct a "prompt" for the agent
        const userPrompt = this._buildPrompt();
        const response = await this.agent.sendMessage(userPrompt);
  
        // Restore the agent’s tools
        this.agent.tools = originalTools;
  
        // If we have a guardrail
        let finalOutput = response;
        if (this.guardrail) {
          const [ok, validatedOrError] = await this.guardrail(finalOutput);
          if (!ok) {
            // The guardrail failed => handle or ask the agent to revise
            throw new Error(
              `Task "${this.name}" guardrail failed: ${JSON.stringify(validatedOrError)}`
            );
          } else {
            finalOutput = validatedOrError;
          }
        }
  
        this.output = finalOutput;
        this.status = "DONE";
        return finalOutput;
  
      } catch (error) {
        this.status = "ERROR";
        console.error(`Task "${this.name}" failed:`, error);
        throw error;
      }
    }
  
    /**
     * Private helper to build a user prompt using the task description
     * and optional input. Extend as needed.
     */
    _buildPrompt() {
      let basePrompt = `You are assigned the following task:\n${this.description}\n`;
      if (this.input) {
        basePrompt += `Here is some additional input/context:\n${JSON.stringify(this.input, null, 2)}\n`;
      }
      if (this.expectedOutput) {
        basePrompt += `The expected output is: ${this.expectedOutput}\n`;
      }
      return basePrompt;
    }
  }
  
  module.exports = { Task };