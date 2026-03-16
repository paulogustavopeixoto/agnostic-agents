/**
 * Transport-backed event sink for forwarding runtime events to an external
 * status or observability service.
 */
class WebhookEventSink {
  /**
   * @param {object} [options]
   * @param {string} [options.endpoint]
   * @param {Function|null} [options.transport]
   * @param {object} [options.headers]
   * @param {string[]|null} [options.eventTypes]
   */
  constructor({
    endpoint = 'https://control-plane.invalid/events',
    transport = null,
    headers = {},
    eventTypes = null,
  } = {}) {
    this.endpoint = endpoint;
    this.transport =
      typeof transport === 'function'
        ? transport
        : async request => {
            const response = await fetch(request.url, {
              method: request.method || 'POST',
              headers: request.headers,
              body: JSON.stringify(request.body),
            });

            return {
              ok: response.ok,
              status: response.status,
            };
          };
    this.headers = {
      'content-type': 'application/json',
      ...headers,
    };
    this.eventTypes = Array.isArray(eventTypes) ? new Set(eventTypes) : null;
  }

  async handleEvent(event, run = null) {
    if (this.eventTypes && !this.eventTypes.has(event?.type)) {
      return null;
    }

    return this.transport({
      url: this.endpoint,
      method: 'POST',
      headers: this.headers,
      body: {
        event,
        run: run
          ? {
              id: run.id,
              status: run.status,
              metadata: run.metadata || {},
            }
          : null,
      },
    });
  }
}

module.exports = { WebhookEventSink };
