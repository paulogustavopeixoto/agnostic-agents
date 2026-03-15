# Release Checklist

Use this checklist before publishing a new package version.

## Validation

- [ ] `npm ci`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:coverage`
- [ ] `npm run test:live` or document why live tests were skipped
- [ ] `npm run pack:audit`

## Examples

- [ ] Run `npm run example:local-tool`
- [ ] Run `npm run example:local-rag`
- [ ] Run `npm run example:local-rag-tool`
- [ ] Run `npm run example:openai`
- [ ] Run `npm run example:gemini`

## Package hygiene

- [ ] Review `README.md`
- [ ] Review `examples/README.md`
- [ ] Review `CHANGELOG.md`
- [ ] Confirm `package.json` version is correct
- [ ] Confirm published package contents from `npm pack --dry-run`

## Release

- [ ] Tag the release
- [ ] Publish to npm
- [ ] Push changelog updates
