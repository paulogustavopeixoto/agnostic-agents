const { EvidenceGraph } = require('./EvidenceGraph');

class UnifiedExecutionGraph {
  constructor({ graph = null } = {}) {
    this.graph = graph instanceof EvidenceGraph ? graph : new EvidenceGraph(graph || {});
  }

  build({
    run = null,
    policyDecisions = [],
    memoryAudit = [],
    coordination = null,
    learnedChanges = [],
    fleet = null,
  } = {}) {
    const graph = new EvidenceGraph();
    const rootRunId = run?.id || 'execution-root';

    graph.addNode({
      id: rootRunId,
      type: 'run',
      label: `Run ${rootRunId}`,
      metadata: {
        status: run?.status || null,
      },
    });

    if (Array.isArray(run?.steps)) {
      for (const step of run.steps) {
        graph.addNode({
          id: step.id,
          type: 'runtime_step',
          label: `${step.type || 'step'} ${step.status || 'unknown'}`,
          metadata: {
            status: step.status || null,
          },
        });
        graph.addEdge({
          from: rootRunId,
          to: step.id,
          type: 'contains_step',
        });
      }
    }

    for (const decision of policyDecisions || []) {
      const id = decision.id || `policy:${decision.toolName || decision.action || graph.nodes.length + 1}`;
      graph.addNode({
        id,
        type: 'policy_decision',
        label: `${decision.action || 'policy'} ${decision.toolName || ''}`.trim(),
        metadata: {
          action: decision.action || null,
          toolName: decision.toolName || null,
        },
      });
      graph.addEdge({
        from: rootRunId,
        to: id,
        type: 'policy_for',
      });
    }

    for (const event of memoryAudit || []) {
      const id = event.id || `memory:${event.type || graph.nodes.length + 1}`;
      graph.addNode({
        id,
        type: 'memory_event',
        label: event.type || 'memory_event',
        metadata: {
          key: event.key || null,
          layer: event.layer || null,
        },
      });
      graph.addEdge({
        from: rootRunId,
        to: id,
        type: 'memory_for',
      });
    }

    if (coordination) {
      const id = coordination.id || 'coordination:summary';
      graph.addNode({
        id,
        type: 'coordination',
        label: coordination.action || coordination.recommendedAction || 'coordination',
        metadata: {
          action: coordination.action || coordination.recommendedAction || null,
        },
      });
      graph.addEdge({
        from: rootRunId,
        to: id,
        type: 'coordinated_by',
      });
    }

    for (const change of learnedChanges || []) {
      const id = change.id || `learning:${graph.nodes.length + 1}`;
      graph.addNode({
        id,
        type: 'learned_change',
        label: change.summary || change.action || 'learned_change',
        metadata: {
          action: change.action || null,
        },
      });
      graph.addEdge({
        from: rootRunId,
        to: id,
        type: 'adapted_by',
      });
    }

    if (fleet) {
      const id = fleet.id || 'fleet:summary';
      graph.addNode({
        id,
        type: 'fleet',
        label: fleet.action || 'fleet_state',
        metadata: {
          action: fleet.action || null,
          environment: fleet.environment || null,
        },
      });
      graph.addEdge({
        from: rootRunId,
        to: id,
        type: 'operated_in',
      });
    }

    this.graph = graph;
    return graph;
  }

  summarize() {
    return this.graph.summarize();
  }
}

module.exports = { UnifiedExecutionGraph };
