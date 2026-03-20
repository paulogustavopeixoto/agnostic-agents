# Transactional Execution

`v20 Enterprise Autonomy OS` should treat real-world side effects with explicit
execution, verification, and compensation structure.

The maintained surface for that is:

- `TransactionalExecutionPlan`

Use it when you want to:

- stage preflight, execute, verify, and compensate phases for side-effecting work
- make approval requirements visible before execution
- document compensation paths for external writes
- review transactional behavior across external systems and environments

## Maintained example

- [`examples/referenceEnterpriseBoundaries.js`](../examples/referenceEnterpriseBoundaries.js)
