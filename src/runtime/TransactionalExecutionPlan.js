class TransactionalExecutionPlan {
  static build(actions = [], {
    defaultEnvironment = null,
    requireVerification = true,
  } = {}) {
    const normalizedActions = actions.map((action, index) => normalizeAction(action, index, defaultEnvironment));
    const steps = [];

    for (const action of normalizedActions) {
      steps.push({
        phase: 'preflight',
        actionId: action.id,
        system: action.system,
        requiresApproval: action.requiresApproval,
        environment: action.environment,
        details: {
          idempotent: action.idempotent,
          sideEffectLevel: action.sideEffectLevel,
        },
      });

      steps.push({
        phase: 'execute',
        actionId: action.id,
        system: action.system,
        operation: action.operation,
        environment: action.environment,
      });

      if (requireVerification) {
        steps.push({
          phase: 'verify',
          actionId: action.id,
          verification: action.verification || 'post_action_check',
          system: action.system,
        });
      }

      if (action.compensation) {
        steps.push({
          phase: 'compensate',
          actionId: action.id,
          compensation: action.compensation,
          system: action.system,
        });
      }
    }

    return {
      kind: 'agnostic-agents/transactional-execution-plan',
      version: '1.0.0',
      steps,
      summary: {
        totalActions: normalizedActions.length,
        approvalRequired: normalizedActions.filter(action => action.requiresApproval).length,
        compensatable: normalizedActions.filter(action => Boolean(action.compensation)).length,
        externalWrites: normalizedActions.filter(action => action.sideEffectLevel === 'external_write').length,
        environments: [...new Set(normalizedActions.map(action => action.environment).filter(Boolean))],
      },
      actions: normalizedActions,
    };
  }
}

function normalizeAction(action, index, defaultEnvironment) {
  return {
    id: action.id || `action_${index + 1}`,
    system: action.system || 'external-system',
    operation: action.operation || 'unknown_operation',
    environment: action.environment || defaultEnvironment,
    requiresApproval: action.requiresApproval === true,
    sideEffectLevel: action.sideEffectLevel || 'external_write',
    idempotent: action.idempotent === true,
    verification: action.verification || null,
    compensation: action.compensation || null,
  };
}

module.exports = { TransactionalExecutionPlan };
