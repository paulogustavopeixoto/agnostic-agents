const { BaseEnvironmentAdapter } = require('./BaseEnvironmentAdapter');

class ApiEnvironmentAdapter extends BaseEnvironmentAdapter {
  constructor(options = {}) {
    super({ ...options, kind: 'api' });
  }
}

module.exports = { ApiEnvironmentAdapter };
