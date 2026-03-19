# Coordination Quality

`v12 Coordination OS` needs to distinguish verifier quality from executor
quality instead of treating all coordination actors as one flat trust pool.

The maintained coordination surface now includes:

- `CoordinationQualityTracker`

## What it tracks

- verifier quality
- executor quality
- critic quality
- aggregator quality

## Why this matters

A strong executor with weak verification is not the same as a strong verifier
with average execution. Coordination quality needs those signals to stay
separate.

## Maintained example

- [`examples/referenceCoordinationQuality.js`](../examples/referenceCoordinationQuality.js)

That example shows:

- verifier and executor quality tracked separately
- quality summaries by role
- per-actor quality profiles linked to the underlying trust profile
