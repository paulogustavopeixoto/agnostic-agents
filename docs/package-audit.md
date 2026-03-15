# Package Audit

## Audit command

```bash
npm run pack:audit
```

## Current result

The published tarball is constrained to the maintained public surface:

- core source under `src/`
- maintained example entry points only
- `README.md`
- `CHANGELOG.md`
- test/release documentation

Legacy or experimental examples are no longer included in the npm tarball.

## Most recent audit summary

- package name: `agnostic-agents`
- version: `1.0.39`
- tarball size: about `37 kB`
- unpacked size: about `148 kB`
- total files: `51`

## Audit goals

- keep the package focused on supported public APIs
- exclude stale examples from the published artifact
- ensure the npm tarball reflects the maintained v1 surface
