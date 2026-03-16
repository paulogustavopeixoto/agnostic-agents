const fs = require('fs/promises');
const path = require('path');
const { RuntimeEventRedactor } = require('./RuntimeEventRedactor');

/**
 * JSONL audit sink for side-effecting runtime activity.
 * Intended for durable operational records, not verbose debug traces.
 */
class FileAuditSink {
  /**
   * @param {object} [options]
   * @param {string} [options.filePath]
   * @param {string[]} [options.eventTypes]
   * @param {string[]} [options.sideEffectLevels]
   * @param {boolean} [options.piiSafe]
   * @param {RuntimeEventRedactor|null} [options.redactor]
   */
  constructor({
    filePath = path.join(process.cwd(), '.agnostic-agents', 'audit.log'),
    eventTypes = [
      'tool_requested',
      'policy_decision',
      'approval_requested',
      'approval_resolved',
      'tool_started',
      'tool_completed',
      'tool_failed',
      'run_completed',
      'run_failed',
    ],
    sideEffectLevels = ['external_write', 'system_write', 'destructive'],
    piiSafe = false,
    redactor = null,
  } = {}) {
    this.filePath = filePath;
    this.eventTypes = new Set(eventTypes);
    this.sideEffectLevels = new Set(sideEffectLevels);
    this.piiSafe = Boolean(piiSafe);
    this.redactor = redactor instanceof RuntimeEventRedactor ? redactor : new RuntimeEventRedactor();
  }

  /**
   * Persists a runtime event when it matches the configured audit policy.
   *
   * @param {object} event
   * @param {object|null} [run]
   * @returns {Promise<void>}
   */
  async handleEvent(event, run = null) {
    if (!this._shouldLog(event, run)) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      eventType: event?.type || null,
      runId: run?.id || null,
      status: run?.status || null,
      payload: event?.payload || {},
    };
    const output = this.piiSafe ? this.redactor.redact(entry) : entry;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(output)}\n`, 'utf8');
  }

  _shouldLog(event, run) {
    if (!event?.type || !this.eventTypes.has(event.type)) {
      return false;
    }

    if (this._payloadHasRisk(event.payload)) {
      return true;
    }

    if (run && this._runHasRiskyToolCalls(run)) {
      return true;
    }

    return false;
  }

  _payloadHasRisk(payload = {}) {
    const metadata = payload.metadata || payload.toolCall?.metadata || null;
    const sideEffectLevel = metadata?.sideEffectLevel || null;
    return sideEffectLevel ? this.sideEffectLevels.has(sideEffectLevel) : false;
  }

  _runHasRiskyToolCalls(run) {
    return (run?.toolCalls || []).some(toolCall =>
      this.sideEffectLevels.has(toolCall?.metadata?.sideEffectLevel || '')
    );
  }
}

module.exports = { FileAuditSink };
