# Policy and Governance Packs

This package now includes a maintained production-oriented pack builder:

- `ProductionPolicyPack`

The goal is to make common deployment controls easy to ship without forcing users
into one hosted control plane or one product metaphor.

## What it does

`ProductionPolicyPack` builds an extension that can be registered through
`ExtensionHost`.

It contributes:

- policy rules for blocking or approval-gating tools
- governance hooks for capturing approval and policy-related events

## Typical use

Use it when you want a simple, reusable deployment baseline such as:

- deny destructive tools outright
- require approval for protected tools
- require approval for sensitive tagged tools
- capture approval/governance events for later inspection

## Example

```js
const {
  ExtensionHost,
  ProductionPolicyPack,
} = require('agnostic-agents');

const pack = new ProductionPolicyPack({
  environment: 'production',
  denyToolNames: ['delete_records'],
  protectedToolNames: ['send_status_update'],
  requireApprovalTags: ['pii'],
});

const host = new ExtensionHost({
  extensions: [pack.toExtension()],
});

const policy = host.extendToolPolicy();
const governanceHooks = host.extendGovernanceHooks();
```

## Why this exists

The lower-level runtime primitives still matter:

- `ToolPolicy`
- `GovernanceHooks`
- `ApprovalInbox`
- `WebhookGovernanceAdapter`

But many users need a maintained default pattern for production-like policy and
governance instead of reassembling those primitives from scratch every time.

`ProductionPolicyPack` is that pattern.

## Related references

- [`examples/referenceProductionPolicyPack.js`](../examples/referenceProductionPolicyPack.js)
- [`docs/plugin-authoring.md`](plugin-authoring.md)
- [`docs/remote-control-planes.md`](remote-control-planes.md)
