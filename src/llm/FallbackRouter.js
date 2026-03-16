const { BaseProvider } = require('./BaseProvider');

const METHOD_CAPABILITY_MAP = {
  generateText: 'generateText',
  generateToolResult: 'toolCalling',
  analyzeImage: 'imageAnalysis',
  generateImage: 'imageGeneration',
  embedChunks: 'embeddings',
  transcribeAudio: 'audioTranscription',
  generateAudio: 'audioGeneration',
  analyzeVideo: 'videoAnalysis',
  generateVideo: 'videoGeneration',
};

class FallbackRouter extends BaseProvider {
  constructor({ providers = [], onFallback = null, onError = null } = {}) {
    super({
      capabilities: providers.reduce(
        (acc, provider) => {
          const caps = provider.getCapabilities ? provider.getCapabilities() : {};
          for (const [key, value] of Object.entries(caps)) {
            acc[key] = acc[key] || value;
          }
          return acc;
        },
        { generateText: providers.length > 0 }
      ),
    });

    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('FallbackRouter requires at least one provider.');
    }

    this.providers = providers;
    this.onFallback = onFallback;
    this.onError = onError;
  }

  async _execute(methodName, args) {
    const capability = METHOD_CAPABILITY_MAP[methodName];
    const eligibleProviders = this.providers.filter(provider =>
      capability === 'generateText'
        ? typeof provider.generateText === 'function'
        : provider.supports?.(capability)
    );

    if (!eligibleProviders.length) {
      throw this._unsupportedCapability(methodName);
    }

    let lastError = null;

    for (let index = 0; index < eligibleProviders.length; index += 1) {
      const provider = eligibleProviders[index];

      try {
        return await provider[methodName](...args);
      } catch (error) {
        lastError = error;
        if (typeof this.onError === 'function') {
          await this.onError({
            methodName,
            provider,
            error,
            providerIndex: index,
          });
        }

        if (index < eligibleProviders.length - 1 && typeof this.onFallback === 'function') {
          await this.onFallback({
            methodName,
            from: provider,
            to: eligibleProviders[index + 1],
            error,
          });
        }
      }
    }

    throw lastError;
  }

  async generateText(...args) {
    return this._execute('generateText', args);
  }

  async generateToolResult(...args) {
    return this._execute('generateToolResult', args);
  }

  async analyzeImage(...args) {
    return this._execute('analyzeImage', args);
  }

  async generateImage(...args) {
    return this._execute('generateImage', args);
  }

  async embedChunks(...args) {
    return this._execute('embedChunks', args);
  }

  async transcribeAudio(...args) {
    return this._execute('transcribeAudio', args);
  }

  async generateAudio(...args) {
    return this._execute('generateAudio', args);
  }

  async analyzeVideo(...args) {
    return this._execute('analyzeVideo', args);
  }

  async generateVideo(...args) {
    return this._execute('generateVideo', args);
  }
}

module.exports = { FallbackRouter };
