// src/orchestrator/Flow.js

/**
 * A minimal Flow system that allows you to define methods with:
 *  - @start() => for the initial steps
 *  - @listen(otherMethod) => triggers when another method finishes
 * 
 * You can store global state in `this.state`.
 */
function start() {
    return function (target, propertyKey, descriptor) {
        if (!target._flowStarts) target._flowStarts = [];
        target._flowStarts.push(propertyKey);
        return descriptor;
    };
}
  
function listen(triggerMethodName) {
    return function (target, propertyKey, descriptor) {
        if (!target._flowListeners) target._flowListeners = [];
        target._flowListeners.push({
        trigger: triggerMethodName,
        listener: propertyKey,
        });
        return descriptor;
    };
}

class Flow {
    constructor() {
        this.state = {};
        this._methodOutputs = {};
    }

    /**
     * Kick off the flow by calling all methods decorated with @start()
     */
    async kickoff() {
        // find all @start() methods
        const startMethods = this._flowStarts || [];

        // run them in parallel or series:
        for (const m of startMethods) {
        await this._runMethod(m);
        }

        // done for now. In a real system, you'd keep track of triggers/listeners
        // and run them automatically once the triggers produce an output.
        // For a simpler approach, you might just do them sequentially or define more advanced logic.

        // return final output
        return this._methodOutputs;
    }

    async _runMethod(methodName, ...args) {
        if (typeof this[methodName] !== "function") {
        throw new Error(`Method ${methodName} not found on Flow class`);
        }
        const output = await this[methodName](...args);
        this._methodOutputs[methodName] = output;

        // Trigger any listeners waiting for methodName
        if (this._flowListeners) {
        const listeners = this._flowListeners.filter(
            (entry) => entry.trigger === methodName
        );
        for (const l of listeners) {
            await this._runMethod(l.listener, output);
        }
        }
        return output;
    }
}

// Export the decorators and base class
module.exports = {
Flow,
start,
listen,
};