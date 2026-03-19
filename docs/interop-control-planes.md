# Third-Party Control Plane Interop

This document describes the maintained guidance for third-party control planes
and external tooling that consume `agnostic-agents` artifacts.

## Recommended inputs

Third-party control planes should prefer exported public artifacts over private
runtime access:

- `RunInspector` summaries
- `TraceSerializer` run traces and trace bundles
- `StateBundle` and restore reports
- `ExtensionManifest` and related interop artifacts
- policy and eval artifacts validated through `ConformanceKit`

## Recommended boundaries

- keep approval and governance calls explicit
- consume lineage and checkpoint data from exported artifacts
- do not assume hidden runtime ordering or private store structure
- prefer file or API transport of artifacts over direct internal object access

## Maintained references

- [`examples/referencePublicControlPlane.js`](../examples/referencePublicControlPlane.js)
- [`examples/referenceExternalConformanceFlow.js`](../examples/referenceExternalConformanceFlow.js)
- [`docs/public-control-plane-references.md`](./public-control-plane-references.md)
