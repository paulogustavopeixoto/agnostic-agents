# Remote control planes

`v6.1` keeps external control-plane integration simple:

- `WebhookGovernanceAdapter` forwards governance events such as `approval_requested`, `approval_resolved`, `policy_decision`, `run_completed`, and `run_failed`
- `WebhookEventSink` forwards selected runtime events to an external status or observability service

These adapters do not require a hosted product. They are thin transport bridges that let you connect `agnostic-agents` to your own API service, review inbox, or operations UI.

## Governance forwarding

Use `WebhookGovernanceAdapter` when an external service should receive review and approval signals.

```js
const {
  Agent,
  GovernanceHooks,
  WebhookGovernanceAdapter,
} = require('agnostic-agents');

const governanceAdapter = new WebhookGovernanceAdapter({
  endpoint: 'https://control-plane.example/governance',
});

const agent = new Agent(adapter, {
  governanceHooks: new GovernanceHooks(governanceAdapter.asHooks()),
});
```

## External event forwarding

Use `WebhookEventSink` when a remote control plane or observability service should receive selected runtime events.

```js
const {
  Agent,
  EventBus,
  WebhookEventSink,
} = require('agnostic-agents');

const eventBus = new EventBus({
  sinks: [
    new WebhookEventSink({
      endpoint: 'https://control-plane.example/events',
      eventTypes: ['approval_requested', 'run_completed', 'run_failed'],
    }),
  ],
});

const agent = new Agent(adapter, { eventBus });
```

## Recommended split

For a remote control plane:

- API or worker process
  - runs `Agent` or `WorkflowRunner`
  - persists runs
  - emits governance and runtime events
- control-plane service
  - receives governance callbacks
  - displays status and approvals
  - resolves approval decisions back through your API layer

## Maintained reference example

- [`examples/referenceRemoteControlPlane.js`](../examples/referenceRemoteControlPlane.js)
