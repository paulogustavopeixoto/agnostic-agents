// src/orchestrator/Team.js
const { Task } = require("./Task");

class Team {
  /**
   * @param {object} options
   * @param {Task[]} options.tasks - The tasks that this team will execute.
   * @param {Array}  options.agents - The agents part of this team (optional, you can also embed them in tasks).
   * @param {string} [options.process="sequential"] - Another place to specify how tasks are run.
   * @param {boolean} [options.verbose=false] - If true, log output as we go.
   */
  constructor({ tasks, agents = [], process = "sequential", verbose = false }) {
    this.tasks = tasks || [];
    this.agents = agents;
    this.process = process;
    this.verbose = verbose;

    // This could store results from all tasks
    this.results = [];
  }

  /**
   * Execute all tasks according to the chosen process.
   */
  async kickoff(inputs = {}) {
    // You can store an overarching "CrewOutput"-like object
    this.results = [];

    switch (this.process) {
      case "sequential":
        return await this._runSequential(inputs);

      case "hierarchical":
        return await this._runHierarchical(inputs);

      default:
        throw new Error(`Unknown process type "${this.process}"`);
    }
  }

  /**
   * A simple sequential runner.  
   * Pass `inputs` around if you want each task to get updated context.
   */
  async _runSequential(inputs) {
    let context = inputs;

    for (const task of this.tasks) {
      if (this.verbose) {
        console.log(`Running task: ${task.name}`);
      }

      // If this task depends on prior output:
      task.input = context; // or merge it into the prompt

      // Run the task
      const output = await task.run();

      // Save result
      this.results.push({ taskName: task.name, output });

      // Update context for the next task
      // Maybe you only pass certain bits of data. Or just pass the entire `output`.
      context = { ...context, [task.name]: output };
    }

    return this._assembleFinalOutput();
  }

  /**
   * Hierarchical approach: Suppose you have a “managerAgent”
   * that decides which task goes next. This is just a stub.
   */
  async _runHierarchical(inputs) {
    // Example approach: have a “managerAgent” in `this.agents`
    // that decides tasks order or validation. You can get fancy here.
    throw new Error("Hierarchical process not implemented in this stub.");
  }

  /**
   * Combine or format final output. You can replicate CrewAI’s “CrewOutput”.
   */
  _assembleFinalOutput() {
    // For now, just return the last task’s output plus an array of all.
    const finalOutput = this.results[this.results.length - 1]?.output || "";
    return {
      raw: finalOutput,
      tasksOutput: this.results,
    };
  }
}

module.exports = { Team };