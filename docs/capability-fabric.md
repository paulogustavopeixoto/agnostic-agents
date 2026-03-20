# Capability Fabric

`CapabilityRouter` is the first maintained `v17` surface for turning
provider-agnostic execution into capability-aware routing.

Use it when you want to choose between candidate paths such as:

- models
- tools
- simulators / sandbox workers
- verifier paths
- human escalation targets

The router does not execute those paths directly.
It ranks and explains them so higher layers such as `FallbackRouter`,
workflows, coordination, or operator control can use one explicit routing
decision surface.

## What it evaluates

`CapabilityRouter` can score candidates by:

- task type
- required and preferred capabilities
- candidate kind
- trust zone
- cost / risk / latency preference
- simulation support
- certification level
- reputation score
- historical routing outcomes through `HistoricalRoutingAdvisor`

## Minimal example

```js
const { CapabilityRouter } = require('agnostic-agents');

const router = new CapabilityRouter({
  candidates: [
    {
      id: 'code-model',
      kind: 'model',
      capabilities: ['generateText', 'code_generation'],
      profile: {
        taskTypes: ['coding'],
        trustZones: ['private'],
        costTier: 'medium',
        riskTier: 'high',
        certificationLevel: 'certified',
        reputationScore: 0.9,
      },
    },
    {
      id: 'sandbox-worker',
      kind: 'simulator',
      capabilities: ['simulation'],
      profile: {
        taskTypes: ['risky_execution'],
        trustZones: ['sandbox_only'],
        supportsSimulation: true,
      },
    },
  ],
});

const route = router.select({
  taskType: 'coding',
  requiredCapabilities: ['generateText'],
  preferredCapabilities: ['code_generation'],
  preferredKinds: ['model'],
  trustZone: 'private',
});
```

## Why this exists

`FallbackRouter` is still the maintained runtime surface for provider fallback
and adapter-level route preference.

`CapabilityRouter` sits above that layer.
It exists because the next direction is broader than switching providers:

- route by capability, not only provider
- stay agnostic to how intelligence is produced
- make route choice inspectable and governable
- include simulators, verifiers, and human checkpoints in the same decision frame

The maintained coordination surfaces can now consume the router too:

- `DecompositionAdvisor`
- `RoleAwareCoordinationPlanner`
- `VerificationStrategySelector`

That means decomposition, role assignment, and verification strategy can request
safer or stronger paths through the same routing surface instead of carrying
separate route heuristics.
