# Tool Auth Propagation

This document defines the runtime auth propagation model for tools in `agnostic-agents`.

The goal is to keep credentials host-controlled while still letting tools receive the auth material they need.

## Core model

Tool auth should flow like this:

1. the host application owns credentials
2. the tool declares required bindings with `metadata.authRequirements`
3. the agent resolves those bindings from `authContext` or `resolveToolAuth`
4. the tool receives the bindings through the tool execution context, not model-generated arguments

This keeps secrets outside normal prompt content and outside model-controlled tool arguments.

## Declaring auth requirements

Tools should declare the bindings they require:

```js
const tool = new Tool({
  name: 'secure_search',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  metadata: {
    authRequirements: ['apiToken', 'workspaceId'],
  },
  implementation: async ({ query }, context) => {
    const token = context.getAuth('apiToken');
    const workspaceId = context.getAuth('workspaceId');
    return { query, workspaceId, tokenPresent: Boolean(token) };
  },
});
```

## Supplying auth from the host

Use one of these two patterns.

### Static auth context

```js
const agent = new Agent(adapter, {
  tools: [tool],
  authContext: {
    apiToken: process.env.SEARCH_API_TOKEN,
    workspaceId: process.env.SEARCH_WORKSPACE_ID,
  },
});
```

### Dynamic auth resolver

```js
const agent = new Agent(adapter, {
  tools: [tool],
  resolveToolAuth: async (tool, { requirements, run }) => {
    return loadBindingsForTenant(run?.metadata?.tenantId, requirements);
  },
});
```

Use `resolveToolAuth` when bindings depend on tenant, user, environment, or runtime state.

For remote runtimes, `resolveToolAuth` also receives:

- `executionIdentity`
- `authScope`

Those values come from distributed run metadata and let the receiving host resolve credentials without sending secret material through the distributed envelope.

## Tool execution context

When auth requirements are satisfied, the tool receives:

- `context.auth`
  - object containing only the declared required bindings
- `context.getAuth(name)`
  - helper to access a single binding
- `context.run`
  - current run when available
- `context.toolCall`
  - normalized tool call metadata

Bindings not declared in `authRequirements` are not propagated into `context.auth`.

## Failure behavior

If a tool declares `authRequirements` and the agent cannot satisfy them, the runtime denies execution before the tool implementation runs.

This fails as a `ToolPolicyError`.

That behavior is intentional:

- missing auth should be a host/runtime configuration error
- the model should not improvise credential values
- the runtime should fail closed, not open

## Interaction with governance

Auth propagation should be used together with:

- `ToolPolicy` allowlists and denylists
- accurate `sideEffectLevel` metadata
- `GovernanceHooks`
- `ApprovalInbox`
- `FileAuditSink` with `piiSafe: true` when audit logging is enabled

Auth propagation decides how credentials reach tools.
It does not replace approval or policy decisions.

For distributed runtimes, see [`docs/distributed-identities.md`](distributed-identities.md).

## Recommended practices

- keep secrets in host-controlled config, not prompts
- keep `authRequirements` narrow and explicit
- avoid passing credentials in tool arguments
- use separate bindings per integration when possible
- rotate and scope credentials outside the runtime
- treat traces and logs as durable records and enable redaction where needed

## What this model does not do

This model does not:

- mint credentials
- rotate credentials
- authenticate end users
- authorize external systems on your behalf
- replace host-level secret management

It only defines how the runtime should pass host-controlled auth into tool execution safely and predictably.
