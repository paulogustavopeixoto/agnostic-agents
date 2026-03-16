class ConsoleDebugSink {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  async handleEvent(event) {
    this.logger.debug
      ? this.logger.debug('[agnostic-agents]', JSON.stringify(event))
      : this.logger.log('[agnostic-agents]', JSON.stringify(event));
  }
}

module.exports = { ConsoleDebugSink };
