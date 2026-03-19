const fs = require('fs');
const path = require('path');
const { ConformanceKit } = require('./ConformanceKit');

class InteropContractValidator {
  constructor({ conformanceKit = null } = {}) {
    this.conformanceKit =
      conformanceKit instanceof ConformanceKit
        ? conformanceKit
        : new ConformanceKit(conformanceKit || {});
  }

  validateFile(filePath, { type = 'manifest' } = {}) {
    const absolutePath = path.resolve(filePath);
    const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const result = this.conformanceKit.validateArtifact(payload, { type });

    return {
      filePath: absolutePath,
      type,
      ...result,
    };
  }

  validateFiles(entries = []) {
    const results = entries.map(entry => this.validateFile(entry.filePath, { type: entry.type }));

    return {
      total: results.length,
      passed: results.filter(result => result.valid).length,
      failed: results.filter(result => !result.valid).length,
      results,
    };
  }
}

module.exports = { InteropContractValidator };
