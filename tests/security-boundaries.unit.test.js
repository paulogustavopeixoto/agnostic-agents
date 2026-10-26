const { RuntimeEventRedactor, WebhookEventSink, Run, FailureInjectionSuite,
  ReleaseEvidenceBundle, ProofPromotionGate } = require('..');

test('webhooks exclude prompts, retrieval, tool data, metadata, and unknown fields by default', async () => {
  const transport = jest.fn();
  const sink = new WebhookEventSink({ transport });
  const run = new Run({ id: 'run-1', metadata: { customer: 'private-customer' } });
  await sink.handleEvent({ id: 'event-1', type: 'model_response', timestamp: 'now',
    extra: 'private-extra', payload: { prompt: 'private-prompt', tool: 'private-tool',
      retrieval: 'private-document' } }, run);
  const body = transport.mock.calls[0][0].body;
  expect(body).toEqual({ event: { id: 'event-1', type: 'model_response', timestamp: 'now' },
    run: { id: 'run-1', status: 'pending' } });
  expect(JSON.stringify(body)).not.toContain('private-');
});

test('explicit webhook content capture still redacts secrets without mutating the event', async () => {
  const transport = jest.fn();
  const sink = new WebhookEventSink({ transport, captureContent: true,
    redactor: new RuntimeEventRedactor({ secrets: ['test-private-value'] }) });
  const event = { type: 'tool_completed', payload: { headers: { 'X-API-Key': 'key-private' },
    result: 'value test-private-value', message: 'Bearer test-credential' } };
  await sink.handleEvent(event);
  const output = JSON.stringify(transport.mock.calls[0][0].body);
  for (const secret of ['key-private', 'test-private-value', 'test-credential']) {
    expect(output).not.toContain(secret);
  }
  expect(event.payload.headers['X-API-Key']).toBe('key-private');
});

test('redactor handles binary, cycles, shared references, credentials in URLs, and prototype keys', () => {
  const shared = { Cookie: 'session-private' };
  const input = { first: shared, second: shared, data: Buffer.from('binary-private'),
    url: 'https://user:pass@example.com/?token=url-private&ok=yes' };
  input.cycle = input;
  const redactor = new RuntimeEventRedactor();
  const output = redactor.redact(input);
  expect(output.first).toEqual(output.second);
  expect(output.cycle).toBe('[REDACTED]');
  expect(output.data).toBe('[REDACTED]');
  expect(output.url).toBe('https://[REDACTED]@example.com/?token=[REDACTED]&ok=yes');
  expect(JSON.stringify(output)).not.toContain('private');
  const prototypeInput = JSON.parse('{"__proto__":{"token":"private"}}');
  const result = redactor.redact(prototypeInput);
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.hasOwn(result, '__proto__')).toBe(true);
});

test('redaction depth is bounded', () => {
  const output = new RuntimeEventRedactor({ maxDepth: 2 }).redact({ a: { b: { c: 'data' } } });
  expect(output.a.b).toBe('[REDACTED]');
});

test('missing rehearsal and promotion evidence cannot default to success', async () => {
  expect((await new FailureInjectionSuite().run()).failed).toBe(3);
  expect(ReleaseEvidenceBundle.build().summary.promotionAction).toBe('block');
  const decision = new ProofPromotionGate().evaluate({ evidenceBundle: {
    kind: 'agnostic-agents/release-evidence-bundle', summary: { promotionAction: 'promote' },
    routeProofs: [{ summary: { decision: 'promote' } }], attestations: [{ summary: { valid: true } }],
  } });
  expect(decision.action).toBe('hold');
  expect(decision.reasons.join(' ')).toContain('evidence is missing');
});
