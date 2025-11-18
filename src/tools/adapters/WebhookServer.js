// src/tools/adapters/WebhookServer.js
const express = require('express');

class WebhookServer {
  constructor({ port = 4000 }) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());

    this.routes = {}; // { path: handler }
  }

  registerRoute(path, handler) {
    this.routes[path] = handler;
    this.app.post(path, async (req, res) => {
      try {
        await handler(req.body);
        res.status(200).send('OK');
      } catch (err) {
        console.error(`[Webhook Error] ${path}:`, err);
        res.status(500).send('Error');
      }
    });
    console.log(`🔗 Webhook listening at POST ${path}`);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Webhook server running on http://localhost:${this.port}`);
    });
  }
}

module.exports = { WebhookServer };