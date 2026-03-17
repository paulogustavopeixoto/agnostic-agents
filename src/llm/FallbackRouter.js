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
  constructor({ providers = [], onFallback = null, onError = null, routingStrategy = null, routingAdvisor = null } = {}) {
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

    this.providers = providers.map(entry => {
      if (entry?.provider) {
        return {
          provider: entry.provider,
          profile: {
            costTier: entry.profile?.costTier || 'medium',
            riskTier: entry.profile?.riskTier || 'medium',
            taskTypes: [...(entry.profile?.taskTypes || [])],
            labels: [...(entry.profile?.labels || [])],
          },
        };
      }

      return {
        provider: entry,
        profile: {
          costTier: 'medium',
          riskTier: 'medium',
          taskTypes: [],
          labels: [],
        },
      };
    });
    this.onFallback = onFallback;
    this.onError = onError;
    this.routingStrategy = routingStrategy;
    this.routingAdvisor = routingAdvisor;
  }

  _resolveRoute(methodName, args) {
    if (this.routingAdvisor?.rankProviders) {
      return this.routingAdvisor.rankProviders(this.providers, {
        methodName,
        args,
      });
    }

    if (typeof this.routingStrategy === 'function') {
      return this.routingStrategy({
        methodName,
        args,
        providers: this.providers,
      });
    }

    if (methodName !== 'generateText') {
      return this.providers;
    }

    const [, config = {}] = args;
    const route = config.route || {};
    const routeHints = route.hints || {};
    const costPreference = routeHints.cost || route.cost || null;
    const riskPreference = routeHints.risk || route.risk || null;
    const taskType = routeHints.taskType || route.taskType || null;

    const scoreProvider = entry => {
      let score = 0;

      if (costPreference && entry.profile.costTier === costPreference) {
        score += 3;
      }

      if (riskPreference && entry.profile.riskTier === riskPreference) {
        score += 3;
      }

      if (taskType && entry.profile.taskTypes.includes(taskType)) {
        score += 4;
      }

      return score;
    };

    return [...this.providers].sort((a, b) => scoreProvider(b) - scoreProvider(a));
  }

  async _execute(methodName, args) {
    const capability = METHOD_CAPABILITY_MAP[methodName];
    const routedProviders = this._resolveRoute(methodName, args);
    const eligibleProviders = routedProviders.filter(({ provider }) =>
      capability === 'generateText'
        ? typeof provider.generateText === 'function'
        : provider.supports?.(capability)
    );

    if (!eligibleProviders.length) {
      throw this._unsupportedCapability(methodName);
    }

    let lastError = null;

    for (let index = 0; index < eligibleProviders.length; index += 1) {
      const { provider, profile } = eligibleProviders[index];

      try {
        const result = await provider[methodName](...args);
        if (this.routingAdvisor?.recordOutcome) {
          const [, config = {}] = args;
          const route = config.route || {};
          const routeHints = route.hints || {};
          this.routingAdvisor.recordOutcome({
            providerLabel: profile.labels?.[0] || provider.name || provider.constructor?.name || `provider-${index}`,
            success: true,
            methodName,
            taskType: routeHints.taskType || route.taskType || null,
            confidence: result?.routing?.confidence || null,
          });
        }
        if (methodName === 'generateText' && result && typeof result === 'object') {
          result.routing = {
            selectedProfile: profile,
            selectedProviderIndex: index,
          };
        }
        return result;
      } catch (error) {
        lastError = error;
        if (this.routingAdvisor?.recordOutcome) {
          const [, config = {}] = args;
          const route = config.route || {};
          const routeHints = route.hints || {};
          this.routingAdvisor.recordOutcome({
            providerLabel: profile.labels?.[0] || provider.name || provider.constructor?.name || `provider-${index}`,
            success: false,
            methodName,
            taskType: routeHints.taskType || route.taskType || null,
            error: error.message || String(error),
          });
        }
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
            to: eligibleProviders[index + 1].provider,
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
