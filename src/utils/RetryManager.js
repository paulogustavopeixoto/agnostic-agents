// src/utils/RetryManager.js
class RetryManager {
    constructor({ retries = 3, baseDelay = 1000, maxDelay = 10000 } = {}) {
      this.retries = retries;
      this.baseDelay = baseDelay;
      this.maxDelay = maxDelay;
    }
  
    async execute(fn, ...args) {
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          if (attempt === this.retries) throw error;
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    async executeWithPolicy(fn, { policy = null, context = {}, onEscalate = null } = {}, ...args) {
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          const decision = policy?.onFailure
            ? policy.onFailure(error, {
                attempt,
                retries: this.retries,
                context,
              })
            : { action: attempt === this.retries ? 'fail' : 'retry', reason: null };

          if (decision?.action === 'escalate') {
            if (typeof onEscalate === 'function') {
              return onEscalate(error, {
                attempt,
                retries: this.retries,
                context,
                decision,
              });
            }
            throw error;
          }

          if (decision?.action !== 'retry' || attempt === this.retries) {
            throw error;
          }

          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  
  module.exports = { RetryManager };
