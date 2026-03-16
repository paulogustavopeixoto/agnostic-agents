const { RuntimeEventRedactor } = require('./RuntimeEventRedactor');

class ConsoleDebugSink {
  constructor({ logger = console, piiSafe = false, redactor = null } = {}) {
    this.logger = logger;
    this.piiSafe = Boolean(piiSafe);
    this.redactor = redactor instanceof RuntimeEventRedactor ? redactor : new RuntimeEventRedactor();
  }

  async handleEvent(event) {
    const payload = this.piiSafe ? this.redactor.redact(event) : event;
    this.logger.debug
      ? this.logger.debug('[agnostic-agents]', JSON.stringify(payload))
      : this.logger.log('[agnostic-agents]', JSON.stringify(payload));
  }
}

module.exports = { ConsoleDebugSink };
