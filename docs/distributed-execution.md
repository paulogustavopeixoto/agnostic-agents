# Distributed execution

`v6.1` starts with a simple rule: a run created in one process should be continuable in another process without inventing a second runtime model.

The package now exposes a canonical distributed handoff payload through `DistributedRunEnvelope`.
For cross-service correlation metadata, use `TraceCorrelation`.

## What gets handed off

A distributed handoff envelope carries:

- the runtime kind: `agent` or `workflow`
- the source `runId`
- the continuation action: `resume`, `branch`, or `replay`
- an optional `checkpointId`
- lineage-preserving metadata for the receiving process

The envelope is intentionally small. The durable source of truth remains the configured run store.

## Required persistence before handoff

Before handing a run to another service or worker:

- persist the run in a shared or durable `runStore`
- persist the checkpoint you want to branch or replay from
- persist any approval or pause state that the remote process must honor
- persist any storage-backed context required by tools or workflows

If the receiving process cannot load the same run from storage, the handoff contract is incomplete.

## Agent handoff example

```js
const { Agent, FileRunStore } = require('agnostic-agents');

const runStore = new FileRunStore({ directory: './runtime-runs' });

const processA = new Agent(adapterA, { runStore });
const processB = new Agent(adapterB, { runStore });

const run = await processA.run('Prepare the handoff.');
const envelope = await processA.createDistributedEnvelope(run.id, {
  action: 'replay',
  checkpointId: run.checkpoints[run.checkpoints.length - 1].id,
  metadata: {
    handoffTarget: 'worker-b',
    transport: 'service_call',
  },
});

const remoteRun = await processB.continueDistributedRun(envelope);
```

## Workflow handoff example

```js
const envelope = await workflowRunner.createDistributedEnvelope(run.id, {
  action: 'replay',
  checkpointId,
  metadata: { handoffTarget: 'workflow-worker-b' },
});

const remoteRun = await workflowRunnerOnWorkerB.continueDistributedRun(envelope);
```

## Queue-native continuation example

```js
const envelope = await processA.createDistributedEnvelope(run.id, {
  action: 'replay',
  checkpointId: run.checkpoints[run.checkpoints.length - 1].id,
  metadata: {
    queue: 'runtime-job-queue',
    transport: 'queue',
  },
});

await queue.push({ envelope });
const message = await queue.shift();
const remoteRun = await workerAgent.continueDistributedRun(message.envelope);
```

## Lineage expectations

Distributed continuation should still look like one runtime story in inspection output:

- the original `rootRunId` should remain stable
- `branchOriginRunId` should point back to the source run when branching or partial replay is used
- replay metadata should retain the source run and checkpoint references
- correlation metadata should preserve a stable `traceId` plus per-run `spanId`
- run tree and incident tooling should remain usable after the handoff

## Operator checks when a remote continuation fails

When a distributed continuation fails, inspect:

- whether the target process can load the source run from the shared store
- whether the referenced checkpoint exists
- whether the envelope `runtimeKind` matches the receiving runtime
- whether approval or auth state was expected but not available remotely
- whether lineage and replay metadata still point to the correct source run
- whether correlation metadata still links the source run, queue/service hop, and remote worker

## Maintained reference example

- [`examples/referenceDistributedHandoff.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceDistributedHandoff.js)
- [`examples/referenceQueueWorker.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceQueueWorker.js)
- [`examples/referenceDistributedIncident.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceDistributedIncident.js)
