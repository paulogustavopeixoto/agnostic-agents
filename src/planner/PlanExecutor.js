// src/planner/PlanExecutor.js
const { Agent } = require('../agent/Agent');

class PlanExecutor {
  constructor({ adapter, toolRegistry, memory = null, askUser = null, baseAgentConfig = {} }) {
    this.adapter = adapter;
    this.toolRegistry = toolRegistry;
    this.memory = memory;
    this.askUser = askUser;
    this.baseAgentConfig = baseAgentConfig;
  }

  async executePlan(planSteps, userPrompt) {
    // Initialize shared context for the plan execution
    let context = {};
    const results = [];

    for (const step of planSteps) {
      console.log(`🚀 Executing Step: ${step.name}`);
      const stepPrompt = `Step: ${step.name}\n${step.description}\nPrevious context: ${JSON.stringify(context)}\nProceed with this step.`;

      const tools = this.toolRegistry.getToolsByNames(step.tools);

      const agent = new Agent(this.adapter, {
        tools,
        memory: this.memory,
        askUser: this.askUser,
        description: `You are executing the following step: ${step.description}`,
        ...this.baseAgentConfig,
      });

      const response = await agent.sendMessage(stepPrompt);

      // Try to extract structured data from result
      let parsedOutput = response;
      if (typeof response === 'string') {
        try {
          parsedOutput = JSON.parse(response);
        } catch {
          // It's just text, leave as-is
        }
      }

      // Merge into context if result is an object
      if (parsedOutput && typeof parsedOutput === 'object') {
        context = { ...context, ...parsedOutput };
      }
      console.log(`parsedOutput ${step}: `, parsedOutput);

      results.push({
        step: step.name,
        output: response,
      });
    }

    return results;
  }
}

module.exports = { PlanExecutor };