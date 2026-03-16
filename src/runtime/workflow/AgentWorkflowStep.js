const { WorkflowStep } = require('./WorkflowStep');
const { DelegationContract } = require('./DelegationContract');
const { DelegationRuntime } = require('../DelegationRuntime');

class AgentWorkflowStep extends WorkflowStep {
  constructor({
    id,
    name = null,
    description = '',
    dependsOn = [],
    agent,
    prompt,
    config = {},
    resultSelector = null,
    assignee = null,
    handoff = null,
    delegationContract = null,
    delegationRuntime = null,
    metadata = {},
  }) {
    if (!agent) {
      throw new Error(`AgentWorkflowStep "${id}" requires an agent.`);
    }

    const resolvedMetadata = {
      ...metadata,
      assignee: assignee || metadata.assignee || null,
      handoff: handoff || metadata.handoff || null,
    };
    const contract =
      delegationContract instanceof DelegationContract
        ? delegationContract
        : delegationContract
          ? new DelegationContract(delegationContract)
          : null;
    const runtime =
      delegationRuntime instanceof DelegationRuntime
        ? delegationRuntime
        : delegationRuntime
          ? new DelegationRuntime(delegationRuntime)
          : null;

    super({
      id,
      name,
      description,
      dependsOn,
      metadata: resolvedMetadata,
      run: async stepContext => {
        const resolvedPrompt =
          typeof prompt === 'function'
            ? await prompt(stepContext)
            : prompt || description || id;

        if (!resolvedPrompt) {
          throw new Error(`AgentWorkflowStep "${id}" resolved an empty prompt.`);
        }

        if (contract) {
          contract.validateCapabilities(agent);
          contract.validateInput({
            input: stepContext.input,
            prompt: resolvedPrompt,
            dependencyResults: stepContext.dependencyResults,
            results: stepContext.results,
            stepId: id,
          });
          await stepContext.emitEvent('delegation_requested', {
            contract: contract.toJSON(),
            assignee: contract.assignee || resolvedMetadata.assignee,
          });
        }

        if (resolvedMetadata.handoff) {
          await stepContext.emitEvent('agent_handoff', {
            from: resolvedMetadata.handoff.from || null,
            to: resolvedMetadata.handoff.to || resolvedMetadata.assignee || null,
            reason: resolvedMetadata.handoff.reason || null,
          });
        }

        await stepContext.emitEvent('agent_step_started', {
          agent: resolvedMetadata.assignee,
          prompt: resolvedPrompt,
        });

        const childRun = runtime
          ? (
              await runtime.delegate({
                parentRun: stepContext.run,
                agent,
                prompt: resolvedPrompt,
                contract,
                metadata: {
                  assignee: resolvedMetadata.assignee || null,
                  workflowId: stepContext.workflow.id,
                  stepId: id,
                },
                state: {
                  parentWorkflowId: stepContext.workflow.id,
                  parentWorkflowRunId: stepContext.run.id,
                  parentStepId: id,
                },
                config,
              })
            ).childRun
          : await agent.run(resolvedPrompt, {
              ...config,
              metadata: {
                ...(config.metadata || {}),
                lineage: {
                  rootRunId: stepContext.run.metadata?.lineage?.rootRunId || stepContext.run.id,
                  parentRunId: stepContext.run.id,
                },
              },
              state: {
                parentWorkflowId: stepContext.workflow.id,
                parentWorkflowRunId: stepContext.run.id,
                parentStepId: id,
                ...(config.state || {}),
              },
            });
        if (!runtime) {
          stepContext.run.registerChildRun(childRun.id);
          if (typeof stepContext.run.aggregateChildRun === 'function') {
            stepContext.run.aggregateChildRun(childRun, {
              scope: 'workflow_child',
              workflowId: stepContext.workflow.id,
              stepId: id,
              assignee: resolvedMetadata.assignee || null,
            });
          }
        }

        const selectedResult =
          typeof resultSelector === 'function' ? await resultSelector(childRun, stepContext) : childRun.output;

        if (contract) {
          contract.validateOutput({
            childRun,
            output: selectedResult,
            status: childRun.status,
          });
          await stepContext.emitEvent('delegation_completed', {
            contractId: contract.id,
            assignee: contract.assignee || resolvedMetadata.assignee,
            agentRunId: childRun.id,
            status: childRun.status,
          });
        }

        await stepContext.emitEvent('agent_step_completed', {
          agent: resolvedMetadata.assignee,
          agentRunId: childRun.id,
          output: selectedResult,
        });
        await stepContext.checkpoint('agent_step_completed', {
          agent: resolvedMetadata.assignee,
          agentRunId: childRun.id,
        });

        return {
          agentRunId: childRun.id,
          output: selectedResult,
          status: childRun.status,
          metrics: childRun.metrics,
        };
      },
    });

    this.agent = agent;
    this.prompt = prompt;
    this.config = { ...config };
    this.resultSelector = resultSelector;
    this.delegationContract = contract;
    this.delegationRuntime = runtime;
  }
}

module.exports = { AgentWorkflowStep };
