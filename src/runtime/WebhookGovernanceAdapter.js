/**
 * Transport-backed governance adapter for forwarding approval and run-control
 * events to an external review or control-plane service.
 */
class WebhookGovernanceAdapter {
  /**
   * @param {object} [options]
   * @param {string} [options.endpoint]
   * @param {Function|null} [options.transport]
   * @param {object} [options.headers]
   */
  constructor({ endpoint = 'https://control-plane.invalid/governance', transport = null, headers = {} } = {}) {
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
  }

  async handle(type, payload = {}, context = {}) {
    return this.transport({
      url: this.endpoint,
      method: 'POST',
      headers: this.headers,
      body: {
        type,
        payload,
        context,
      },
    });
  }

  asHooks() {
    return {
      onEvent: async (type, payload, context) => this.handle(type, payload, context),
    };
  }
}

module.exports = { WebhookGovernanceAdapter };
