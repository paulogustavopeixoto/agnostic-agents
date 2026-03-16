class ApprovalInbox {
  constructor() {
    this.requests = new Map();
  }

  async add(request) {
    this.requests.set(request.runId, request);
    return request;
  }

  async get(runId) {
    return this.requests.get(runId) || null;
  }

  async list() {
    return [...this.requests.values()];
  }

  async resolve(runId) {
    const request = this.requests.get(runId) || null;
    this.requests.delete(runId);
    return request;
  }
}

module.exports = { ApprovalInbox };
