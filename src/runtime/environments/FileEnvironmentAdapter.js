const { BaseEnvironmentAdapter } = require('./BaseEnvironmentAdapter');

class FileEnvironmentAdapter extends BaseEnvironmentAdapter {
  constructor(options = {}) {
    super({ ...options, kind: 'file' });
  }
}

module.exports = { FileEnvironmentAdapter };
