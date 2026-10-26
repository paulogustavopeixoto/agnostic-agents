const WebSocket = require('ws');
const { Tool } = require('../tools/adapters/Tool');
const { RetryManager } = require('../utils/RetryManager');
const { invokeWithDeadline } = require('../runtime/InvocationControl');
const { ToolExecutionError } = require('../errors');

class MCPClient {
  constructor({ endpoint, apiKey = null, extraHeaders = {}, retryManager = new RetryManager({ retries: 3 }),
    transport = null, requestTimeoutMs = 30000, maxPages = 100 } = {}) {
    if ((!endpoint && typeof transport !== 'function') || !Number.isSafeInteger(requestTimeoutMs) ||
        requestTimeoutMs < 1 || !Number.isSafeInteger(maxPages) || maxPages < 1) throw new TypeError('Invalid MCP configuration.');
    Object.assign(this, { endpoint, apiKey, extraHeaders, retryManager, transport, requestTimeoutMs, maxPages });
    this.ws = null;
    this._pending = new Map();
    this._id = 0;
    this._connecting = null;
  }

  async _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this._connecting) return this._connecting;
    const socket = new WebSocket(this.endpoint, { maxPayload: 1024 * 1024,
      headers: { ...this.extraHeaders, ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) } });
    this.ws = socket;
    const failPending = () => {
      if (this.ws !== socket) return;
      for (const pending of this._pending.values()) pending.reject(new Error('MCP connection closed.'));
      this._pending.clear();
    };
    socket.on('close', failPending);
    socket.on('error', failPending);
    socket.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      const pending = this._pending.get(message.id);
      if (!pending) return;
      if (message.error) pending.reject(new Error('MCP protocol error.'));
      else pending.resolve(message.result);
    });
    this._connecting = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.terminate(); reject(new Error('MCP connection timed out.')); }, this.requestTimeoutMs);
      const cleanup = () => { clearTimeout(timer); socket.off('open', opened); socket.off('error', failed); socket.off('close', failed); };
      const opened = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('MCP connection failed.')); };
      socket.once('open', opened); socket.once('error', failed); socket.once('close', failed);
    });
    try { await this._connecting; } finally { this._connecting = null; }
  }

  async _request(method, params) {
    if (this.transport) return invokeWithDeadline(signal => this.transport({ method, params, signal }),
      { timeoutMs: this.requestTimeoutMs });
    await this._connect();
    const id = ++this._id;
    return new Promise((resolve, reject) => {
      const finish = (callback, value) => { clearTimeout(timer); this._pending.delete(id); callback(value); };
      const timer = setTimeout(() => finish(reject, new Error('MCP request timed out.')), this.requestTimeoutMs);
      this._pending.set(id, { resolve: value => finish(resolve, value), reject: error => finish(reject, error) });
      try {
        this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }), error => {
          if (error) finish(reject, new Error('MCP send failed.'));
        });
      } catch { finish(reject, new Error('MCP send failed.')); }
    });
  }

  _send(method, params = {}) {
    // A lost tool response may follow a successful external action. Never retry it here.
    return method === 'tools/call' ? this._request(method, params) :
      this.retryManager.execute(() => this._request(method, params));
  }

  async listTools() {
    const tools = [];
    const cursors = new Set();
    let cursor;
    for (let page = 0; page < this.maxPages; page++) {
      const result = await this._send('tools/list', cursor ? { cursor } : {});
      if (!Array.isArray(result?.tools)) throw new Error('Invalid MCP tool list.');
      tools.push(...result.tools);
      if (!result.nextCursor) return tools;
      if (typeof result.nextCursor !== 'string' || cursors.has(result.nextCursor)) throw new Error('Invalid MCP pagination.');
      cursors.add(result.nextCursor); cursor = result.nextCursor;
    }
    throw new Error('MCP discovery page limit reached.');
  }

  async execute(name, args = {}) {
    const result = await this._send('tools/call', { name, arguments: args });
    if (result?.isError === true) {
      const error = new ToolExecutionError('MCP tool reported an error.');
      error.retryable = false;
      throw error;
    }
    if (result?.structuredContent !== undefined) return result.structuredContent;
    if (result && Object.hasOwn(result, 'output')) return result.output;
    if (!Array.isArray(result?.content)) throw new Error('Invalid MCP tool response.');
    return { content: result.content };
  }

  async toTools({ metadataForTool = null } = {}) {
    if (metadataForTool !== null && typeof metadataForTool !== 'function') throw new TypeError('Invalid MCP risk override.');
    const names = new Set();
    return (await this.listTools()).map(definition => {
      if (typeof definition.name !== 'string' || !definition.name) throw new Error('Invalid MCP tool name.');
      const name = definition.name.replace(/[^\w-]/g, '_');
      if (names.has(name)) throw new Error('MCP local tool names collide.');
      names.add(name);
      return new Tool({ name, description: definition.description || 'MCP Tool',
        parameters: definition.inputSchema || definition.input_schema || { type: 'object', properties: {} },
        outputSchema: definition.outputSchema || null,
        metadata: { sideEffectLevel: 'external_write', executionPolicy: 'require_approval',
          ...(metadataForTool ? metadataForTool(definition) : {}), retryabilityHint: 'never', tags: ['mcp'] },
        implementation: args => this.execute(definition.name, args) });
    });
  }

  close() {
    for (const pending of this._pending.values()) pending.reject(new Error('MCP client closed.'));
    this._pending.clear();
    this.ws?.close();
  }
}

module.exports = { MCPClient };
