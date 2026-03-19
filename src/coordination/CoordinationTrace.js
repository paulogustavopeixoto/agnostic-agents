class CoordinationTrace {
  static fromPlan(plan = {}, { task = {}, context = {} } = {}) {
    const assignments = Array.isArray(plan.assignments) ? plan.assignments : [];
    return {
      traceType: 'role_aware_coordination',
      generatedAt: new Date().toISOString(),
      task: {
        id: task.id || context.taskId || null,
        taskType: task.taskType || context.taskType || null,
        risk: task.risk ?? null,
        complexity: task.complexity ?? null,
      },
      strategy: plan.strategy || null,
      summary: plan.summary || {},
      assignments: assignments.map(assignment => ({
        role: assignment.role,
        actorId: assignment.actor?.id || null,
        trustScore: assignment.trustScore ?? null,
        domain: assignment.domain || null,
        reasons: [...(assignment.reasons || [])],
      })),
      decomposition: plan.decomposition || null,
      gaps: [...(plan.gaps || [])],
      metadata: {
        ...(context.metadata || {}),
      },
    };
  }

  static render(trace = {}) {
    const assignments = Array.isArray(trace.assignments) ? trace.assignments : [];
    const lines = [
      `Coordination trace for ${trace.task?.id || 'task'} (${trace.strategy || 'unknown_strategy'})`,
    ];

    for (const assignment of assignments) {
      lines.push(
        `- ${assignment.role}: ${assignment.actorId || 'unassigned'} ` +
          `(trust=${assignment.trustScore ?? 'n/a'}, domain=${assignment.domain || 'general'})`
      );
    }

    if (Array.isArray(trace.gaps) && trace.gaps.length) {
      lines.push(`Gaps: ${trace.gaps.join(', ')}`);
    }

    return lines.join('\n');
  }
}

module.exports = { CoordinationTrace };
