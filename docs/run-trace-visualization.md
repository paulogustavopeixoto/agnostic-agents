# Run and Trace Visualization

This guide collects the maintained visualization surfaces for runtime inspection.

Use it when you want a CLI view, internal dashboard, or control-plane page that explains:

- how a workflow or delegated run tree is shaped
- where a run diverged from another run
- which checkpoint or failure boundary matters
- what should be exported for offline debugging

## 1. Run tree visualization

Use `RunTreeInspector` to reconstruct lineage from persisted runs.

```js
const tree = await RunTreeInspector.build(runStore, { rootRunId });
const rendered = RunTreeInspector.render(tree);
```

Use it to show:

- root run id
- parent-child relationships
- subtree run counts
- aggregated token, cost, and timing metrics

Best fit:

- workflow overview pages
- delegated agent lineage views
- branch and replay inspection

## 2. Incident visualization

Use `IncidentDebugger` to generate one structured incident report instead of stitching views together manually.

```js
const report = await incidentDebugger.createReport(runId, { compareToRunId });
```

Use it to show:

- failing step
- last checkpoint
- pending approval or pause state
- rendered run tree
- recovery recommendations

Best fit:

- operator incident triage pages
- support/debug attachments
- control-plane incident review

## 3. Trace diff visualization

Use `TraceDiffer` when you need a compact view of how two runs diverged.

```js
const diff = TraceDiffer.diff(leftRun, rightRun);
```

Use it to show:

- status changes
- output changes
- event additions and removals
- first diverging step, event, or tool call

Best fit:

- retry vs original comparison
- branch quality inspection
- release regression analysis

## 4. Portable trace export

Use `TraceSerializer` when the visualization layer should not depend on live runtime instances.

```js
const bundle = TraceSerializer.exportBundle(runs, {
  exportedFor: 'control-plane',
});
```

Use it to:

- power offline dashboards
- attach traces to incident reviews
- preserve a stable schema for external tooling

## Maintained references

- [`examples/referenceOperatorWorkflow.js`](../examples/referenceOperatorWorkflow.js)
- [`examples/referenceIncidentDebug.js`](../examples/referenceIncidentDebug.js)
- [`examples/referencePublicControlPlane.js`](../examples/referencePublicControlPlane.js)

## Design guidance

Prefer views derived from maintained runtime structures.

- render run trees from `RunTreeInspector`
- diff runs with `TraceDiffer`
- build incident summaries with `IncidentDebugger`
- export bundles with `TraceSerializer`

Avoid inventing a separate visualization schema before you need one.
The maintained runtime surfaces are already the compatibility layer.
