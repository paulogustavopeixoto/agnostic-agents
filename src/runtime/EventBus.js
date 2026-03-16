class EventBus {
  constructor({ sinks = [] } = {}) {
    this.sinks = [...sinks];
  }

  addSink(sink) {
    this.sinks.push(sink);
  }

  async emit(event, run) {
    for (const sink of this.sinks) {
      if (typeof sink === 'function') {
        await sink(event, run);
        continue;
      }

      if (sink && typeof sink.handleEvent === 'function') {
        await sink.handleEvent(event, run);
      }
    }
  }
}

module.exports = { EventBus };
