const { BaseEnvironmentAdapter } = require('./BaseEnvironmentAdapter');

class ShellEnvironmentAdapter extends BaseEnvironmentAdapter {
  constructor(options = {}) {
    super({ ...options, kind: 'shell' });
  }
}

module.exports = { ShellEnvironmentAdapter };
