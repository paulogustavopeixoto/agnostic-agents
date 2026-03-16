const { BaseEnvironmentAdapter } = require('./BaseEnvironmentAdapter');

class BrowserEnvironmentAdapter extends BaseEnvironmentAdapter {
  constructor(options = {}) {
    super({ ...options, kind: 'browser' });
  }
}

module.exports = { BrowserEnvironmentAdapter };
