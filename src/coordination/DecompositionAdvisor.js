/**
 * Recommends whether a task should be handled directly, delegated, split into
 * subtasks, or escalated before execution.
 */
class DecompositionAdvisor {
  /**
   * @param {object} [options]
   * @param {number} [options.delegateComplexityThreshold]
   * @param {number} [options.splitComplexityThreshold]
   * @param {number} [options.escalateRiskThreshold]
   */
  constructor({
    delegateComplexityThreshold = 0.55,
    splitComplexityThreshold = 0.8,
    escalateRiskThreshold = 0.85,
  } = {}) {
    this.delegateComplexityThreshold = delegateComplexityThreshold;
    this.splitComplexityThreshold = splitComplexityThreshold;
    this.escalateRiskThreshold = escalateRiskThreshold;
  }

  /**
   * Recommend a decomposition strategy.
   *
   * @param {object} task
   * @param {object} [options]
   * @param {Array<object>} [options.availableDelegates]
   * @returns {object}
   */
  recommend(task = {}, { availableDelegates = [] } = {}) {
    const normalizedTask = this._normalizeTask(task);
    const delegates = Array.isArray(availableDelegates) ? availableDelegates : [];
    const rankedDelegates = this.rankDelegates(normalizedTask, delegates);
    const hasSubtasks = normalizedTask.suggestedSubtasks.length > 0;
    const bestDelegate = rankedDelegates[0] || null;

    let action = 'direct_execute';
    let reason = 'Task is straightforward enough to execute directly.';

    if (normalizedTask.risk >= this.escalateRiskThreshold) {
      action = 'escalate';
      reason = 'Task risk exceeds the escalation threshold.';
    } else if (
      normalizedTask.complexity >= this.splitComplexityThreshold &&
      hasSubtasks
    ) {
      action = 'split_and_delegate';
      reason = 'Task complexity suggests splitting into subtasks before execution.';
    } else if (
      normalizedTask.complexity >= this.delegateComplexityThreshold &&
      bestDelegate &&
      bestDelegate.score > 0
    ) {
      action = 'delegate';
      reason = `Task complexity and capability fit suggest delegating to "${bestDelegate.id}".`;
    }

    return {
      action,
      reason,
      task: normalizedTask,
      rankedDelegates,
      suggestedPlan:
        action === 'split_and_delegate'
          ? normalizedTask.suggestedSubtasks.map((subtask, index) => ({
              id: `${normalizedTask.id || 'task'}:subtask:${index + 1}`,
              task: subtask.task,
              requiredCapabilities: [...subtask.requiredCapabilities],
              delegate: this.rankDelegates(
                {
                  ...normalizedTask,
                  requiredCapabilities: [...subtask.requiredCapabilities],
                  taskType: subtask.taskType || normalizedTask.taskType,
                },
                delegates
              )[0] || null,
            }))
          : [],
    };
  }

  /**
   * Rank delegates for a task.
   *
   * @param {object} task
   * @param {Array<object>} delegates
   * @returns {Array<object>}
   */
  rankDelegates(task = {}, delegates = []) {
    const normalizedTask = this._normalizeTask(task);
    return [...delegates]
      .map(delegate => {
        const capabilities = Array.isArray(delegate.capabilities) ? delegate.capabilities : [];
        const specialization = Array.isArray(delegate.specializations) ? delegate.specializations : [];
        const capabilityMatches = normalizedTask.requiredCapabilities.filter(capability =>
          capabilities.includes(capability)
        ).length;
        const capabilityScore = normalizedTask.requiredCapabilities.length
          ? capabilityMatches / normalizedTask.requiredCapabilities.length
          : 0.5;
        const specializationScore =
          normalizedTask.taskType && specialization.includes(normalizedTask.taskType) ? 1 : 0.5;
        const trustScore = typeof delegate.trustScore === 'number' ? delegate.trustScore : 0.5;
        const score = Number((capabilityScore * 0.45 + specializationScore * 0.2 + trustScore * 0.35).toFixed(3));

        return {
          id: delegate.id || 'unknown_delegate',
          score,
          capabilityMatches,
          requiredCapabilities: [...normalizedTask.requiredCapabilities],
          metadata: delegate.metadata || {},
        };
      })
      .sort((left, right) => right.score - left.score);
  }

  _normalizeTask(task = {}) {
    return {
      id: task.id || null,
      task: task.task || task.description || '',
      taskType: task.taskType || null,
      complexity: this._bound(task.complexity, 0.4),
      risk: this._bound(task.risk, 0.2),
      requiredCapabilities: Array.isArray(task.requiredCapabilities) ? [...task.requiredCapabilities] : [],
      suggestedSubtasks: Array.isArray(task.suggestedSubtasks) ? [...task.suggestedSubtasks] : [],
      metadata: task.metadata || {},
    };
  }

  _bound(value, fallback) {
    if (typeof value !== 'number') {
      return fallback;
    }
    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
  }
}

module.exports = { DecompositionAdvisor };
