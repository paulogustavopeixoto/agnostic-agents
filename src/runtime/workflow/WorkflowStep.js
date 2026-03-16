class WorkflowStep {
  constructor({
    id,
    name = null,
    description = '',
    dependsOn = [],
    run,
    metadata = {},
  }) {
    if (!id) {
      throw new Error('WorkflowStep requires an id.');
    }

    if (typeof run !== 'function') {
      throw new Error(`WorkflowStep "${id}" requires a run function.`);
    }

    this.id = id;
    this.name = name || id;
    this.description = description;
    this.dependsOn = [...dependsOn];
    this.run = run;
    this.metadata = { ...metadata };
  }
}

module.exports = { WorkflowStep };
