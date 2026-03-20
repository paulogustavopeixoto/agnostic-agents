# Memory Governance

This guide covers the first maintained `v18 Memory Governance OS` slice in `agnostic-agents`.

The package now supports explicit governance helpers around `Memory`:

- `MemoryProvenanceLedger`
- `MemoryRetentionPolicy`
- `MemoryAccessController`
- `MemoryConflictResolver`
- `MemoryAccessContractRegistry`

Those surfaces plug into `Memory` through the `governance` option and make memory behavior more inspectable.

## What This Adds

- provenance records for memory writes, reads, blocks, expiration, retention, and conflicts
- retention rules by memory layer
- trust-zone-aware read and write controls
- conflict resolution between competing records with trust-based preference
- portable access-contract declarations carried through state bundles

## Example

```js
const {
  Memory,
  MemoryProvenanceLedger,
  MemoryRetentionPolicy,
  MemoryAccessController,
  MemoryConflictResolver,
} = require('agnostic-agents');

const memory = new Memory({
  governance: {
    provenanceLedger: new MemoryProvenanceLedger(),
    retentionPolicy: new MemoryRetentionPolicy({
      layerRules: {
        working: { maxAgeMs: 60000 },
      },
    }),
    accessController: new MemoryAccessController({
      rules: [
        { action: 'read', layer: 'policy', trustZone: 'public', effect: 'deny' },
      ],
    }),
    conflictResolver: new MemoryConflictResolver({
      trustScores: { trusted_system: 0.9, import: 0.2 },
    }),
  },
});
```

## Maintained Reference Example

See:

- [`examples/referenceMemoryGovernance.js`](../examples/referenceMemoryGovernance.js)
- [`examples/referenceMemoryGovernanceReview.js`](../examples/referenceMemoryGovernanceReview.js)

That example shows:

- governed writes into working, profile, and policy layers
- a blocked public read of policy memory
- conflict resolution favoring a higher-trust source
- retention-based forgetting
- an operator-visible memory audit log
- an operator-visible review path built from memory audit summaries and benchmark checks
