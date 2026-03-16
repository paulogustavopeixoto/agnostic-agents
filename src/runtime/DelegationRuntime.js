const { EventBus } = require('./EventBus');
const { DelegationContract } = require('./workflow/DelegationContract');

class DelegationRuntime {
  constructor({ eventBus = null, onEvent = null } = {}) {
    this.eventBus = eventBus instanceof EventBus ? eventBus : new EventBus(eventBus || {});
    this.onEvent = onEvent;
  }

  async _emit(parentRun, type, payload = {}) {
    const event = {
      id: `${parentRun.id}:${parentRun.events.length + 1}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    parentRun.addEvent(event);

    if (typeof this.onEvent === 'function') {
      await this.onEvent(event, parentRun);
    }

    await this.eventBus.emit(event, parentRun);
    return event;
  }

  async delegate({
    parentRun,
    agent,
    prompt,
    contract = null,
    metadata = {},
    state = {},
    config = {},
  } = {}) {
    if (!parentRun) {
      throw new Error('DelegationRuntime requires a parentRun.');
    }
    if (!agent || typeof agent.run !== 'function') {
      throw new Error('DelegationRuntime requires an agent with a run(...) method.');
    }

    const resolvedContract =
      contract instanceof DelegationContract
        ? contract
        : contract
          ? new DelegationContract(contract)
          : null;

    if (resolvedContract) {
      resolvedContract.validateCapabilities(agent);
      resolvedContract.validateInput({
        prompt,
        input: parentRun.input,
        state: parentRun.state,
        metadata,
      });
    }

    await this._emit(parentRun, 'delegation_runtime_started', {
      assignee: resolvedContract?.assignee || metadata.assignee || null,
      prompt,
      contract: resolvedContract?.toJSON() || null,
    });

    const childRun = await agent.run(prompt, {
      ...config,
      metadata: {
        ...(config.metadata || {}),
        ...metadata,
        lineage: {
          rootRunId: parentRun.metadata?.lineage?.rootRunId || parentRun.id,
          parentRunId: parentRun.id,
        },
      },
      state: {
        ...(config.state || {}),
        ...state,
        delegatedByRunId: parentRun.id,
        delegationContractId: resolvedContract?.id || null,
      },
    });

    if (resolvedContract) {
      resolvedContract.validateOutput({
        childRun,
        output: childRun.output,
        status: childRun.status,
      });
    }

    parentRun.registerChildRun(childRun.id);
    if (typeof parentRun.aggregateChildRun === 'function') {
      parentRun.aggregateChildRun(childRun, {
        scope: 'delegation_runtime',
        assignee: resolvedContract?.assignee || metadata.assignee || null,
        contractId: resolvedContract?.id || null,
      });
    }

    await this._emit(parentRun, 'delegation_runtime_completed', {
      assignee: resolvedContract?.assignee || metadata.assignee || null,
      agentRunId: childRun.id,
      status: childRun.status,
      contractId: resolvedContract?.id || null,
    });

    return {
      childRun,
      contract: resolvedContract,
    };
  }
}

module.exports = { DelegationRuntime };
