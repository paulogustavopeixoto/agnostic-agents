const { WorkflowStep } = require('./WorkflowStep');

class Workflow {
  constructor({ id, name = null, description = '', steps = [], metadata = {} }) {
    if (!id) {
      throw new Error('Workflow requires an id.');
    }

    this.id = id;
    this.name = name || id;
    this.description = description;
    this.steps = steps.map(step => (step instanceof WorkflowStep ? step : new WorkflowStep(step)));
    this.metadata = { ...metadata };

    this._validate();
  }

  _validate() {
    const stepIds = new Set();

    for (const step of this.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Workflow "${this.id}" has a duplicate step id: "${step.id}".`);
      }

      stepIds.add(step.id);
    }

    for (const step of this.steps) {
      for (const dependency of step.dependsOn) {
        if (!stepIds.has(dependency)) {
          throw new Error(
            `Workflow "${this.id}" step "${step.id}" depends on unknown step "${dependency}".`
          );
        }
      }
    }
  }

  getStep(stepId) {
    return this.steps.find(step => step.id === stepId) || null;
  }
}

module.exports = { Workflow };
