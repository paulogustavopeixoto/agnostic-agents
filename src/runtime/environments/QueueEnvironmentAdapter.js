const { BaseEnvironmentAdapter } = require('./BaseEnvironmentAdapter');

class QueueEnvironmentAdapter extends BaseEnvironmentAdapter {
  constructor(options = {}) {
    super({ ...options, kind: 'queue' });
  }
}

module.exports = { QueueEnvironmentAdapter };
