class PromptArtifact {
  constructor({ id, role = 'system', content = '', version = '1.0.0', metadata = {} } = {}) {
    if (!id) {
      throw new Error('PromptArtifact requires id.');
    }
    this.id = id;
    this.role = role;
    this.content = content;
    this.version = version;
    this.metadata = metadata;
  }

  toJSON() {
    return {
      kind: 'agnostic-agents/prompt-artifact',
      version: this.version,
      id: this.id,
      role: this.role,
      content: this.content,
      metadata: this.metadata,
    };
  }

  static fromJSON(payload = {}) {
    return new PromptArtifact(payload);
  }
}

module.exports = { PromptArtifact };
