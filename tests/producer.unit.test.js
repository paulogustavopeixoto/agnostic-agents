const { FunctionProducer, ProducerRuntime, normalizeContent, TraceSerializer } = require('..');

describe('Producer runtime boundaries', () => {
  test.each(['image', 'audio', 'video', 'file'])('persists inspectable %s references', async type => {
    const producer = new FunctionProducer({ id: 'custom', operations: {
      generate: async () => ({ content: [{ type, artifactId: 'tenant/asset', mimeType:
        type === 'file' ? 'application/pdf' : `${type}/example` }] }),
    } });
    const runtime = new ProducerRuntime({ producer });
    const run = await runtime.run({ operation: 'generate', content: [{ type: 'text', text: 'create' }] });
    expect(run.status).toBe('completed');
    expect((await runtime.runStore.getRun(run.id)).output).toEqual(run.output);
    const restored = TraceSerializer.importRun(JSON.parse(JSON.stringify(TraceSerializer.exportRun(run))));
    expect(restored.output).toEqual(run.output);
    expect(run.steps[0].status).toBe('completed');
  });

  test('denied and throwing gates cannot invoke the producer', async () => {
    const handler = jest.fn();
    const producer = new FunctionProducer({ id: 'custom', operations: { generate: handler } });
    for (const authorize of [() => false, () => undefined, () => { throw Error('secret'); }]) {
      const run = await new ProducerRuntime({ producer, authorize }).run({ operation: 'generate', content: [] });
      expect(run.status).toBe('failed');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  test('cancellation propagates to handler and prevents completed output', async () => {
    const controller = new AbortController();
    const producer = new FunctionProducer({ id: 'custom', operations: { generate: async (_, context) => {
      expect(context.signal.aborted).toBe(false);
      controller.abort();
      expect(context.signal.aborted).toBe(true);
      return { content: [] };
    } } });
    const run = await new ProducerRuntime({ producer }).run({ operation: 'generate', content: [] },
      { signal: controller.signal });
    expect(run.status).toBe('cancelled');
    expect(run.output).toBeNull();
  });

  test('provider exceptions do not leak credentials into stored traces', async () => {
    const producer = new FunctionProducer({ id: 'custom', operations: { generate: async () => {
      throw Error('Authorization: Bearer private-secret');
    } } });
    const run = await new ProducerRuntime({ producer }).run({ operation: 'generate', content: [] });
    expect(run.status).toBe('failed');
    expect(JSON.stringify(run)).not.toContain('private-secret');
  });

  test('pre-cancelled requests never invoke producers', async () => {
    const handler = jest.fn();
    const controller = new AbortController();
    controller.abort();
    const producer = new FunctionProducer({ id: 'x', operations: { generate: handler } });
    const run = await new ProducerRuntime({ producer }).run({ operation: 'generate', content: [] },
      { signal: controller.signal });
    expect(run.status).toBe('cancelled');
    expect(handler).not.toHaveBeenCalled();
  });

  test('malformed producer output is a persisted failure', async () => {
    const producer = new FunctionProducer({ id: 'x', operations: { generate: async () => ({
      content: [{ type: 'video', data: 'unbounded-inline-bytes' }],
    }) } });
    const runtime = new ProducerRuntime({ producer });
    const run = await runtime.run({ operation: 'generate', content: [] });
    expect((await runtime.runStore.getRun(run.id)).status).toBe('failed');
    expect(run.output).toBeNull();
  });

  test('rejects inline binary, mismatched MIME, and unsupported operations', async () => {
    expect(() => normalizeContent([{ type: 'audio', data: Buffer.from('private') }])).toThrow();
    expect(() => normalizeContent([{ type: 'image', artifactId: 'x', mimeType: 'audio/wav' }])).toThrow();
    const producer = new FunctionProducer({ id: 'x', operations: {} });
    await expect(new ProducerRuntime({ producer }).run({ operation: 'toString', content: [] })).rejects.toThrow();
  });
});
