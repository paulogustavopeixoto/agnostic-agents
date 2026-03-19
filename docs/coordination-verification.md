# Coordination Verification

`v12 Coordination OS` needs verification that can vary by task risk and recent
failure history, without hiding that logic inside one opaque reviewer.

The maintained coordination surface now includes:

- `VerificationStrategySelector`
- `MultiPassVerificationEngine`

## Supported coordination verification modes

- `single_pass`
- `multi_pass_cross_check`
- `adversarial_cross_check`

## What this adds

- strategy selection informed by task risk and recent coordination history
- distinct reviewer roles across verifier, critic, and aggregator phases
- adversarial verification for high-risk or disagreement-prone tasks
- inspectable verification traces instead of hidden reviewer chains

## Maintained example

- [`examples/referenceCoordinationVerification.js`](../examples/referenceCoordinationVerification.js)

That example shows:

- strategy selection for a high-risk release-review task
- verifier, critic, and aggregator phases
- adversarial disagreement producing escalation
