# Enterprise Boundaries

`v20 Enterprise Autonomy OS` should make external systems, approval
organizations, and environment boundaries explicit rather than leaving them in
ad hoc deployment notes.

The maintained surface for that is:

- `EnterpriseBoundaryProfile`

Use it when you want to:

- declare environment boundaries such as `staging` and `prod`
- record approval organizations such as operations or compliance teams
- list external systems that autonomy interacts with
- make tenant and isolation boundaries inspectable

## Maintained example

- [`examples/referenceEnterpriseBoundaries.js`](../examples/referenceEnterpriseBoundaries.js)
