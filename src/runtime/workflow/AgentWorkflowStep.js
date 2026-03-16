const { WorkflowStep } = require('./WorkflowStep');

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

        const childRun = await agent.run(resolvedPrompt, {
          ...config,
          state: {
            parentWorkflowId: stepContext.workflow.id,
            parentWorkflowRunId: stepContext.run.id,
            parentStepId: id,
            ...(config.state || {}),
          },
        });

        const selectedResult =
          typeof resultSelector === 'function' ? await resultSelector(childRun, stepContext) : childRun.output;

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
        };
      },
    });

    this.agent = agent;
    this.prompt = prompt;
    this.config = { ...config };
    this.resultSelector = resultSelector;
  }
}

module.exports = { AgentWorkflowStep };
