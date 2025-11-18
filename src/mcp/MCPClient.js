// src/mcp/MCPClient.js
const WebSocket = require("ws");
const { Tool } = require("../tools/adapters/Tool");
const { RetryManager } = require("../utils/RetryManager");

class MCPClient {
  constructor({
    endpoint,
    apiKey = null,
    extraHeaders = {},
    retryManager = new RetryManager({ retries: 3 })
  }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.extraHeaders = extraHeaders;
    this.retryManager = retryManager;

    this.ws = null;
    this._pending = new Map();
    this._id = 0;
  }

  async _connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const headers = { ...this.extraHeaders };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    this.ws = new WebSocket(this.endpoint, { headers });

    await new Promise((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });

    this.ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()) } catch { return; }

      const resolver = this._pending.get(msg.id);
      if (!resolver) return;
      this._pending.delete(msg.id);

      if (msg.error) resolver.reject(new Error(msg.error.message || "MCP Error"));
      else resolver.resolve(msg.result);
    });
  }

  _send(method, params = {}) {
    return this.retryManager.execute(async () => {
      await this._connect();

      const id = ++this._id;
      const payload = { jsonrpc: "2.0", id, method, params };

      return new Promise((resolve, reject) => {
        this._pending.set(id, { resolve, reject });

        this.ws.send(JSON.stringify(payload), (err) => {
          if (err) reject(err);
        });
      });
    });
  }

  /** MCP standard: listTools */
  async listTools() {
    const res = await this._send("tools/list");
    return res.tools || [];
  }

  /** MCP standard: call a tool */
  async execute(toolName, args = {}) {
    const res = await this._send("tools/call", {
      toolName,
      arguments: args
    });

    return res.output;
  }

  /** Convert MCP → Tool[] (for Agent) */
  async toTools() {
    const discovered = await this.listTools();

    return discovered.map((t) => {
      return new Tool({
        name: t.name.replace(/[^\w-]/g, "_"), // sanitize
        description: t.description || "MCP Tool",
        parameters: t.inputSchema || { type: "object", properties: {} },
        implementation: async (args) => {
          return await this.execute(t.name, args);
        }
      });
    });
  }
}

module.exports = { MCPClient };