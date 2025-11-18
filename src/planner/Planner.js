// src/planner/Planner.js
const { PlanStep } = require('./PlanStep');

class Planner {
  constructor({ adapter, tools = [], description = '', askUser = null }) {
    this.adapter = adapter;
    this.tools = tools;
    this.description = description || 'You are a planner that breaks tasks into steps.';
    this.askUser = askUser;
  }

  async createPlan(userPrompt) {
    const toolList = this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    const prompt = `
        You are a professional task planner.

        Given the following task:

        "${userPrompt}"

        Break it into clear steps. Each step should have:
        - Name
        - Description
        - Tools needed (choose from the tool list below).

        Return only valid JSON array in this exact format:

        [
        {
            "name": "Step Name",
            "description": "What happens in this step",
            "tools": ["tool1", "tool2"]
        }
        ]

        Available tools:
        ${toolList}

        Do not add any other text besides the JSON.
    `;

    const response = await this.adapter.generateText({
      system: this.description,
      context: '',
      user: prompt,
    });

    let steps = [];
    try {
      steps = JSON.parse(response.message || response);
    } catch (e) {
      console.warn('⚠️ Failed to parse JSON. Falling back to single step.');

      steps = [{
        name: 'Task',
        description: userPrompt,
        tools: this.tools.map(t => t.name), // Use ALL tools as fallback
      }];
    }

    return steps.map((step, i) => new PlanStep({
      name: step.name || `Step ${i + 1}`,
      description: step.description,
      tools: step.tools || [],
    }));
  }
}

module.exports = { Planner };