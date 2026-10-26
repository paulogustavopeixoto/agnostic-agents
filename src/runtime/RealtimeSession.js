const { Run } = require('./Run');
const { InMemoryRunStore } = require('./stores/InMemoryRunStore');
const { invokeWithDeadline } = require('./InvocationControl');
const { ToolPolicyError } = require('../errors');

/** Provider-neutral live session. Raw media frames are never written to the run store. */
class RealtimeSession {
  constructor({ transport, authorize, runStore = new InMemoryRunStore(), maxFrameBytes = 256 * 1024,
    maxFrames = 10000, maxTotalBytes = 10 * 1024 * 1024, invocationTimeoutMs = 30000 } = {}) {
    if (['connect', 'send', 'interrupt', 'events', 'close'].some(key => typeof transport?.[key] !== 'function') ||
        typeof authorize !== 'function' || [maxFrameBytes, maxFrames, maxTotalBytes, invocationTimeoutMs]
          .some(value => !Number.isSafeInteger(value) || value < 1)) throw new TypeError('Invalid realtime session.');
    Object.assign(this, { transport, authorize, runStore, maxFrameBytes, maxFrames, maxTotalBytes, invocationTimeoutMs });
    this.run = null;
    this.epoch = 0;
    this.frames = 0;
    this.bytes = 0;
    this.sending = false;
    this.reading = false;
    this.persist = Promise.resolve();
    this.closed = false;
    this.eventsSeen = 0;
  }

  async _save(type, payload = {}) {
    this.run.addEvent({ type, timestamp: new Date().toISOString(), payload });
    this.persist = this.persist.then(() => this.runStore.saveRun(this.run));
    await this.persist;
  }

  async _allow(operation, metadata = {}) {
    if (await this.authorize({ operation, runId: this.run?.id || null, ...metadata }) !== true) {
      throw new ToolPolicyError('Realtime operation denied.');
    }
  }

  async open({ signal } = {}) {
    if (this.run) throw new Error('Session already opened.');
    await this._allow('connect');
    this.run = new Run({ metadata: { realtime: true, contentVersion: '1.0' } });
    this.run.setStatus('running');
    await this._save('session_started');
    try {
      await invokeWithDeadline(controlSignal => this.transport.connect({ runId: this.run.id, signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs });
      return this.run;
    } catch (error) { await this._failed(); throw error; }
  }

  _frame(frame) {
    if (frame?.type === 'text' && typeof frame.text === 'string') {
      return { frame: { type: 'text', text: frame.text }, size: Buffer.byteLength(frame.text) };
    }
    if (['audio', 'video', 'image'].includes(frame?.type) && frame.data instanceof Uint8Array &&
        typeof frame.mimeType === 'string' && frame.mimeType.startsWith(`${frame.type}/`)) {
      if (frame.data.byteLength > this.maxFrameBytes) throw new ToolPolicyError('Realtime frame budget exceeded.');
      return { frame: { type: frame.type, data: Buffer.from(frame.data), mimeType: frame.mimeType }, size: frame.data.byteLength };
    }
    throw new TypeError('Invalid realtime frame.');
  }

  _reserve(size) {
    if (size > this.maxFrameBytes || this.frames + 1 > this.maxFrames || this.bytes + size > this.maxTotalBytes) {
      throw new ToolPolicyError('Realtime frame budget exceeded.');
    }
    this.frames++; this.bytes += size;
  }

  async send(frame, { signal } = {}) {
    if (this.run?.status !== 'running' || this.sending) throw new Error('Session is unavailable or already sending.');
    this.sending = true;
    try {
      const normalized = this._frame(frame);
      await this._allow('send', { kind: frame.type, bytes: normalized.size });
      this._reserve(normalized.size);
      const epoch = this.epoch;
      await this._save('frame_sent', { kind: frame.type, bytes: normalized.size, epoch });
      await invokeWithDeadline(controlSignal => this.transport.send({ ...normalized.frame, epoch }, { signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs });
    } catch (error) { await this._failed(); throw error; }
    finally { this.sending = false; }
  }

  async interrupt({ signal } = {}) {
    if (this.run?.status !== 'running') throw new Error('Session is unavailable.');
    await this._allow('interrupt');
    const epoch = ++this.epoch;
    try {
      await invokeWithDeadline(controlSignal => this.transport.interrupt({ epoch, signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs });
      await this._save('session_interrupted', { epoch });
    } catch (error) { await this._failed(); throw error; }
  }

  async *events({ signal } = {}) {
    if (this.run?.status !== 'running' || this.reading) throw new Error('Session is unavailable or already being read.');
    this.reading = true;
    let iterator;
    try {
      iterator = this.transport.events()[Symbol.asyncIterator]();
      while (this.run.status === 'running') {
        const next = await invokeWithDeadline(() => iterator.next(), { signal, timeoutMs: this.invocationTimeoutMs });
        if (this.run.status !== 'running') break;
        if (next.done) { this.run.setStatus('paused'); this.run.state.resultStatus = 'incomplete'; break; }
        const event = next.value;
        if (++this.eventsSeen > this.maxFrames) throw new ToolPolicyError('Realtime event budget exceeded.');
        if (!Number.isSafeInteger(event?.epoch)) throw new Error('Realtime event requires an epoch.');
        if (event.epoch < this.epoch) continue;
        if (event.epoch !== this.epoch) throw new Error('Invalid realtime epoch.');
        const epoch = event.epoch;
        if (event.type === 'end') { this.run.setStatus('completed'); this.run.state.resultStatus = 'completed'; break; }
        const normalized = this._frame(event);
        await this._allow('receive', { kind: event.type, bytes: normalized.size });
        signal?.throwIfAborted();
        if (this.run.status !== 'running' || this.closed) break;
        if (epoch !== this.epoch) continue;
        this._reserve(normalized.size);
        await this._save('frame_received', { kind: event.type, bytes: normalized.size, epoch });
        signal?.throwIfAborted();
        if (this.run.status !== 'running' || this.closed) break;
        if (epoch !== this.epoch) continue;
        yield { ...normalized.frame, epoch, runId: this.run.id };
      }
    } catch (error) {
      if (this.run.status === 'cancelled') return;
      if (this.run.status === 'running') await this._failed();
      throw error;
    } finally {
      this.reading = false;
      try { if (iterator?.return) await invokeWithDeadline(() => iterator.return(), { timeoutMs: this.invocationTimeoutMs }); }
      finally { await this.close(); }
    }
  }

  async _failed() {
    if (!this.run) return;
    this.run.setStatus('failed');
    this.run.state.resultStatus = 'uncertain';
    this.run.addError({ name: 'RealtimeError', message: 'Realtime operation did not complete.' });
    try { await this._save('session_failed'); }
    finally { await this.close(); }
  }

  async close() {
    if (!this.run || this.closed) return;
    this.closed = true;
    if (this.run.status === 'running') { this.run.setStatus('cancelled'); this.run.state.resultStatus = 'cancelled'; }
    try { await invokeWithDeadline(() => this.transport.close(), { timeoutMs: this.invocationTimeoutMs }); }
    finally { await this._save('session_closed'); }
  }
}

module.exports = { RealtimeSession };
