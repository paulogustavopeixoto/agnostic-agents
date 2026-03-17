const {
  Agent,
  EvalHarness,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
  DelegationRuntime,
  DelegationContract,
  InMemoryRunStore,
} = require('../index');

class WorkerEvalAdapter {
  constructor(label, { toolCalling = false } = {}) {
    this.label = label;
    this.toolCalling = toolCalling;
  }

  getCapabilities() {
    return {
      generateText: true,
      toolCalling: this.toolCalling,
    };
  }

  async generateText(messages) {
    const text = messages.map(message => String(message.content || '')).join('\n').toLowerCase();

    if (text.includes('turn this research into a short update')) {
      return { message: `${this.label} draft: replay, approvals, and traces` };
    }

    if (text.includes('list three runtime capabilities')) {
      return { message: `${this.label} research: replay, approvals, and traces` };
    }

    return { message: `${this.label} response` };
  }
}

async function main() {
  const childRunStore = new InMemoryRunStore();
  const workflowRunStore = new InMemoryRunStore();
  const delegationRuntime = new DelegationRuntime();
  const researcher = new Agent(new WorkerEvalAdapter('researcher'), {
    runStore: childRunStore,
  });
  const writer = new Agent(new WorkerEvalAdapter('writer'), {
    runStore: childRunStore,
  });

  const workflow = new Workflow({
    id: 'worker-coordination-benchmarks',
    steps: [
      new AgentWorkflowStep({
        id: 'research',
        agent: researcher,
        delegationRuntime,
        delegationContract: new DelegationContract({
          id: 'research-contract',
          assignee: 'researcher',
          requiredInputs: ['prompt'],
          requiredCapabilities: ['generateText'],
        }),
        prompt: 'List three runtime capabilities in bullet form.',
      }),
      new AgentWorkflowStep({
        id: 'draft',
        agent: writer,
        dependsOn: ['research'],
        delegationRuntime,
        delegationContract: new DelegationContract({
          id: 'writer-contract',
          assignee: 'writer',
          requiredInputs: ['prompt'],
          requiredCapabilities: ['generateText'],
        }),
        prompt: ({ results }) => `Turn this research into a short update:\n${results.research.output}`,
      }),
    ],
  });

  const gatedWorkflow = new Workflow({
    id: 'worker-coordination-contract-check',
    steps: [
      new AgentWorkflowStep({
        id: 'gated_worker',
        agent: new Agent(new WorkerEvalAdapter('gated-worker', { toolCalling: false }), {
          runStore: childRunStore,
        }),
        delegationContract: new DelegationContract({
          id: 'gated-contract',
          assignee: 'gated-worker',
          requiredInputs: ['prompt'],
          requiredCapabilities: ['toolCalling'],
        }),
        prompt: 'Handle a tool-dependent worker task.',
      }),
    ],
  });

  const harness = new EvalHarness({
    scenarios: [
      {
        id: 'worker-coordination-lineage-benchmark',
        run: async () => new WorkflowRunner({ workflow, runStore: workflowRunStore }).run('Prepare a worker report'),
        assert: run =>
          run.status === 'completed' &&
          run.metrics.childRuns.count === 2 &&
          run.metrics.childRuns.items.length === 2 &&
          run.events.some(event => event.type === 'delegation_completed'),
      },
      {
        id: 'worker-coordination-contract-benchmark',
        run: async () => {
          try {
            await new WorkflowRunner({
              workflow: gatedWorkflow,
              runStore: workflowRunStore,
            }).run('Prepare a gated worker task');
            return null;
          } catch (error) {
            return error.message || String(error);
          }
        },
        assert: message => String(message).includes('requires capability "toolCalling"'),
      },
    ],
  });

  const report = await harness.run();
  console.log('Worker coordination benchmark report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
