# Distributed identities

`v6.2` keeps remote auth and identity explicit:

- runs can carry an `executionIdentity`
- distributed envelopes can carry a `distributedAuthScope`
- secret values still resolve locally on the receiving host

## Execution identity

Use `executionIdentity` to describe who or what is acting across service boundaries.

Supported fields:

- `actorId`
- `serviceId`
- `tenantId`
- `sessionId`
- `scopes`

Example:

```js
const agent = new Agent(adapter, {
  executionIdentity: {
    actorId: 'operator-1',
    serviceId: 'api-service',
    tenantId: 'tenant-1',
    scopes: ['runs:write', 'approvals:resolve'],
  },
});
```

The runtime stores that identity on the run and includes it in distributed handoff metadata.

## Distributed auth scope

`distributedAuthScope` lists which host-controlled auth bindings a remote runtime is allowed to resolve.

This is scope metadata only. It is not the secret payload.

If a remote run tries to execute a tool that requires bindings outside the allowed scope, the runtime fails closed with a `ToolPolicyError`.

## Remote auth resolution

Use `resolveToolAuth` on the receiving host to map:

- tool requirements
- run metadata
- `executionIdentity`
- `distributedAuthScope`

into locally available credentials.

```js
const workerAgent = new Agent(adapter, {
  resolveToolAuth: async (tool, { run, executionIdentity, authScope, requirements }) => {
    return loadTenantBindings({
      tenantId: executionIdentity?.tenantId || run?.metadata?.executionIdentity?.tenantId,
      serviceId: executionIdentity?.serviceId,
      allowedBindings: authScope,
      requirements,
    });
  },
});
```

## Security notes for replay and trace access

When exporting traces or replaying cross-service runs:

- do not store raw secrets in run metadata or distributed envelopes
- treat `distributedAuthScope` as an allowlist, not as credential material
- protect replay, trace bundle, and incident export endpoints with the same trust boundary as approval resolution
- prefer `piiSafe: true` sinks when identity metadata may contain user or tenant identifiers
- review `executionIdentity.scopes` before allowing remote replay or branch operations in a control plane

## Recommended defaults

- keep `executionIdentity` small and explicit
- prefer service and tenant identifiers over free-form labels
- keep `distributedAuthScope` narrower than the full local `authContext`
- resolve credentials locally on each host
- audit replay and approval operations when they cross service boundaries
