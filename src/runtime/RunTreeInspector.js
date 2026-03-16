const { Run } = require('./Run');
const { RunInspector } = require('./RunInspector');
const { BaseRunStore } = require('./stores/BaseRunStore');

class RunTreeInspector {
  static async build(runStore, { rootRunId = null } = {}) {
    BaseRunStore.assert(runStore, 'RunTreeInspector runStore');

    const rawRuns = await runStore.listRuns();
    const runs = rawRuns.map(entry => (entry instanceof Run ? entry : Run.fromJSON(entry)));
    const nodes = new Map(
      runs.map(run => [
        run.id,
        {
          id: run.id,
          status: run.status,
          input: run.input,
          lineage: run.metadata?.lineage || null,
          summary: RunInspector.summarize(run),
          subtreeMetrics: null,
          children: [],
        },
      ])
    );

    const roots = [];

    for (const node of nodes.values()) {
      const parentId = node.lineage?.parentRunId || null;
      if (parentId && nodes.has(parentId)) {
        nodes.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNode = node => {
      node.children.sort((left, right) => {
        const leftCreated = left.summary?.checkpoints?.[0]?.id || left.id;
        const rightCreated = right.summary?.checkpoints?.[0]?.id || right.id;
        return leftCreated.localeCompare(rightCreated);
      });
      node.children.forEach(sortNode);
      node.subtreeMetrics = RunTreeInspector._aggregateSubtreeMetrics(node);
      return node;
    };

    roots.forEach(sortNode);

    if (rootRunId) {
      const rootNode = nodes.get(rootRunId);
      return rootNode || null;
    }

    return roots;
  }

  static render(tree, { includeStatus = true } = {}) {
    const roots = Array.isArray(tree) ? tree : tree ? [tree] : [];
    const lines = [];

    const visit = (node, prefix = '', isLast = true, isRoot = false) => {
      const branch = isRoot ? '' : `${prefix}${isLast ? '└─ ' : '├─ '}`;
      const status = includeStatus ? ` [${node.status}]` : '';
      lines.push(`${branch}${node.id}${status}`);

      const nextPrefix = isRoot ? '' : `${prefix}${isLast ? '   ' : '│  '}`;
      node.children.forEach((child, index) => {
        visit(child, nextPrefix, index === node.children.length - 1, false);
      });
    };

    roots.forEach((root, index) => {
      visit(root, '', index === roots.length - 1, true);
    });

    return lines.join('\n');
  }

  static _aggregateSubtreeMetrics(node) {
    const baseMetrics = node.summary?.metrics || {};
    const aggregate = {
      runCount: 1,
      tokenUsage: {
        prompt: baseMetrics.tokenUsage?.prompt || 0,
        completion: baseMetrics.tokenUsage?.completion || 0,
        total: baseMetrics.tokenUsage?.total || 0,
      },
      cost: baseMetrics.cost || 0,
      timings: { ...(baseMetrics.timings || {}) },
    };

    for (const child of node.children) {
      const childAggregate = child.subtreeMetrics || RunTreeInspector._aggregateSubtreeMetrics(child);
      aggregate.runCount += childAggregate.runCount;
      aggregate.tokenUsage.prompt += childAggregate.tokenUsage.prompt || 0;
      aggregate.tokenUsage.completion += childAggregate.tokenUsage.completion || 0;
      aggregate.tokenUsage.total += childAggregate.tokenUsage.total || 0;
      aggregate.cost += childAggregate.cost || 0;

      for (const [key, value] of Object.entries(childAggregate.timings || {})) {
        aggregate.timings[key] = (aggregate.timings[key] || 0) + (value || 0);
      }
    }

    return aggregate;
  }
}

module.exports = { RunTreeInspector };
