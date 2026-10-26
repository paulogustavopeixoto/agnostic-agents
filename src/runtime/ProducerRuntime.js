const { randomUUID } = require('crypto');
const { Run } = require('./Run');
const { InMemoryRunStore } = require('./stores/InMemoryRunStore');
const Ajv = require('ajv');
const { SchemaSafety } = require('./SchemaSafety');
const { invokeWithDeadline, iterateWithControl } = require('./InvocationControl');

function cloneJson(value, depth = 0) {
  if (depth > 32) throw new TypeError('Structured content exceeds maximum depth.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(entry => cloneJson(entry, depth + 1));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry, depth + 1)]));
  }
  throw new TypeError('Structured content must contain only JSON values.');
}

// Content references are opaque. The runtime never fetches URLs or reads paths.
function normalizeContent(content) {
  if (!Array.isArray(content)) throw new TypeError('Content must be an array.');
  return content.map(part => {
    if (!part || typeof part !== 'object') throw new TypeError('Invalid content part.');
    if (part.type === 'text' && typeof part.text === 'string') {
      return { type: 'text', text: part.text };
    }
    if (part.type === 'json') return { type: 'json', value: cloneJson(part.value) };
    if (!['image', 'audio', 'video', 'file'].includes(part.type)) {
      throw new TypeError('Unsupported content type.');
    }
    if (typeof part.artifactId !== 'string' || !part.artifactId.trim() ||
        typeof part.mimeType !== 'string' || !part.mimeType.includes('/')) {
      throw new TypeError('Media requires an artifactId and MIME type.');
    }
    if (part.type !== 'file' && !part.mimeType.startsWith(`${part.type}/`)) {
      throw new TypeError('Media type does not match MIME type.');
    }
    return { type: part.type, artifactId: part.artifactId, mimeType: part.mimeType };
  });
}

class FunctionProducer {
  constructor({ id, operations = {}, streams = {} } = {}) {
    if (typeof id !== 'string' || !id.trim() || !operations ||
        Object.values(operations).some(handler => typeof handler !== 'function') ||
        !streams || Object.values(streams).some(handler => typeof handler !== 'function')) {
      throw new TypeError('Producer requires an id and operation handlers.');
    }
    this.id = id;
    this.operations = new Map(Object.entries(operations));
    this.streams = new Map(Object.entries(streams));
  }

  supports(operation) { return this.operations.has(operation); }

  async produce(request, context) {
    if (!this.supports(request.operation)) throw new Error('Unsupported producer operation.');
    return this.operations.get(request.operation)(request, context);
  }

  supportsStream(operation) { return this.streams.has(operation); }

  stream(request, context) {
    if (!this.supportsStream(request.operation)) throw new Error('Unsupported streaming operation.');
    return this.streams.get(request.operation)(request, context);
  }
}

class ProducerRuntime {
  constructor({ producer, runStore = new InMemoryRunStore(), authorize, outputSchema,
    maxOutputBytes = 10 * 1024 * 1024, schemaSafety = {}, invocationTimeoutMs = null } = {}) {
    if (!producer || typeof producer.produce !== 'function' ||
        typeof producer.supports !== 'function' || typeof producer.id !== 'string') {
      throw new TypeError('Invalid producer.');
    }
    if (authorize !== undefined && typeof authorize !== 'function') {
      throw new TypeError('authorize must be a function.');
    }
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new TypeError('Invalid output size limit.');
    this.maxOutputBytes = maxOutputBytes;
    if (invocationTimeoutMs !== null && (!Number.isSafeInteger(invocationTimeoutMs) ||
        invocationTimeoutMs < 1 || invocationTimeoutMs > 2147483647)) throw new TypeError('Invalid invocation timeout.');
    this.invocationTimeoutMs = invocationTimeoutMs;
    this.producer = producer;
    this.runStore = runStore;
    this.authorize = authorize;
    const safety = schemaSafety instanceof SchemaSafety ? schemaSafety : new SchemaSafety(schemaSafety);
    if (outputSchema !== undefined) safety.assertSchema(outputSchema);
    this.validateOutput = outputSchema === undefined ? null :
      new Ajv({ strict: false }).compile(outputSchema);
  }

  _validateOutput(output, validateSchema = true) {
    if (Buffer.byteLength(JSON.stringify(output), 'utf8') > this.maxOutputBytes) {
      throw new Error('Producer output exceeds size limit.');
    }
    if (validateSchema && this.validateOutput && !this.validateOutput(output)) {
      throw new Error('Producer output schema validation failed.');
    }
  }

