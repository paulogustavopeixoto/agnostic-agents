# Operational Scorecards

This guide covers the next maintained `v20 Enterprise Autonomy OS` slice.

The baseline surface is:

- `OperationalScorecard`

It produces one operator-readable scorecard across reliability, governance, memory hygiene, routing quality, and operator load.

## What This Adds

- one consolidated operational scorecard from existing runtime and operator summaries
- one compact view of where the autonomy stack is degrading

## Maintained Reference Example

See:

- [`examples/referenceOperationalScorecard.js`](../examples/referenceOperationalScorecard.js)

That example shows:

- reliability scoring from run status
- governance scoring from blocked reports and rollback pressure
- memory hygiene scoring from governance diagnostics
- routing quality scoring from route degradation and drift
- operator load scoring from incidents and pending reviews
