# Plugin Authoring Guide

This guide explains how to extend `agnostic-agents` through `ExtensionHost`.

The goal is to keep extensions:

- portable
- explicit
- small
- safe to reason about

## Extension model

Extensions are registered through:

- `new ExtensionHost({ extensions })`
- `extensionHost.register(extension)`

An extension contributes to one or more runtime surfaces:

- event sinks
- governance hooks
- policy rules
- environment adapters
- eval scenarios

## Minimal extension shape

```js
const extension = {
  name: 'example-extension',
  version: '1.0.0',
  metadata: {
    purpose: 'demo',
  },
  contributes: {
    eventSinks: [],
    governanceHooks: [],
    policyRules: [],
    environmentAdapters: [],
    evalScenarios: [],
  },
};
```

Then:

```js
const host = new ExtensionHost({ extensions: [extension] });
```

## Event sink contribution

Use event sinks when you want to:

- forward runtime events to logs
- ship audit records elsewhere
- integrate with metrics or telemetry systems

Example:

```js
const extension = {
  name: 'telemetry-extension',
  contributes: {
    eventSinks: [
      {
        async handleEvent(event, run) {
          console.log('telemetry', event.type, run?.id);
        },
      },
    ],
  },
};
```

## Governance hook contribution

Use governance hooks when you want to:

- observe approval requests
- integrate external review systems
- mirror run terminal events into a control plane

Example:

```js
const extension = {
  name: 'governance-extension',
  contributes: {
    governanceHooks: [
      async (type, payload, context) => {
        if (type === 'approval_requested') {
          console.log('approval requested for run', context.run.id);
        }
      },
    ],
  },
};
```

## Policy rule contribution

Use policy rules when you want to:

- enforce environment-specific restrictions
- require approval for certain tool classes
- deny unsafe operations by default

Example:

```js
const extension = {
  name: 'policy-extension',
  contributes: {
    policyRules: [
      {
        id: 'deny-destructive',
        sideEffectLevels: ['destructive'],
        action: 'deny',
        reason: 'Destructive actions are blocked in this environment.',
      },
    ],
  },
};
```

## Environment adapter contribution

Use environment adapters when you want to ship a reusable execution environment through the extension model.

Example contribution:

```js
const extension = {
  name: 'queue-adapter-extension',
  contributes: {
    environmentAdapters: [myQueueAdapter],
  },
};
```

## Eval scenario contribution

Use eval scenarios when you want extensions to bring their own regression checks or benchmarks.

Example:

```js
const extension = {
  name: 'eval-extension',
  contributes: {
    evalScenarios: [
      {
        id: 'prompt-regression',
        run: async () => 'ok',
        assert: output => output === 'ok',
      },
    ],
  },
};
```

## Best practices

- keep extensions additive
- keep the extension contract explicit and named
- do not hide secret resolution inside model-visible logic
- treat policy and governance contributions as operator-facing behavior
- keep eval scenarios deterministic when possible
- prefer documented maintained hooks over monkey-patching internals

## What not to do

- do not depend on internal, unexported runtime files
- do not mutate runtime internals after registration
- do not assume extension execution order unless you explicitly control registration order
- do not treat extension code as exempt from the package governance and logging rules

## Related surfaces

- [`docs/api-reference.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/api-reference.md)
- [`docs/operator-workflows.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/operator-workflows.md)
- [`docs/api-stability-policy.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/api-stability-policy.md)
