# Unified Execution Graph

This guide covers the first maintained `v20 Enterprise Autonomy OS` slice.

The baseline surface is:

- `UnifiedExecutionGraph`

It gives the package one inspectable graph view across runtime, policy, memory, coordination, learning, and fleet signals.

## What This Adds

- one stitched graph for runtime steps and higher-layer control signals
- one place to inspect how a run was governed, adapted, and operated

## Maintained Reference Example

See:

- [`examples/referenceUnifiedExecutionGraph.js`](../examples/referenceUnifiedExecutionGraph.js)

That example shows:

- one runtime step
- one policy decision
- one memory event
- one coordination decision
- one learned change
- one fleet action
