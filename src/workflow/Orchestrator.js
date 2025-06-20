// src/orchestrator/Orchestrator.js
const { Agent } = require("../agent/Agent");
const { Task } = require("./Task");
const { RAG } = require("../rag/RAG");

class Orchestrator {
  /**
   * @param {object} options
   * @param {Task[]} options.tasks - Tasks to execute
   * @param {Agent[]} [options.agents=[]] - Optional pool of agents
   * @param {string} [options.process="sequential"] - "sequential", "parallel", "hierarchical"
   * @param {boolean} [options.verbose=false] - Log execution details
   * @param {string} [options.errorPolicy="throw"] - "throw", "skip", "retry" on task failure
   * @param {number} [options.retries=0] - Number of retries for failed tasks
   * @param {RAG} [options.rag] - Optional RAG instance for shared retrieval context
   */
  constructor({ tasks, agents = [], process = "sequential", verbose = false, errorPolicy = "throw", retries = 0, rag = null }) {
    this.tasks = tasks || [];
    this.agents = agents;
    this.process = process;
    this.verbose = verbose;
    this.errorPolicy = errorPolicy;
    this.retries = retries;
    this.rag = rag; // New: Shared RAG instance
    this.results = [];
  }

  /**
   * Execute all tasks according to the chosen process.
   * @param {object} [inputs={}] - Initial context or data for tasks
   * @returns {Promise<object>} - Results with raw final output and task details
   */
  async kickoff(inputs = {}) {
    this.results = [];
    switch (this.process) {
      case "sequential": return await this._runSequential(inputs);
      case "parallel": return await this._runParallel(inputs);
      case "hierarchical": return await this._runHierarchical(inputs);
      default: throw new Error(`Unknown process type "${this.process}"`);
    }
  }

  async _runSequential(inputs) {
    let context = inputs;
    for (const task of this.tasks) {
      if (this.verbose) console.log(`Running task: ${task.name}`);
      if (!task.agent && this.agents.length) task.agent = this.agents[0];
      if (this.rag && !task.rag) task.rag = this.rag; 
      task.input = context;
      let output;
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          output = await task.run(context);
          break;
        } catch (error) {
          if (attempt === this.retries) {
            if (this.errorPolicy === "skip") {
              if (this.verbose) console.log(`Task ${task.name} failed: ${error.message}, skipping...`);
              output = null;
            } else {
              throw error;
            }
          }
        }
      }
      this.results.push({ taskName: task.name, output });
      context = { ...context, [task.name]: output };
    }
    return this._assembleFinalOutput();
  }

  async _runParallel(inputs) {
    if (this.verbose) console.log("Running tasks in parallel with dependencies...");
    const taskMap = new Map(this.tasks.map(t => [t.name, { task: t, executed: false, output: null }]));
    const executed = new Set();

    const executeTask = async (taskEntry) => {
      const { task } = taskEntry;
      if (!task.agent && this.agents.length) task.agent = this.agents[0];
      if (this.rag && !task.rag) task.rag = this.rag; // Inject RAG if not set
      if (task.dependsOn && task.dependsOn.length) {
        await Promise.all(task.dependsOn.map(depName => {
          const dep = taskMap.get(depName);
          if (!dep) throw new Error(`Dependency ${depName} not found for task ${task.name}`);
          if (!dep.executed) return executeTask(dep);
        }));
      }
      task.input = inputs;
      let output;
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          output = await task.run(inputs);
          break;
        } catch (error) {
          if (attempt === this.retries) {
            if (this.errorPolicy === "skip") {
              if (this.verbose) console.log(`Task ${task.name} failed: ${error.message}, skipping...`);
              output = null;
            } else {
              throw error;
            }
          }
        }
      }
      taskEntry.executed = true;
      taskEntry.output = output;
      executed.add(task.name);
      return { taskName: task.name, output };
    };

    this.results = await Promise.all([...taskMap.values()].map(executeTask));
    return this._assembleFinalOutput();
  }

  async _runHierarchical(inputs) {
    if (this.verbose) console.log("Running tasks hierarchically...");
    if (!this.agents.length) throw new Error("Hierarchical mode requires at least one agent.");
    const managerAgent = this.agents[0];
    let context = inputs;

    for (const task of this.tasks) {
      if (!task.agent && this.agents.length > 1) task.agent = this.agents[1];
      if (this.rag && !task.rag) task.rag = this.rag; // Inject RAG if not set
      const decisionPrompt = `Current context: ${JSON.stringify(context)}\nTask: ${task.description}\nShould this task run now? (yes/no)`;
      const decision = await managerAgent.sendMessage(decisionPrompt, { useRag: !!this.rag });
      if (decision.toLowerCase().includes("yes")) {
        if (this.verbose) console.log(`Manager approved task: ${task.name}`);
        task.input = context;
        let output;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
          try {
            output = await task.run(context);
            break;
          } catch (error) {
            if (attempt === this.retries) {
              if (this.errorPolicy === "skip") {
                if (this.verbose) console.log(`Task ${task.name} failed: ${error.message}, skipping...`);
                output = null;
              } else {
                throw error;
              }
            }
          }
        }
        this.results.push({ taskName: task.name, output });
        context = { ...context, [task.name]: output };
      } else {
        if (this.verbose) console.log(`Manager skipped task: ${task.name}`);
      }
    }
    return this._assembleFinalOutput();
  }

  _assembleFinalOutput() {
    const finalOutput = this.results[this.results.length - 1]?.output || "";
    return {
      raw: finalOutput,
      tasksOutput: this.results,
    };
  }
}

module.exports = { Orchestrator };