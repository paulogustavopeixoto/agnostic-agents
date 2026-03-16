# Secret Handling Guide

This guide defines the baseline secret-handling expectations for `agnostic-agents` deployments.

The goal is straightforward:

- keep provider keys, auth tokens, and session material out of prompts when possible
- keep secrets out of logs, traces, checkpoints, and audit records unless explicitly required
- make secret flow predictable at the runtime boundary

## Core rules

- keep secrets in environment variables or a dedicated secret manager
- do not hardcode provider keys or tool credentials in source files
- do not put secrets into prompts unless the model absolutely needs the literal value
- prefer passing auth material directly to tool implementations or adapters, not through model-visible messages
- treat run traces, checkpoints, and audit logs as potentially durable records

## Recommended storage locations

Use one of these patterns:

- local development
  - `.env` files that are gitignored
- deployed services
  - platform secret stores such as cloud secret managers, container secrets, or deployment environment variables
- higher-sensitivity production environments
  - short-lived credentials or rotated tokens from an external secret broker

Do not store secrets in:

- committed config files
- maintained examples
- benchmark fixtures
- test snapshots
- long-lived prompt templates

## Runtime-specific guidance

### Adapters

- provider API keys should be injected into adapter constructors from process environment or a secret manager
- adapters should avoid emitting raw auth headers or tokens into runtime events

### Tools

- tools that call external systems should receive credentials from the host process, not from model-generated arguments
- use the auth propagation model in [`docs/tool-auth-propagation.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/tool-auth-propagation.md) so required bindings are supplied through tool context instead of prompt-visible arguments
- use `ToolPolicy` allowlists and denylists to keep the model away from unapproved secret-bearing tools
- mark side-effecting tools with accurate `sideEffectLevel` metadata so governance and audit surfaces behave correctly

### Event and audit sinks

- enable `piiSafe: true` on `ConsoleDebugSink` and `FileAuditSink` in environments where payloads may contain identifiers or credentials
- use `RuntimeEventRedactor` when building custom sinks so secret-like fields are masked consistently
- do not treat redaction as a license to log everything; keep logged payloads minimal

### Traces and replays

- assume exported traces may leave the runtime boundary
- avoid including raw secrets in tool call arguments that become part of durable traces
- if a workflow requires secret-bearing runtime state, keep that state outside model-visible messages and outside replay snapshots where possible

## Testing guidance

- use fake credentials in unit tests and fixtures
- keep live credentials in environment variables only
- never assert against real secret values in tests
- when adding integration fixtures, prefer placeholders like `test-token` or `example-key`

## Operational checklist

Before shipping a runtime deployment:

- verify `.env` and local credential files are excluded from version control
- confirm debug and audit sinks use PII-safe mode where appropriate
- confirm no maintained example requires a real credential embedded in source
- confirm tool implementations pull credentials from host-controlled configuration
- confirm incident reports and trace exports are reviewed for secret exposure risk

## What this guide does not promise

This package helps with governance and redaction, but it does not replace:

- a real secret manager
- credential rotation
- host-level access control
- network egress controls
- provider-specific compliance requirements

Use this guide as the runtime baseline, not the full security program.