  async run({ operation, content }, { signal, parentRunId = null, rootRunId = null, onRunCreated } = {}) {
    if (typeof operation !== 'string' || !this.producer.supports(operation)) {
      throw new Error('Unsupported producer operation.');
    }
    const request = { operation, content: normalizeContent(content) };
    const run = new Run({ input: request, metadata: { producerId: this.producer.id, operation,
      contentVersion: '1.0', lineage: { parentRunId, ...(rootRunId ? { rootRunId } : {}) } } });
    const step = run.addStep({ id: randomUUID(), type: 'producer', status: 'running',
      createdAt: new Date().toISOString() });
    const persistEvent = async type => {
      run.addEvent({ id: randomUUID(), type, timestamp: new Date().toISOString() });
      await this.runStore.saveRun(run);
    };
    run.setStatus('running');
    await persistEvent('producer_started');
    try {
      if (onRunCreated) await onRunCreated(run);
      signal?.throwIfAborted();
      // Only an explicit allow authorizes execution when a gate is configured.
      if (this.authorize && await this.authorize(request, { runId: run.id, signal }) !== true) {
        throw new Error('Producer execution denied.');
      }
      signal?.throwIfAborted();
      const result = await invokeWithDeadline(controlSignal => this.producer.produce(request, { runId: run.id, signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs });
      signal?.throwIfAborted();
      const output = { content: normalizeContent(result?.content) };
      const completion = result?.completionStatus || 'completed';
      if (!['completed', 'incomplete', 'uncertain'].includes(completion)) throw new Error('Invalid producer completion status.');
      this._validateOutput(output, completion === 'completed');
      run.output = output;
      run.state.resultStatus = completion;
      const status = completion === 'completed' ? 'completed' : 'paused';
      run.updateStep(step.id, { status });
      run.setStatus(status);
      if (status === 'paused') run.pendingPause = { stage: `producer_${completion}`, reason: 'Producer output is not complete.' };
    } catch (error) {
      const status = signal?.aborted ? 'cancelled' : 'failed';
      run.output = null;
      run.state.resultStatus = error?.uncertain ? 'uncertain' : status;
      // Provider errors may contain credentials or response bodies. Keep them out of traces.
      run.addError({ name: status === 'cancelled' ? 'AbortError' : 'ProducerError',
        message: status === 'cancelled' ? 'Producer execution cancelled.' : 'Producer execution failed.' });
      run.updateStep(step.id, { status });
      run.setStatus(status);
    }
    await persistEvent(`producer_${run.status}`);
    return run;
  }

  async *stream({ operation, content }, { signal } = {}) {
    if (!this.producer.supportsStream?.(operation) || typeof this.producer.stream !== 'function') {
      throw new Error('Unsupported streaming operation.');
    }
    const request = { operation, content: normalizeContent(content) };
    const run = new Run({ input: request, metadata: { producerId: this.producer.id,
      operation, contentVersion: '1.0', streaming: true } });
    const step = run.addStep({ id: randomUUID(), type: 'producer', status: 'running', createdAt: new Date().toISOString() });
    const save = async type => {
      run.addEvent({ id: randomUUID(), type, timestamp: new Date().toISOString() });
      await this.runStore.saveRun(run);
    };
    run.setStatus('running');
    await save('producer_started');
    let finished = false;
    try {
      signal?.throwIfAborted();
      if (this.authorize && await this.authorize(request, { runId: run.id, signal }) !== true) {
        throw new Error('Producer execution denied.');
      }
      signal?.throwIfAborted();
      const output = { content: [] };
      // Pull only when the consumer asks for the next event. for-await closes the
      // upstream iterator when the consumer stops, or validation/cancellation fails.
      for await (const event of iterateWithControl(controlSignal => this.producer.stream(request, { runId: run.id, signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs })) {
        signal?.throwIfAborted();
        if (event?.type !== 'content') throw new Error('Invalid producer stream event.');
        const parts = normalizeContent(event.content);
        output.content.push(...parts);
        if (Buffer.byteLength(JSON.stringify(output), 'utf8') > this.maxOutputBytes) {
          throw new Error('Producer output exceeds size limit.');
        }
        yield { type: 'content', runId: run.id, content: normalizeContent(parts) };
      }
      signal?.throwIfAborted();
      this._validateOutput(output);
      run.output = output;
      run.updateStep(step.id, { status: 'completed' });
      run.setStatus('completed');
      finished = true;
    } catch (error) {
      const status = signal?.aborted ? 'cancelled' : 'failed';
      run.state.resultStatus = error?.uncertain ? 'uncertain' : status;
      run.setStatus(status);
      run.updateStep(step.id, { status });
      run.addError({ name: 'ProducerError', message: 'Producer stream did not complete.' });
      finished = true;
    } finally {
      if (!finished) {
        run.setStatus('cancelled');
        run.updateStep(step.id, { status: 'cancelled' });
      }
      await save(`producer_${run.status}`);
    }
    yield { type: run.status, run };
  }
}

module.exports = { normalizeContent, FunctionProducer, ProducerRuntime };
