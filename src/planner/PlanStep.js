// src/planner/PlanStep.js
class PlanStep {
  constructor({ name, description, tools = [] }) {
    this.name = name;
    this.description = description;
    this.tools = tools;
  }
}

module.exports = { PlanStep };