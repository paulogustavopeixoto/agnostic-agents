const { PromptArtifact } = require('./PromptArtifact');

class PromptRegistry {
  constructor({ prompts = [] } = {}) {
    this.prompts = new Map();
    prompts.forEach(prompt => this.register(prompt));
  }

  register(prompt) {
    const artifact = prompt instanceof PromptArtifact ? prompt : new PromptArtifact(prompt || {});
    this.prompts.set(artifact.id, artifact);
    return artifact;
  }

  get(id) {
    return this.prompts.get(id) || null;
  }

  list() {
    return Array.from(this.prompts.values()).map(prompt => prompt.toJSON());
  }
}

module.exports = { PromptRegistry };
