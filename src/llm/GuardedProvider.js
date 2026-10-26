const { BaseProvider } = require('./BaseProvider');
const { AdapterCapabilityError, ToolPolicyError } = require('../errors');

const OPERATIONS = {
  generateText: 'generateText', generateToolResult: 'toolCalling',
  embedChunks: 'embeddings', analyzeImage: 'imageAnalysis', generateImage: 'imageGeneration',
  transcribeAudio: 'audioTranscription', generateAudio: 'audioGeneration',
  analyzeVideo: 'videoAnalysis', generateVideo: 'videoGeneration',
};

/** Apply a host egress decision to each provider operation, including embeddings. */
class GuardedProvider extends BaseProvider {
  constructor({ id, provider, authorize, capabilities, models = null, defaultModel = null } = {}) {
    if (typeof id !== 'string' || !id.trim() || !provider || typeof authorize !== 'function') {
      throw new TypeError('Invalid guarded provider.');
    }
    const declared = { ...(capabilities || provider.getCapabilities?.() || provider.capabilities ||
      { generateText: typeof provider.generateText === 'function' }) };
    if (models) for (const model of Object.values(models)) {
      for (const [capability, supported] of Object.entries(model || {})) if (supported === true) declared[capability] = true;
    }
    super({ capabilities: { generateText: false, ...declared } });
    this.id = id;
    this.provider = provider;
    this.authorize = authorize;
    if (models && (typeof models !== 'object' || !defaultModel || !Object.hasOwn(models, defaultModel) ||
        Object.values(models).some(model => !model || typeof model !== 'object' ||
          Object.values(model).some(value => typeof value !== 'boolean')))) throw new TypeError('Invalid model capability map.');
    this.models = models ? JSON.parse(JSON.stringify(models)) : null;
    this.defaultModel = defaultModel;
    for (const [operation, capability] of Object.entries(OPERATIONS)) {
      this[operation] = async (...args) => {
        if (!this.supports(capability) || typeof provider[operation] !== 'function') {
          throw new AdapterCapabilityError(`Provider does not support ${operation}.`);
        }
        const configIndex = operation === 'generateToolResult' ? 3 : 1;
        if (this.models) {
          const model = args[configIndex]?.model || this.defaultModel;
          if (!Object.hasOwn(this.models, model) || this.models[model][capability] !== true) {
            throw new AdapterCapabilityError('Selected model does not support the requested capability.');
          }
          args[configIndex] = { ...(args[configIndex] || {}), model };
        }
        if (await this.authorize({ providerId: id, operation, capability, args }) !== true) {
          throw new ToolPolicyError('Provider operation denied.');
        }
        return provider[operation](...args);
      };
    }
  }

  getModelCapabilities(model) {
    return this.models && Object.hasOwn(this.models, model) ? { ...this.models[model] } : null;
  }
}

module.exports = { GuardedProvider };
