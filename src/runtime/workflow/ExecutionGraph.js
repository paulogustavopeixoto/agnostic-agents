class ExecutionGraph {
  constructor({ nodes = [], edges = [] } = {}) {
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  static fromWorkflow(workflow) {
    const nodes = workflow.steps.map(step => ({
      id: step.id,
      type: 'workflow_step',
      dependsOn: [...step.dependsOn],
      metadata: { ...step.metadata },
    }));
    const edges = workflow.steps.flatMap(step =>
      step.dependsOn.map(dependency => ({
        from: dependency,
        to: step.id,
        type: 'depends_on',
      }))
    );

    return new ExecutionGraph({ nodes, edges });
  }

  getReadyNodes(completed = []) {
    const completedSet = new Set(completed);
    return this.nodes.filter(
      node =>
        !completedSet.has(node.id) &&
        (node.dependsOn || []).every(dependency => completedSet.has(dependency))
    );
  }
}

module.exports = { ExecutionGraph };
