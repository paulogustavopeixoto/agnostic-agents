const { RetryManager } = require('../utils/RetryManager');
const { ContextWindow } = require('../runtime/ContextWindow');
const Ajv = require('ajv');
const { randomUUID } = require('crypto');
const { defaultRunLock } = require('../runtime/RunLock');
const { RunBudget } = require('../runtime/RunBudget');
const { SchemaSafety } = require('../runtime/SchemaSafety');
const { ToolValidator } = require('../utils/ToolValidator');
const { invokeWithDeadline } = require('../runtime/InvocationControl');
const { repairJsonOutput } = require('../utils');
const { MissingInfoResolver } = require('./MissingInfoResolver');
const { Run } = require('../runtime/Run');
const { EvidenceGraph } = require('../runtime/EvidenceGraph');
const { ToolPolicy } = require('../runtime/ToolPolicy');
const { ConfidencePolicy } = require('../runtime/ConfidencePolicy');
const { AdaptiveRetryPolicy } = require('../runtime/AdaptiveRetryPolicy');
const { EventBus } = require('../runtime/EventBus');
const { ConsoleDebugSink } = require('../runtime/ConsoleDebugSink');
const { RunInspector } = require('../runtime/RunInspector');
const { ApprovalInbox } = require('../runtime/ApprovalInbox');
const { GovernanceHooks } = require('../runtime/GovernanceHooks');
const { ExtensionHost } = require('../runtime/ExtensionHost');
const { DistributedRunEnvelope } = require('../runtime/DistributedRunEnvelope');
const { ExecutionIdentity } = require('../runtime/ExecutionIdentity');
const { BaseRunStore } = require('../runtime/stores/BaseRunStore');
const {
  AdapterCapabilityError,
  InvalidToolCallError,
  ToolExecutionError,
  ToolNotFoundError,
  ToolPolicyError,
  RunNotFoundError,
  RunPausedError,
  RunCancelledError,
} = require('../errors');

class Agent {
  /**
   * @param {object} adapter - Provider adapter with generateText/analyzeImage/etc.
   * @param {object} options
   * @param {Array|object} [options.tools] - Tool array, ToolRegistry instance, or { tools, triggers }
   * @param {object|null} [options.memory]
   * @param {object} [options.defaultConfig]
   * @param {string} [options.description]
   * @param {object|null} [options.rag]
   * @param {RetryManager} [options.retryManager]
   * @param {object|null} [options.mcpClient]
   * @param {Function|null} [options.askUser]
   * @param {object|null} [options.runStore]
   * @param {ToolPolicy|object|null} [options.toolPolicy]
   * @param {object|null} [options.authContext]
   * @param {Function|null} [options.resolveToolAuth]
   * @param {object|null} [options.executionIdentity]
   * @param {Function|null} [options.onEvent]
   * @param {EventBus|object|null} [options.eventBus]
   * @param {boolean} [options.debug]
   */
  constructor(
    adapter,
    {
      tools = [],
      memory = null,
      defaultConfig = {},
      description = '',
      rag = null,
      retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }),
      mcpClient = null,
      askUser = null,
      runStore = null,
      toolPolicy = null,
      authContext = null,
      resolveToolAuth = null,
      executionIdentity = null,
      confidencePolicy = null,
      adaptiveRetryPolicy = null,
      onEvent = null,
      eventBus = null,
      debug = false,
      verifier = null,
      approvalInbox = null,
      governanceHooks = null,
      extensionHost = null,
      contextWindow = null,
      authorizeModelCall = null,
      executionLimits = {},
      outputSchema,
      authorizeResume = null,
      approvalTtlMs = 5 * 60 * 1000,
      runLock = defaultRunLock,
      lockNamespace = 'agent',
      approvalSigner = null,
      budget = null,
      schemaSafety = {},
      invocationTimeoutMs = null,
    } = {}
  ) {
    this.extensionHost =
      extensionHost instanceof ExtensionHost
        ? extensionHost
        : extensionHost
          ? new ExtensionHost({ extensions: Array.isArray(extensionHost) ? extensionHost : [extensionHost] })
          : null;
    this.adapter = adapter;
    if (typeof runLock?.withLock !== 'function' || typeof lockNamespace !== 'string' ||
        (approvalSigner && (typeof approvalSigner.sign !== 'function' || typeof approvalSigner.verify !== 'function'))) {
      throw new TypeError('Invalid run coordination configuration.');
    }
    this.runLock = runLock;
    if (invocationTimeoutMs !== null && (!Number.isSafeInteger(invocationTimeoutMs) ||
        invocationTimeoutMs < 1 || invocationTimeoutMs > 2147483647)) throw new TypeError('Invalid invocation timeout.');
    this.invocationTimeoutMs = invocationTimeoutMs;
    this.lockNamespace = lockNamespace;
    this.approvalSigner = approvalSigner;
    this.budget = budget instanceof RunBudget ? budget : budget ? new RunBudget(budget) : null;
    this.schemaSafety = schemaSafety instanceof SchemaSafety ? schemaSafety : new SchemaSafety(schemaSafety);
    if (outputSchema !== undefined) this.schemaSafety.assertSchema(outputSchema);
    this.contextWindow = contextWindow instanceof ContextWindow ? contextWindow :
      contextWindow ? new ContextWindow(contextWindow) : null;
    if (authorizeModelCall !== null && typeof authorizeModelCall !== 'function') {
      throw new TypeError('authorizeModelCall must be a function.');
    }
    this.authorizeModelCall = authorizeModelCall;
    if ((authorizeResume !== null && typeof authorizeResume !== 'function') ||
        !Number.isSafeInteger(approvalTtlMs) || approvalTtlMs < 1) {
      throw new TypeError('Invalid approval authorization configuration.');
    }
    this.authorizeResume = authorizeResume;
    this.approvalTtlMs = approvalTtlMs;
    this.validateOutput = outputSchema === undefined ? null : new Ajv({ strict: false }).compile(outputSchema);
    this.executionLimits = { modelCalls: 32, toolCalls: 64, ...executionLimits };
    for (const value of Object.values(this.executionLimits)) {
      if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Execution limits must be positive integers.');
    }
    this.toolRegistry = null;
    this.tools = this._normalizeTools(tools);
    for (const tool of this.tools) {
      this.schemaSafety.assertSchema(tool.parameters || { type: 'object' });
      if (tool.outputSchema != null) this.schemaSafety.assertSchema(tool.outputSchema);
    }
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
    this.rag = rag;
    this.retryManager = retryManager;
    this.mcpClient = mcpClient;
    this.runStore = runStore ? BaseRunStore.assert(runStore, 'Agent runStore') : null;
    this.toolPolicy = this.extensionHost
      ? this.extensionHost.extendToolPolicy(toolPolicy)
      : toolPolicy instanceof ToolPolicy
        ? toolPolicy
        : new ToolPolicy(toolPolicy || {});
    this.authContext = authContext && typeof authContext === 'object' ? { ...authContext } : null;
    this.resolveToolAuth = typeof resolveToolAuth === 'function' ? resolveToolAuth : null;
    this.executionIdentity = ExecutionIdentity.normalize(executionIdentity);
    this.confidencePolicy =
      confidencePolicy instanceof ConfidencePolicy
        ? confidencePolicy
        : confidencePolicy
          ? new ConfidencePolicy(confidencePolicy)
          : null;
    this.adaptiveRetryPolicy =
      adaptiveRetryPolicy instanceof AdaptiveRetryPolicy
        ? adaptiveRetryPolicy
        : adaptiveRetryPolicy
          ? new AdaptiveRetryPolicy(adaptiveRetryPolicy)
          : null;
    this.onEvent = onEvent;
    this.eventBus = this.extensionHost
      ? this.extensionHost.extendEventBus(eventBus)
      : eventBus instanceof EventBus
        ? eventBus
        : new EventBus(eventBus || {});
    if (debug) {
      this.eventBus.addSink(new ConsoleDebugSink());
    }
    this.debug = debug;
    this.verifier = verifier;
    this.approvalInbox = approvalInbox instanceof ApprovalInbox ? approvalInbox : approvalInbox || null;
    this.governanceHooks = this.extensionHost
      ? this.extensionHost.extendGovernanceHooks(governanceHooks)
      : governanceHooks instanceof GovernanceHooks
        ? governanceHooks
        : governanceHooks
          ? new GovernanceHooks(governanceHooks)
          : null;
    this.resolver = new MissingInfoResolver({
      memory: this.memory,
      rag: this.rag,
      askUser,
      tools: this.tools,
    });
    this.resolver.validator = new ToolValidator({ schemaSafety: this.schemaSafety });
  }

  _normalizeTools(tools) {
    if (tools?.listTools && typeof tools.listTools === 'function') {
      this.toolRegistry = tools;
      return tools.listTools();
    }

    if (Array.isArray(tools)) {
      return [...tools];
    }

    if (tools?.tools && Array.isArray(tools.tools)) {
      return [...tools.tools];
    }

    throw new Error(
      '[Agent] Invalid tools input. Must be ToolRegistry instance, array, or { tools, triggers } object.'
    );
  }

  async _persistRun(run) {
    if (!this.runStore?.saveRun) {
      return run;
    }

    return this.runStore.saveRun(run);
  }

  async _reserveExecution(run, kind) {
    const counts = run.state.executionCounts || {};
    const used = counts[kind] ?? 0;
    if (!Number.isSafeInteger(used) || used < 0 || used >= this.executionLimits[kind]) {
      throw new ToolPolicyError(`Run ${kind} limit reached.`);
    }
    run.state.executionCounts = { ...counts, [kind]: used + 1 };
    await this._persistRun(run);
  }

  _checkSignal(signal) {
    if (signal?.aborted) throw new RunCancelledError('Run cancelled by caller.');
  }

  async _withBudget(run, operation, input, invoke) {
    const step = run && ['memory_read', 'memory_write', 'argument_resolution'].includes(operation)
      ? this._startStep(run, operation, {}) : null;
    if (step) await this._emitEvent(run, `${operation}_started`, { stepId: step.id });
    let reservation;
    try {
      if (this.budget && run) {
        reservation = await this.budget.reserve(run, { operation, input });
        await this._persistRun(run);
      }
      const result = await RetryManager.withoutRetries(invoke);
      if (reservation) {
        this.budget.settle(run, reservation, operation === 'model' ? {
          tokens: result?.usage?.total, costMicros: result?.costMicros,
        } : {});
        await this._persistRun(run);
      }
      if (step) {
        this._completeStep(run, step.id, { recorded: true });
        await this._emitEvent(run, `${operation}_completed`, { stepId: step.id });
      }
      return result;
    } catch (error) {
      if (reservation) {
        if (reservation.status !== 'breached') reservation.status = 'uncertain';
        await this._persistRun(run);
      }
      if (step) {
        this._failStep(run, step.id, error);
        await this._emitEvent(run, `${operation}_failed`, { stepId: step.id });
      }
      throw error;
    }
  }

  _canRetryTool(tool) {
    const metadata = tool?.metadata || {};
    if (metadata.retryabilityHint === 'never') return false;
    if (['external_write', 'system_write', 'destructive'].includes(metadata.sideEffectLevel)) {
      return metadata.idempotencyHint === 'idempotent' && metadata.retryabilityHint === 'retryable';
    }
    return true;
  }

  async _emitEvent(run, type, payload = {}) {
    const event = {
      id: `${run.id}:${run.events.length + 1}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    run.addEvent(event);

    if (typeof this.onEvent === 'function') {
      await this.onEvent(event, run);
    }

    if (this.governanceHooks) {
      await this.governanceHooks.dispatch(type, payload, {
        run,
        agent: this,
        event,
      });
    }

    await this.eventBus.emit(event, run);

    await this._persistRun(run);
    return event;
  }

  async _checkpointRun(run, label, payload = {}) {
    run.addCheckpoint({
      id: `${run.id}:checkpoint:${run.checkpoints.length + 1}`,
      label,
      timestamp: new Date().toISOString(),
      status: run.status,
      payload,
      snapshot: run.createCheckpointSnapshot(),
      messageCount: run.messages.length,
      toolCallCount: run.toolCalls.length,
      toolResultCount: run.toolResults.length,
    });
    await this._persistRun(run);
  }

  async _linkParentRun(run) {
    const parentRunId = run.metadata?.lineage?.parentRunId;
    if (!parentRunId || !this.runStore?.getRun || !this.runStore?.saveRun) {
      return;
    }

    const storedParent = await this.runStore.getRun(parentRunId);
    if (!storedParent) {
      return;
    }

    const parentRun = storedParent instanceof Run ? storedParent : Run.fromJSON(storedParent);
    parentRun.registerChildRun(run.id);
    await this.runStore.saveRun(parentRun);
  }

  async _pauseRun(run, reason, payload = {}) {
    run.pendingPause = {
      reason,
      ...payload,
    };
    run.setStatus('paused');
    await this._emitEvent(run, 'run_paused', run.pendingPause);
    await this._checkpointRun(run, 'run_paused', run.pendingPause);
    await this._persistRun(run);
    return run;
  }

  async _cancelRun(run, reason = 'Cancelled manually.', payload = {}) {
    run.pendingPause = null;
    run.pendingApproval = null;
    run.setStatus('cancelled');
    await this._emitEvent(run, 'run_cancelled', { reason, ...payload });
    await this._checkpointRun(run, 'run_cancelled', { reason, ...payload });
    await this._persistRun(run);
    return run;
  }

  async _maybePause(run, finalConfig = {}, stage, payload = {}) {
    const pauseOn = finalConfig.pauseOn || {};
    const shouldPause =
      pauseOn === stage ||
      (Array.isArray(pauseOn) && pauseOn.includes(stage)) ||
      (typeof pauseOn === 'function' && (await pauseOn({ stage, run, payload })) === true) ||
      (pauseOn && typeof pauseOn === 'object' && pauseOn[stage]);

    if (!shouldPause) {
      return null;
    }

    const reason =
      typeof shouldPause === 'object' && shouldPause.reason
        ? shouldPause.reason
        : `Paused at ${stage}.`;

    return this._pauseRun(run, reason, { stage, payload });
  }

  _startStep(run, type, payload = {}) {
    return run.addStep({
      id: `${run.id}:step:${run.steps.length + 1}`,
      type,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload,
      output: null,
      error: null,
    });
  }

  _completeStep(run, stepId, output = null) {
    return run.updateStep(stepId, {
      status: 'completed',
      output,
    });
  }

  _failStep(run, stepId, error) {
    return run.updateStep(stepId, {
      status: 'failed',
      error: {
        name: error.name || 'Error',
        message: error.message || String(error),
      },
    });
  }

  async _retrieveMemoryContext(userMessage) {
    if (!this.memory) {
      return '';
    }

    const facts = [];

    if (this.memory.entities && typeof this.memory.getEntity === 'function') {
      for (const key of Object.keys(this.memory.entities)) {
        const value = this.memory.getEntity(key);
        if (value) {
          facts.push(`${key}: ${value}`);
        }
      }
    }

    if (typeof this.memory.listWorkingMemory === 'function') {
      for (const entry of this.memory.listWorkingMemory()) {
        facts.push(`Working memory ${entry.key}: ${entry.value}`);
      }
    }

    if (typeof this.memory.listPolicies === 'function') {
      for (const entry of this.memory.listPolicies()) {
        facts.push(`Policy ${entry.key}: ${entry.value}`);
      }
    }

    if (this.memory.vectorStore && typeof this.memory.searchSemanticMemory === 'function') {
      const semantic = await this.memory.searchSemanticMemory(userMessage);
      if (semantic) {
        facts.push(`Related info: ${semantic}`);
      }
    }
    if (typeof this.memory.searchEpisodicMemory === 'function') {
      for (const episode of await this.memory.searchEpisodicMemory(userMessage)) {
        facts.push(`Episode ${episode.id} (run ${episode.runId || 'unknown'}): ${JSON.stringify(episode.content)}`);
      }
    }

    return facts.length ? `Here is what I remember:\n${facts.join('\n')}\n` : '';
  }

  _getEvidenceGraph(run) {
    if (!run.state.evidenceGraph) {
      run.state.evidenceGraph = new EvidenceGraph();
    } else if (!(run.state.evidenceGraph instanceof EvidenceGraph)) {
      run.state.evidenceGraph = new EvidenceGraph(run.state.evidenceGraph);
    }

    return run.state.evidenceGraph;
  }

  _getToolConfidence(run) {
    if (!run.state.toolConfidence) {
      run.state.toolConfidence = [];
    }

    return run.state.toolConfidence;
  }

  async _scoreToolCallConfidence(run, tool, toolCall) {
    const schema = tool?.parameters || {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    const args = toolCall.arguments || {};
    const providedRequired = required.filter(
      key => args[key] !== undefined && args[key] !== null && args[key] !== ''
    );
    const completeness = required.length ? providedRequired.length / required.length : 1;
    const score = Number(
      Math.max(
        0,
        Math.min(
          1,
          completeness * 0.85 +
            (tool?.metadata?.verificationPolicy === 'never' ? 0.05 : 0) +
            (Array.isArray(tool?.metadata?.examples) && tool.metadata.examples.length ? 0.1 : 0)
        )
      ).toFixed(3)
    );

    const assessment = {
      toolName: tool.name,
      score,
      completeness: Number(completeness.toFixed(3)),
      requiredArguments: required,
      providedRequiredArguments: providedRequired,
    };

    this._getToolConfidence(run).push(assessment);
    await this._emitEvent(run, 'tool_confidence_scored', assessment);
    return assessment;
  }

  _assessRun(run) {
    const evidenceSummary = this._getEvidenceGraph(run).summarize();
    const toolConfidence = this._getToolConfidence(run);
    const averageToolConfidence = toolConfidence.length
      ? toolConfidence.reduce((sum, entry) => sum + (entry.score || 0), 0) / toolConfidence.length
      : 1;
    const selfVerification = run.state.selfVerification || null;

    let uncertainty = 0.15;
    if (evidenceSummary.nodes === 0) {
      uncertainty += 0.2;
    }
    if (evidenceSummary.conflicts > 0) {
      uncertainty += Math.min(0.35, evidenceSummary.conflicts * 0.15);
    }
    if (averageToolConfidence < 0.75) {
      uncertainty += 0.15;
    }
    if (selfVerification?.action === 'deny' || selfVerification?.action === 'require_approval') {
      uncertainty += 0.2;
    }

    const assessment = {
      uncertainty: Number(Math.max(0, Math.min(1, uncertainty)).toFixed(3)),
      confidence: Number((1 - Math.max(0, Math.min(1, uncertainty))).toFixed(3)),
      evidenceConflicts: evidenceSummary.conflicts || 0,
      averageToolConfidence: Number(averageToolConfidence.toFixed(3)),
      verification: selfVerification
        ? {
            action: selfVerification.action || selfVerification.status || null,
            reason: selfVerification.reason || null,
          }
        : null,
    };

    run.state.assessment = assessment;
    return assessment;
  }

  async _applyToolConfidencePolicy(run, tool, toolCall, toolAssessment, finalConfig = {}) {
    if (!this.confidencePolicy?.evaluateTool) {
      return { action: 'allow', reason: null, source: 'disabled' };
    }

    const decision = this.confidencePolicy.evaluateTool(tool, toolAssessment, {
      run,
      config: finalConfig,
      toolCall,
    }) || { action: 'allow', reason: null, source: 'confidence_policy' };

    run.state.policyDecisions = run.state.policyDecisions || [];
    run.state.policyDecisions.push({
      toolName: tool.name,
      stage: 'confidence',
      decision,
    });
    await this._emitEvent(run, 'confidence_policy_decision', {
      toolName: tool.name,
      stage: 'tool',
      decision,
      assessment: toolAssessment,
    });

    return decision;
  }

  async _applyRunConfidencePolicy(run, assessment, finalConfig = {}) {
    if (!this.confidencePolicy?.evaluateRun) {
      return { action: 'allow', reason: null, source: 'disabled' };
    }

    const decision = this.confidencePolicy.evaluateRun(run, assessment, {
      run,
      config: finalConfig,
    }) || { action: 'allow', reason: null, source: 'confidence_policy' };

    run.state.policyDecisions = run.state.policyDecisions || [];
    run.state.policyDecisions.push({
      toolName: null,
      stage: 'run_confidence',
      decision,
    });
    await this._emitEvent(run, 'confidence_policy_decision', {
      toolName: null,
      stage: 'run',
      decision,
      assessment,
    });

    if (decision.action === 'pause') {
      return this._pauseRun(run, decision.reason || 'Run paused for confidence review.', {
        stage: 'confidence_review',
        source: 'confidence_policy',
        assessment,
      });
    }

    return decision;
  }

  _outputProposesNewAction(run) {
    const output = String(run.output || '').toLowerCase();
    const toolNames = this.tools.map(tool => tool.name.toLowerCase());
    const actionVerbs = ['send', 'call', 'execute', 'delete', 'write', 'update', 'message', 'email', 'notify'];

    if (run.toolResults?.length || run.pendingApproval) {
      return false;
    }

    const mentionsTool = toolNames.some(name => output.includes(name));
    const mentionsActionVerb = actionVerbs.some(verb => output.includes(`${verb} `) || output.includes(`will ${verb}`));

    return mentionsTool || mentionsActionVerb;
  }

  async _selfVerifyRunOutput(run, finalConfig = {}) {
    if (!finalConfig.selfVerify || !this.verifier) {
      return null;
    }

    const step = this._startStep(run, 'self_verification', {
      output: run.output,
    });
    await this._emitEvent(run, 'self_verification_started', { output: run.output });

    try {
      const startedAt = Date.now();
      const verdict = await this._withBudget(run, 'verifier', { stage: 'final_output' }, () => this._invokeVerifier(
        {
          name: 'final_response',
          description: 'Validate the final agent response before completion.',
          metadata: {
            verificationPolicy: 'require_verifier',
            sideEffectLevel: 'none',
          },
        },
        {
          output: run.output,
          input: run.input,
          retrieval: run.state.retrieval || null,
          toolResults: run.toolResults || [],
        },
        { run, config: finalConfig, stage: 'self_verification' }
      ));
      const normalizedVerdict = verdict || { action: 'allow', reason: null };
      if (
        normalizedVerdict.action === 'require_approval' &&
        !this._outputProposesNewAction(run)
      ) {
        normalizedVerdict.action = 'allow';
        normalizedVerdict.reason =
          'Final output is analytical only and does not propose a new external action.';
      }
      run.recordTiming('verifierMs', Date.now() - startedAt);
      run.state.selfVerification = normalizedVerdict;
      this._completeStep(run, step.id, run.state.selfVerification);
      await this._emitEvent(run, 'self_verification_completed', {
        verdict: run.state.selfVerification,
      });
      await this._checkpointRun(run, 'self_verification_completed', {
        verdict: run.state.selfVerification,
      });
      return run.state.selfVerification;
    } catch (error) {
      this._failStep(run, step.id, error);
      await this._emitEvent(run, 'self_verification_failed', {
        message: error.message || String(error),
      });
      throw error;
    }
  }

  async _getRagContext(userMessage, config = {}, runtime = {}) {
    const hasStructuredSearch = typeof this.rag?.searchWithProvenance === 'function';
    const hasPlainSearch = typeof this.rag?.search === 'function';

    if (!this.rag || config.useRag === false || (!hasStructuredSearch && !hasPlainSearch)) {
      return '';
    }

    const { run } = runtime;

    try {
      if (run) {
        const startedAt = Date.now();
        await this._emitEvent(run, 'retrieval_started', { query: userMessage });
        run.metrics.debug.lastRetrievalQuery = userMessage;
        run.metrics.debug.lastRetrievalStartedAt = new Date(startedAt).toISOString();
      }

      const retrieval = await this.retryManager.execute(() => this._withBudget(run, 'retrieval', { query: userMessage }, () =>
        typeof this.rag.searchWithProvenance === 'function'
          ? this.rag.searchWithProvenance(userMessage, config.ragOptions || {})
          : this.rag.search(userMessage, config.ragOptions || {})
      ));
      const matches = Array.isArray(retrieval)
        ? retrieval.map(text => ({ text, score: null, metadata: {} }))
        : retrieval.matches || [];
      const contextLines = matches.map(match => match.text).filter(Boolean);

      if (contextLines.length === 0) {
        if (run) {
          run.state.retrieval = {
            query: userMessage,
            matches: [],
          };
          this._getEvidenceGraph(run).addNode({
            id: `${run.id}:evidence:query`,
            type: 'query',
            label: userMessage,
          });
          await this._emitEvent(run, 'retrieval_completed', { query: userMessage, matches: [] });
        }

        return '';
      }

      if (run) {
        const endedAt = Date.now();
        run.state.retrieval = {
          query: userMessage,
          matches,
        };
        const evidenceGraph = this._getEvidenceGraph(run);
        const queryNodeId = `${run.id}:evidence:query`;
        evidenceGraph.addNode({ id: queryNodeId, type: 'query', label: userMessage });
        matches.forEach((match, index) => {
          const nodeId = `${run.id}:evidence:retrieval:${index + 1}`;
          evidenceGraph.addNode({
            id: nodeId,
            type: 'retrieval',
            label: match.text,
            source: match.metadata?.source || match.id || null,
            score: match.score ?? null,
          });
          evidenceGraph.addEdge({ from: queryNodeId, to: nodeId, type: 'supports' });
        });
        run.recordTiming('retrievalMs', endedAt - new Date(run.events[run.events.length - 1]?.timestamp || endedAt).getTime());
        await this._emitEvent(run, 'retrieval_completed', { query: userMessage, matches });
      }

      const citations = matches
        .map((match, index) => {
          const source = match.metadata?.source || match.metadata?.documentId || match.id || `source-${index + 1}`;
          const score = typeof match.score === 'number' ? ` (score: ${match.score.toFixed(3)})` : '';
          return `[${index + 1}] ${source}${score}`;
        })
        .join('\n');

      return `Retrieved context:\n${contextLines.join('\n')}\n\nSources:\n${citations}\n`;
    } catch (error) {
      if (error?.retryable === false) throw error;
      if (run) {
        run.state.retrieval = {
          query: userMessage,
          matches: [],
          error: error.message || String(error),
        };
        await this._emitEvent(run, 'retrieval_completed', {
          query: userMessage,
          matches: [],
          error: error.message || String(error),
        });
      }

      return '';
    }
  }

  async _buildSystemPrompt(userPrompt = '', config = {}, runtime = {}) {
    const memoryContext = this.memory ? await this._withBudget(runtime.run, 'memory_read', { query: userPrompt },
      () => this._retrieveMemoryContext(userPrompt)) : '';
    const ragContext = await this._getRagContext(userPrompt, config, runtime);
    const now = new Date().toUTCString();
    const system = `${this.description || ''}\nCurrent date and time is: ${now}\n`.trim();
    const conversationContext = this.memory?.getContext?.() || '';
    const context = `${conversationContext}${conversationContext && (memoryContext || ragContext) ? '\n' : ''}${memoryContext}${ragContext}`.trim();

    return {
      system,
      context,
      user: userPrompt || '',
    };
  }

  _promptObjectToMessages(promptObject) {
    const messages = [];

    if (promptObject.system) {
      messages.push({ role: 'system', content: promptObject.system });
    }

    if (promptObject.context) {
      messages.push({ role: 'user', content: promptObject.context });
    }

    if (promptObject.user) {
      messages.push({ role: 'user', content: promptObject.user });
    }

    return messages;
  }

  registerTools(tools) {
    const nextTools =
      tools?.listTools && typeof tools.listTools === 'function'
        ? tools.listTools()
        : Array.isArray(tools)
          ? tools
          : [tools];

    for (const tool of nextTools) {
      this.schemaSafety.assertSchema(tool.parameters || { type: 'object' });
      if (tool.outputSchema != null) this.schemaSafety.assertSchema(tool.outputSchema);
    }
    this.tools.push(...nextTools);
    this.resolver.tools = this.tools;
  }

  async sendMessage(userMessage, config = {}) {
    const run = await this.run(userMessage, config);

    if (run.status === 'waiting_for_approval' || run.status === 'paused') {
      return run;
    }

    return run.output;
  }

  async run(userMessage, config = {}) {
    const runId = config.runId || randomUUID();
    return this.runLock.withLock(this._lockKey(runId), () => this._run(userMessage, { ...config, runId }));
  }

  async runTool(toolName, args = {}, config = {}) {
    const runId = config.runId || randomUUID();
    return this.runLock.withLock(this._lockKey(runId), async () => {
      if (this.runStore?.getRun && await this.runStore.getRun(runId)) throw new ToolPolicyError('Run ID already exists.');
      const run = new Run({ id: runId, input: { toolName, args }, metadata: {
        ...config.metadata, executionMode: 'tool', executionIdentity: this._resolveExecutionIdentity(config),
      } });
      run.setStatus('running');
      await this._persistRun(run);
      try {
        this._checkSignal(config.signal);
        const toolCall = { id: randomUUID(), name: toolName, arguments: args };
        this._validateToolCall(toolCall);
        let gate = await this._gateToolCall(run, toolCall, config);
        if (gate.status !== 'waiting_for_approval') {
          const original = JSON.stringify(toolCall.arguments);
          toolCall.arguments = await this._withBudget(run, 'argument_resolution', { toolName },
            () => this.resolver.resolve(this.tools.find(tool => tool.name === toolName), toolCall.arguments));
          if (JSON.stringify(toolCall.arguments) !== original) gate = await this._gateToolCall(run, toolCall, config);
        }
        if (gate.status === 'waiting_for_approval') return run;
        const execute = () => this._handleToolCall(toolCall, { run, signal: config.signal, frozenArgs: true });
        const output = this._canRetryTool(this.tools.find(tool => tool.name === toolName))
          ? await this.retryManager.execute(execute) : await execute();
        this._appendToolMessages(run, toolCall, output);
        if (output?.__adaptiveEscalated) return run;
        return await this._finishToolRun(run, output);
      } catch (error) { return this._failRun(run, error); }
    });
  }

  _validateFinalOutput(run) {
    if (!this.validateOutput) return;
    let output = run.output;
    try {
      this.schemaSafety.assertValue(output);
      if (typeof output === 'string') output = JSON.parse(output);
      this.schemaSafety.assertValue(output);
      if (!this.validateOutput(output)) throw new Error('Invalid output.');
    } catch {
      run.state.outputValidation = { valid: false };
      run.output = null;
      throw new InvalidToolCallError('Agent output schema validation failed.');
    }
    run.output = output;
    run.state.outputValidation = { valid: true };
  }

  async _finishToolRun(run, output) {
    run.output = output;
    this._validateFinalOutput(run);
    run.state.resultStatus = 'completed';
    run.setStatus('completed');
    await this._emitEvent(run, 'run_completed', { output: run.output });
    await this._checkpointRun(run, 'run_completed');
    return run;
  }

  _lockKey(runId) {
    return JSON.stringify([this.lockNamespace, this.runStore?.prefix || '', runId]);
  }

  async _run(userMessage, config = {}) {
    if (this.runStore?.getRun && await this.runStore.getRun(config.runId)) {
      throw new ToolPolicyError('Run ID already exists; resume or branch explicitly.');
    }
    if (!this.adapter?.generateText) {
      throw new AdapterCapabilityError('Agent requires an adapter with generateText().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const executionIdentity = this._resolveExecutionIdentity(finalConfig);
    const distributedAuthScope = this._resolveDistributedAuthScope(finalConfig);
    const run = new Run({
      id: finalConfig.runId,
      input: userMessage,
      state: { ...(finalConfig.state || {}) },
      metadata: {
        description: this.description,
        ...(finalConfig.metadata || {}),
        ...(executionIdentity ? { executionIdentity } : {}),
        ...(distributedAuthScope.length ? { distributedAuthScope } : {}),
        lineage: {
          rootRunId:
            finalConfig.lineage?.rootRunId ||
            finalConfig.metadata?.lineage?.rootRunId ||
            finalConfig.lineage?.parentRunId ||
            finalConfig.metadata?.lineage?.parentRunId ||
            undefined,
          parentRunId:
            finalConfig.lineage?.parentRunId || finalConfig.metadata?.lineage?.parentRunId || null,
          childRunIds: finalConfig.lineage?.childRunIds || finalConfig.metadata?.lineage?.childRunIds || [],
          branchOriginRunId:
            finalConfig.lineage?.branchOriginRunId ||
            finalConfig.metadata?.lineage?.branchOriginRunId ||
            null,
          branchCheckpointId:
            finalConfig.lineage?.branchCheckpointId ||
            finalConfig.metadata?.lineage?.branchCheckpointId ||
            null,
        },
      },
    });

    run.setStatus('running');
    await this._persistRun(run);
    await this._linkParentRun(run);

    try {
      this._checkSignal(finalConfig.signal);
      const promptObject = await this._buildSystemPrompt(userMessage, finalConfig, { run });
      const messages = this._promptObjectToMessages(promptObject);

      if (messages.length === 0) {
        throw new InvalidToolCallError('Cannot send empty prompt: No messages in the array.');
      }

      run.messages = [...messages];
      await this._persistRun(run);
      await this._emitEvent(run, 'run_started', { input: userMessage });
      await this._checkpointRun(run, 'run_started', { input: userMessage });

      const pausedRun = await this._maybePause(run, finalConfig, 'after_prompt_build', {
        input: userMessage,
      });
      if (pausedRun) {
        return pausedRun;
      }

      return this._continueRun(run, finalConfig);
    } catch (error) {
      return this._failRun(run, error);
    }
  }

  async resumeRun(runId, config = {}) {
    return this.runLock.withLock(this._lockKey(runId), () => this._resumeRun(runId, config));
  }

  async _resumeRun(runId, config = {}) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot resume a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);

    if (run.metadata.producerId || run.metadata.realtime || run.metadata.remoteJob || run.metadata.executionMode === 'media') {
      throw new ToolPolicyError('This run must be resumed by its owning runtime.');
    }
    if (run.status === 'paused' && run.pendingPause) {
      if (run.metadata.executionMode === 'tool') {
        throw new ToolPolicyError('Paused direct tool runs require explicit reconciliation, not model continuation.');
      }
      if (this.authorizeResume && await this.authorizeResume(run.pendingPause, { run, config }) !== true) {
        throw new ToolPolicyError('Pause resume authorization denied.');
      }
      const previousPause = run.pendingPause;
      run.pendingPause = null;
      run.setStatus('running');
      await this._emitEvent(run, 'run_resumed', {
        reason: previousPause.reason,
        stage: previousPause.stage || null,
      });
      await this._checkpointRun(run, 'run_resumed', {
        reason: previousPause.reason,
        stage: previousPause.stage || null,
      });

      return this._continueRun(run, { ...this.defaultConfig, ...config });
    }

    if (run.status === 'cancelled') {
      throw new RunCancelledError(`Run "${runId}" has been cancelled.`);
    }

    if (run.status !== 'waiting_for_approval' || !run.pendingApproval) {
      return run;
    }

    if (!run.pendingApproval.expiresAt || Date.parse(run.pendingApproval.expiresAt) <= Date.now() ||
        !Number.isFinite(Date.parse(run.pendingApproval.expiresAt))) {
      throw new ToolPolicyError('Approval request expired or has no expiry.');
    }
    if (run.pendingApproval.runId !== run.id || run.pendingApproval.scopeKey !== this._lockKey(run.id) ||
        run.pendingApproval.toolCall?.name !== run.pendingApproval.toolName ||
        JSON.stringify(run.pendingApproval.toolCall?.arguments) !== JSON.stringify(run.pendingApproval.arguments)) {
      throw new ToolPolicyError('Approval does not match this run, scope, or action.');
    }
    if (this.approvalSigner && !this.approvalSigner.verify(run.pendingApproval)) {
      throw new ToolPolicyError('Approval action signature is invalid.');
    }
    if (this.authorizeResume && await this.authorizeResume(run.pendingApproval, { run, config }) !== true) {
      throw new ToolPolicyError('Approval resume authorization denied.');
    }
    const approvedTool = this.tools.find(tool => tool.name === run.pendingApproval.toolName);
    if (!approvedTool) throw new ToolNotFoundError('Approved tool is no longer available.');
    if (JSON.stringify(approvedTool.parameters || {}) !== JSON.stringify(run.pendingApproval.toolSchema) ||
        JSON.stringify(approvedTool.outputSchema || null) !== JSON.stringify(run.pendingApproval.toolOutputSchema) ||
        JSON.stringify(approvedTool.metadata || {}) !== JSON.stringify(run.pendingApproval.metadata)) {
      throw new ToolPolicyError('Approved tool contract changed; new review is required.');
    }
    const currentPolicy = await this.toolPolicy.evaluate(approvedTool, run.pendingApproval.arguments, { run, config });
    if (!['allow', 'require_approval'].includes(currentPolicy?.action)) {
      throw new ToolPolicyError('Current policy does not permit approved tool execution.');
    }

    run.setStatus('running');
    await this._emitEvent(run, 'approval_resolved', {
      request: run.pendingApproval,
      approved: config.approved === true,
      reason: config.reason || null,
    });
    await this._checkpointRun(run, 'approval_resolved', {
      approved: config.approved === true,
      reason: config.reason || null,
    });

    try {
      const approvalRequest = run.pendingApproval;
      const approvalResult =
        config.approved === true
          ? { approved: true, reason: config.reason || null }
          : await this.toolPolicy.resolveApproval(approvalRequest, { run, config });

      if (approvalResult?.approved !== true) {
        throw new ToolPolicyError(
          approvalResult?.reason || `Execution denied for tool "${run.pendingApproval.toolName}".`
        );
      }

      const consumed = run.state.approvalConsumptions || {};
      if (this.approvalSigner && !this.approvalSigner.verify(approvalRequest)) {
        throw new ToolPolicyError('Approval changed during authorization.');
      }
      if (Object.hasOwn(consumed, approvalRequest.id)) throw new ToolPolicyError('Approval was already consumed.');
      run.state.approvalConsumptions = { ...consumed, [approvalRequest.id]: {
        status: 'uncertain', consumedAt: new Date().toISOString(), toolName: approvalRequest.toolName,
      } };
      run.pendingApproval = null;
      await this._persistRun(run);

      const resumedConfig = { ...this.defaultConfig, ...config };
      const noRetry = !this._canRetryTool(approvedTool);
      const execute = () => this._handleToolCall(approvalRequest.toolCall, { run, signal: resumedConfig.signal, frozenArgs: true });
      const toolResult = noRetry ? await execute() : await this.retryManager.execute(execute);
      this._appendToolMessages(run, approvalRequest.toolCall, toolResult);
      run.state.approvalConsumptions[approvalRequest.id].status = 'completed';
      run.pendingApproval = null;
      await this._persistRun(run);
      await this._checkpointRun(run, 'tool_approved_and_resumed', {
        toolName: approvalRequest.toolName,
      });
      if (toolResult?.__adaptiveEscalated) return run;
      if (run.metadata.executionMode === 'tool') return await this._finishToolRun(run, toolResult);

      return this._continueRun(run, { ...this.defaultConfig, ...config }, { skipPromptBuild: true });
    } catch (error) {
      return this._failRun(run, error);
    }
  }

  async _continueRun(run, finalConfig, options = {}) {
    let result;

    try {
      while (true) {
        this._checkSignal(finalConfig.signal);
        const pauseBeforeModel = await this._maybePause(run, finalConfig, 'before_model', {
          messageCount: run.messages.length,
        });
        if (pauseBeforeModel) {
          return pauseBeforeModel;
        }

        const modelStep = this._startStep(run, 'model', {
          messageCount: run.messages.length,
        });
        await this._emitEvent(run, 'model_request', {
          messageCount: run.messages.length,
          toolCount: this.tools.length,
        });
        const modelStartedAt = Date.now();

        const projection = this.contextWindow ? await this.contextWindow.project(run.messages, this.tools) : null;
        if (projection) {
          const { messages, ...summary } = projection;
          run.state.contextWindow = summary;
          await this._emitEvent(run, 'context_projected', summary);
        }
        const modelMessages = projection?.messages || run.messages;
        const modelConfig = { ...finalConfig, tools: this.tools };
        if (projection) modelConfig.maxTokens = Math.min(
          modelConfig.maxTokens ?? projection.reserveOutputTokens, projection.reserveOutputTokens);
        result = await this.retryManager.execute(async () => {
          this._checkSignal(finalConfig.signal);
          if (this.authorizeModelCall && await this.authorizeModelCall({
            messages: modelMessages, config: modelConfig, adapter: this.adapter,
          }, { run }) !== true) throw new ToolPolicyError('Model call denied.');
          await this._reserveExecution(run, 'modelCalls');
          try {
            return await this._withBudget(run, 'model', { messages: modelMessages, config: modelConfig },
              () => invokeWithDeadline(signal => this.adapter.generateText(modelMessages, { ...modelConfig, signal }),
                { signal: finalConfig.signal, timeoutMs: this.invocationTimeoutMs }));
          } catch (error) {
            this._checkSignal(finalConfig.signal);
            throw error;
          }
        });
        this._checkSignal(finalConfig.signal);
        const completion = result?.completionStatus ||
          (['length', 'max_tokens'].includes(result?.finishReason) ? 'incomplete' : 'completed');
        if (!['completed', 'incomplete', 'uncertain'].includes(completion)) {
          throw new InvalidToolCallError('Invalid model completion status.');
        }
        run.state.resultStatus = completion;
        if (completion !== 'completed') {
          run.output = result?.message || null;
          return this._pauseRun(run, 'Model output is not complete.', { stage: `output_${completion}` });
        }
        run.recordTiming('modelMs', Date.now() - modelStartedAt);
        if (result?.usage) {
          run.recordUsage(result.usage);
        }
        if (typeof result?.cost === 'number') {
          run.recordCost(result.cost);
        }

        await this._emitEvent(run, 'model_response', {
          hasToolCalls: Boolean(result?.toolCalls?.length || result?.toolCall),
          message: result?.message || null,
        });
        this._completeStep(run, modelStep.id, {
          message: result?.message || null,
          toolCalls: result?.toolCalls || (result?.toolCall ? [result.toolCall] : []),
        });
        await this._checkpointRun(run, 'model_response', {
          hasToolCalls: Boolean(result?.toolCalls?.length || result?.toolCall),
        });

        const pauseAfterModel = await this._maybePause(run, finalConfig, 'after_model', {
          message: result?.message || null,
          toolCalls: result?.toolCalls || (result?.toolCall ? [result.toolCall] : []),
        });
        if (pauseAfterModel) {
          return pauseAfterModel;
        }

        const toolCalls = result?.toolCalls || (result?.toolCall ? [result.toolCall] : []);
        if (!toolCalls.length) {
          break;
        }

        for (const toolCall of toolCalls) {
          this._validateToolCall(toolCall);

          const pauseBeforeTool = await this._maybePause(run, finalConfig, 'before_tool', {
            toolCall,
          });
          if (pauseBeforeTool) {
            return pauseBeforeTool;
          }

          let gate = await this._gateToolCall(run, toolCall, finalConfig);
          if (gate.status !== 'waiting_for_approval') {
            const originalArgs = JSON.stringify(toolCall.arguments);
            toolCall.arguments = await this._withBudget(run, 'argument_resolution', { toolName: toolCall.name },
              () => this.resolver.resolve(this.tools.find(tool => tool.name === toolCall.name), toolCall.arguments));
            if (JSON.stringify(toolCall.arguments) !== originalArgs) {
              gate = await this._gateToolCall(run, toolCall, finalConfig);
            }
          }
          if (gate.status === 'waiting_for_approval') {
            await this._checkpointRun(run, 'waiting_for_approval', {
              toolName: toolCall.name,
            });
            return run;
          }

          const noRetry = !this._canRetryTool(this.tools.find(tool => tool.name === toolCall.name));
          const toolResult = noRetry
            ? await this._handleToolCall(toolCall, { run, signal: finalConfig.signal, frozenArgs: true })
            : await this.retryManager.execute(() => this._handleToolCall(toolCall, { run, signal: finalConfig.signal, frozenArgs: true }));
          if (toolResult?.__adaptiveEscalated) {
            return run;
          }

          this._appendToolMessages(run, toolCall, toolResult);
          await this._persistRun(run);

          const pauseAfterTool = await this._maybePause(run, finalConfig, 'after_tool', {
            toolCall,
            toolResult,
          });
          if (pauseAfterTool) {
            return pauseAfterTool;
          }
        }
      }

      run.output = result?.message || result;
      this._validateFinalOutput(run);
      await this._selfVerifyRunOutput(run, finalConfig);
      const assessment = this._assessRun(run);
      const confidenceDecision = await this._applyRunConfidencePolicy(run, assessment, finalConfig);
      if (run.status === 'paused') {
        return run;
      }
      if (confidenceDecision?.action === 'deny') {
        throw new ToolPolicyError(confidenceDecision.reason || 'Run denied by confidence policy.');
      }
      if (this.memory?.storeConversation) {
        await this._withBudget(run, 'memory_write', { input: run.input },
          () => this.memory.storeConversation(run.input, result.message || JSON.stringify(result), { runId: run.id }));
      } else if (this.memory?.store) {
        this.memory.store(run.input, result);
      }
      run.setStatus('completed');

      await this._emitEvent(run, 'run_completed', { output: run.output });
      await this._checkpointRun(run, 'run_completed', { output: run.output });
      await this._persistRun(run);
      return run;
    } catch (error) {
      return this._failRun(run, error);
    }
  }

  async _failRun(run, error) {
    run.addError({
      name: error.name || 'Error',
      message: error.message || String(error),
    });
    const cancelled = error instanceof RunCancelledError;
    run.state.resultStatus = error?.uncertain ? 'uncertain' : cancelled ? 'cancelled' : 'failed';
    run.setStatus(cancelled ? 'cancelled' : 'failed');
    await this._emitEvent(run, cancelled ? 'run_cancelled' : 'run_failed', {
      name: error.name || 'Error',
      message: error.message || String(error),
    });
    await this._checkpointRun(run, cancelled ? 'run_cancelled' : 'run_failed', {
      name: error.name || 'Error',
      message: error.message || String(error),
    });
    await this._persistRun(run);
    throw error;
  }

  _validateToolCall(toolCall) {
    if (!toolCall?.name || typeof toolCall.arguments !== 'object' || toolCall.arguments === null) {
      throw new InvalidToolCallError('Invalid tool call format: missing name or arguments');
    }
  }

  async _gateToolCall(run, toolCall, finalConfig = {}) {
    const toolInstance = this.tools.find(tool => tool.name === toolCall.name);
    if (!toolInstance) {
      throw new ToolNotFoundError(`Tool ${toolCall.name} not found.`);
    }

    const request = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.approvalTtlMs).toISOString(),
      runId: run.id,
      scopeKey: this._lockKey(run.id),
      toolName: toolCall.name,
      toolCall,
      arguments: toolCall.arguments || {},
      metadata: toolInstance.metadata || {},
      toolSchema: toolInstance.parameters || {},
      toolOutputSchema: toolInstance.outputSchema || null,
    };
    this.schemaSafety.assertValue(request);
    request.toolCall = JSON.parse(JSON.stringify(request.toolCall));
    request.arguments = JSON.parse(JSON.stringify(request.arguments));
    request.metadata = JSON.parse(JSON.stringify(request.metadata));
    request.toolSchema = JSON.parse(JSON.stringify(request.toolSchema));
    request.toolOutputSchema = JSON.parse(JSON.stringify(request.toolOutputSchema));
    if (this.approvalSigner) request.signature = this.approvalSigner.sign(request);

    run.addToolCall(request);
    await this._emitEvent(run, 'tool_requested', request);
    const toolAssessment = await this._scoreToolCallConfidence(run, toolInstance, toolCall);
    const confidenceDecision = await this._applyToolConfidencePolicy(
      run,
      toolInstance,
      toolCall,
      toolAssessment,
      finalConfig
    );

    if (confidenceDecision?.action === 'deny') {
      throw new ToolPolicyError(
        confidenceDecision.reason || `Execution denied for tool "${toolCall.name}".`
      );
    }

    if (confidenceDecision?.action === 'require_approval') {
      run.pendingApproval = {
        ...request,
        reason: confidenceDecision.reason || null,
        confidence: toolAssessment,
      };
      run.setStatus('waiting_for_approval');
      if (this.approvalInbox?.add) {
        await this.approvalInbox.add(run.pendingApproval);
      }
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    const decision = await this.toolPolicy.evaluate(toolInstance, toolCall.arguments || {}, {
      run,
      config: finalConfig,
    });
    if (!['allow', 'deny', 'require_approval'].includes(decision?.action)) {
      throw new ToolPolicyError('Invalid tool policy decision.');
    }
    run.state.policyDecisions = run.state.policyDecisions || [];
    run.state.policyDecisions.push({
      toolName: toolCall.name,
      stage: 'evaluate',
      decision,
    });
    await this._emitEvent(run, 'policy_decision', {
      toolName: toolCall.name,
      stage: 'evaluate',
      decision,
    });

    if (decision?.action === 'deny') {
      throw new ToolPolicyError(
        decision.reason || `Execution denied for tool "${toolCall.name}".`
      );
    }

    if (decision?.action === 'require_approval') {
      run.pendingApproval = {
        ...request,
        reason: decision.reason || null,
      };
      run.setStatus('waiting_for_approval');
      if (this.approvalInbox?.add) {
        await this.approvalInbox.add(run.pendingApproval);
      }
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    const beforeExecution = await this.toolPolicy.onBeforeExecute(
      toolInstance,
      toolCall.arguments || {},
      { run, config: finalConfig }
    );
    if (!['allow', 'deny', 'require_approval'].includes(beforeExecution?.action)) {
      throw new ToolPolicyError('Invalid before-execute decision.');
    }
    run.state.policyDecisions.push({
      toolName: toolCall.name,
      stage: 'before_execute',
      decision: beforeExecution,
    });
    await this._emitEvent(run, 'policy_decision', {
      toolName: toolCall.name,
      stage: 'before_execute',
      decision: beforeExecution,
    });

    if (beforeExecution?.action === 'deny') {
      throw new ToolPolicyError(
        beforeExecution.reason || `Execution denied for tool "${toolCall.name}".`
      );
    }

    if (beforeExecution?.action === 'require_approval') {
      run.pendingApproval = {
        ...request,
        reason: beforeExecution.reason || null,
      };
      run.setStatus('waiting_for_approval');
      if (this.approvalInbox?.add) {
        await this.approvalInbox.add(run.pendingApproval);
      }
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    const verification = await this._verifyToolCall(toolInstance, toolCall, { run, config: finalConfig });
    if (verification?.action === 'deny') {
      throw new ToolPolicyError(
        verification.reason || `Verifier denied execution for tool "${toolCall.name}".`
      );
    }

    if (verification?.action === 'require_approval') {
      run.pendingApproval = {
        ...request,
        reason: verification.reason || null,
        verification,
      };
      run.setStatus('waiting_for_approval');
      if (this.approvalInbox?.add) {
        await this.approvalInbox.add(run.pendingApproval);
      }
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    return { status: 'approved' };
  }

  _shouldVerifyTool(tool, finalConfig = {}) {
    const verificationPolicy = tool?.metadata?.verificationPolicy || 'auto';
    const sideEffectLevel = tool?.metadata?.sideEffectLevel || 'none';

    if (verificationPolicy === 'never') {
      return false;
    }

    if (verificationPolicy === 'require_verifier') {
      return true;
    }

    if (finalConfig.forceVerify === true) {
      return true;
    }

    return ['external_write', 'system_write', 'destructive'].includes(sideEffectLevel);
  }

  async _invokeVerifier(tool, args, context = {}) {
    if (typeof this.verifier === 'function') {
      return this.verifier(tool, args, context);
    }

    if (this.verifier?.verify) {
      return this.verifier.verify(tool, args, context);
    }

    if (this.verifier?.generateText) {
      const isSelfVerification = context.stage === 'self_verification';
      const prompt = [
        {
          role: 'system',
          content: isSelfVerification
            ? [
                'You are a runtime output verifier.',
                'Return only valid JSON with keys action and reason.',
                'action must be one of allow, deny, require_approval.',
                'Allow if the final output faithfully reflects retrieved evidence, completed tool results, and prior approvals.',
                'Do not require approval for actions that have already been executed and approved.',
                'Do not deny an output merely because the underlying evidence is conflicting; deny only if the output hides, distorts, or overstates the evidence.',
                'Require approval only if the final output proposes a new risky external action that has not yet been executed.',
              ].join(' ')
            : 'You are a runtime safety verifier. Return only valid JSON with keys action and reason. action must be one of allow, deny, require_approval.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              tool: {
                name: tool.name,
                description: tool.description,
                metadata: tool.metadata,
              },
              arguments: args,
              runId: context.run?.id || null,
              input: context.run?.input || null,
              stage: context.stage || null,
              toolResults: context.run?.toolResults || [],
              pendingApproval: context.run?.pendingApproval || null,
            },
            null,
            2
          ),
        },
      ];

      const response = await this._callVerifierModel(prompt, context);
      const content = response?.message || response?.content || '';
      return repairJsonOutput(
        {
          sendMessage: async repairPrompt => {
            const repairResponse = await this._callVerifierModel(
              [
                {
                  role: 'system',
                  content: 'Return only valid JSON.',
                },
                { role: 'user', content: repairPrompt },
              ],
              context
            );
            return repairResponse?.message || repairResponse?.content || '';
          },
        },
        content
      );
    }

    return null;
  }

  async _callVerifierModel(messages, { run, config = {} } = {}) {
    const options = { temperature: 0, maxTokens: 200, signal: config.signal };
    this._checkSignal(config.signal);
    if (this.authorizeModelCall && await this.authorizeModelCall({
      operation: 'verifier', messages, config: options, adapter: this.verifier,
    }, { run }) !== true) throw new ToolPolicyError('Verifier model call denied.');
    this._checkSignal(config.signal);
    if (run) await this._reserveExecution(run, 'modelCalls');
    return this._withBudget(run, 'model', { messages, config: options, operation: 'verifier' },
      () => invokeWithDeadline(signal => this.verifier.generateText(messages, { ...options, signal }),
        { signal: config.signal, timeoutMs: this.invocationTimeoutMs }));
  }

  async _verifyToolCall(tool, toolCall, { run, config = {} } = {}) {
    if (!this._shouldVerifyTool(tool, config)) {
      return { action: 'allow', reason: null, source: 'skipped' };
    }

    if (!this.verifier && !this.toolPolicy.customVerify) {
      throw new ToolPolicyError(
        `Tool "${tool.name}" requires verification, but no verifier is configured.`
      );
    }

    const step = run
      ? this._startStep(run, 'verifier', {
          toolName: tool.name,
          arguments: toolCall.arguments || {},
        })
      : null;

    if (run) {
      await this._emitEvent(run, 'verifier_started', {
        toolName: tool.name,
        arguments: toolCall.arguments || {},
      });
    }

    try {
      const startedAt = Date.now();
      const policyVerdict = await this.toolPolicy.verify(tool, toolCall.arguments || {}, {
        run,
        config,
        toolCall,
      });
      const verifierVerdict =
        policyVerdict?.action && policyVerdict.action !== 'allow'
          ? policyVerdict
          : await this._withBudget(run, 'verifier', { toolName: tool.name },
            () => this._invokeVerifier(tool, toolCall.arguments || {}, { run, config, toolCall }));

      const verdict = verifierVerdict || policyVerdict || { action: 'allow', reason: null };
      if (!['allow', 'deny', 'require_approval'].includes(verdict?.action)) {
        throw new ToolPolicyError('Invalid verifier decision.');
      }

      if (run) {
        run.recordTiming('verifierMs', Date.now() - startedAt);
        this._getEvidenceGraph(run).addNode({
          id: `${run.id}:evidence:verifier:${run.steps.length + 1}`,
          type: 'verifier',
          label: tool.name,
          verdict,
          reviewers: verdict.reviewers || [],
          strategy: verdict.strategy || null,
        });
        this._completeStep(run, step.id, verdict);
        await this._emitEvent(run, 'verifier_completed', {
          toolName: tool.name,
          verdict,
        });
        await this._checkpointRun(run, 'verifier_completed', {
          toolName: tool.name,
          verdict,
        });
      }

      return {
        action: verdict.action || 'allow',
        reason: verdict.reason || null,
        source: verdict.source || 'verifier',
      };
    } catch (error) {
      if (run) {
        this._failStep(run, step.id, error);
        await this._emitEvent(run, 'verifier_failed', {
          toolName: tool.name,
          message: error.message || String(error),
        });
      }

      throw new ToolPolicyError(
        `Verifier failed for tool "${tool.name}": ${error.message || String(error)}`
      );
    }
  }

  _appendToolMessages(run, toolCall, toolResult) {
    run.addMessage({
      role: 'assistant',
      content: '',
      function_call: {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.arguments || {}),
      },
    });
    run.addMessage({
      role: 'function',
      name: toolCall.name,
      content: JSON.stringify(toolResult),
    });
    run.addToolResult({
      toolName: toolCall.name,
      result: toolResult,
    });
    this._getEvidenceGraph(run).addNode({
      id: `${run.id}:evidence:tool:${run.toolResults.length}`,
      type: 'tool_result',
      label: toolCall.name,
      result: toolResult,
    });
  }

  async _resolveToolAuth(toolInstance, runtime = {}) {
    const requirements = toolInstance?.metadata?.authRequirements || [];
    if (!requirements.length) {
      return {};
    }

    const distributedAuthScope = Array.isArray(runtime?.run?.metadata?.distributedAuthScope)
      ? runtime.run.metadata.distributedAuthScope
      : Array.isArray(runtime?.authScope)
        ? runtime.authScope
        : null;
    if (
      distributedAuthScope &&
      requirements.some(requirement => !distributedAuthScope.includes(requirement))
    ) {
      throw new ToolPolicyError(
        `Distributed auth scope does not allow all required bindings for tool "${toolInstance.name}".`
      );
    }

    const resolved =
      typeof this.resolveToolAuth === 'function'
        ? await this.resolveToolAuth(toolInstance, {
            run: runtime.run || null,
            agent: this,
            requirements,
            executionIdentity: runtime?.run?.metadata?.executionIdentity || null,
            authScope: distributedAuthScope,
          })
        : this.authContext || {};

    const auth = resolved && typeof resolved === 'object' ? { ...resolved } : {};
    const filtered = {};
    const missing = [];

    for (const requirement of requirements) {
      if (Object.prototype.hasOwnProperty.call(auth, requirement) && auth[requirement] != null) {
        filtered[requirement] = auth[requirement];
      } else {
        missing.push(requirement);
      }
    }

    if (missing.length) {
      throw new ToolPolicyError(
        `Tool "${toolInstance.name}" is missing required auth bindings: ${missing.join(', ')}`
      );
    }

    return filtered;
  }

  _resolveExecutionIdentity(config = {}) {
    return (
      ExecutionIdentity.normalize(config.executionIdentity) ||
      ExecutionIdentity.normalize(config.metadata?.executionIdentity) ||
      this.executionIdentity ||
      null
    );
  }

  _resolveDistributedAuthScope(config = {}) {
    const configuredScope = config.distributedAuthScope || config.metadata?.distributedAuthScope || null;
    if (Array.isArray(configuredScope)) {
      return [...new Set(configuredScope)];
    }

    if (this.authContext && typeof this.authContext === 'object') {
      return Object.keys(this.authContext);
    }

    return [];
  }

  async _handleToolCall(toolCall, runtime = {}) {
    this._checkSignal(runtime.signal);
    const toolInstance = this.tools.find(tool => tool.name === toolCall.name);
    if (!toolInstance) {
      throw new ToolNotFoundError(`Tool ${toolCall.name} not found.`);
    }

    let resolvedArgs;
    if (runtime.frozenArgs) {
      resolvedArgs = JSON.parse(JSON.stringify(toolCall.arguments || {}));
      if (!this.resolver.validator.validate(toolInstance, resolvedArgs).valid) {
        throw new InvalidToolCallError('Approved tool arguments no longer match its schema.');
      }
    } else resolvedArgs = await this.resolver.resolve(toolInstance, toolCall.arguments || {});
    const auth = await this._resolveToolAuth(toolInstance, runtime);
    const toolContext = {
      toolCall,
      run: runtime.run || null,
      persistRun: runtime.run ? () => this._persistRun(runtime.run) : null,
      signal: runtime.signal,
      auth,
      getAuth: key => auth[key],
      idempotencyKey: `${runtime.run?.id || 'direct'}:${toolCall.id || runtime.run?.toolCalls.at(-1)?.id || randomUUID()}`,
    };
    const step = runtime.run
      ? this._startStep(runtime.run, 'tool', {
          toolName: toolCall.name,
          arguments: resolvedArgs,
        })
      : null;

    if (runtime.run) {
      await this._emitEvent(runtime.run, 'tool_started', {
        toolName: toolCall.name,
        arguments: resolvedArgs,
      });
    }

    let externalReturned = false;
    try {
      const toolStartedAt = Date.now();
      const invoke = async () => {
        this._checkSignal(runtime.signal);
        if (runtime.run) await this._reserveExecution(runtime.run, 'toolCalls');
        return this._withBudget(runtime.run, 'tool', { toolName: toolCall.name, args: resolvedArgs,
          metadata: toolInstance.metadata }, () => invokeWithDeadline(async signal => {
            if (runtime.run) {
              runtime.run.state.actions = runtime.run.state.actions || {};
              Object.defineProperty(runtime.run.state.actions, step.id, { value: {
                toolName: toolCall.name, idempotencyKey: toolContext.idempotencyKey, status: 'uncertain',
              }, enumerable: true, configurable: true, writable: true });
              await this._persistRun(runtime.run);
            }
            signal.throwIfAborted();
            const output = await toolInstance.call(resolvedArgs, { ...toolContext, signal });
            signal.throwIfAborted();
            externalReturned = true;
            if (runtime.run) {
              runtime.run.state.actions[step.id].status = 'completed';
              await this._persistRun(runtime.run);
            }
            return output;
          },
            { signal: runtime.signal, timeoutMs: this.invocationTimeoutMs }));
      };
      const rawResult = toolInstance.metadata?.retryabilityHint !== 'never' &&
        this.adaptiveRetryPolicy?.onFailure && this.retryManager.executeWithPolicy
        ? await this.retryManager.executeWithPolicy(
            invoke,
            {
              policy: {
                onFailure: (error, details) => {
                  const decision = this.adaptiveRetryPolicy.onFailure(error, details);
                  return !this._canRetryTool(toolInstance) && decision?.action === 'retry'
                    ? { ...decision, action: 'fail' } : decision;
                },
              },
              context: {
                operation: 'tool_execution',
                toolName: toolCall.name,
                sideEffectLevel: toolInstance?.metadata?.sideEffectLevel || 'none',
              },
              onEscalate: async (error, details) => {
                if (!runtime.run) {
                  throw error;
                }
                runtime.run.state.adaptiveEscalation = {
                  toolName: toolCall.name,
                  reason: details.decision?.reason || error.message || String(error),
                  attempt: details.attempt,
                };
                await this._emitEvent(runtime.run, 'adaptive_retry_escalated', {
                  toolName: toolCall.name,
                  reason: details.decision?.reason || error.message || String(error),
                  attempt: details.attempt,
                });
                await this._pauseRun(
                  runtime.run,
                  details.decision?.reason || 'Adaptive retry policy escalated the tool execution.',
                  {
                    stage: 'adaptive_retry_escalation',
                    toolName: toolCall.name,
                  }
                );
                return { __adaptiveEscalated: true };
              },
            }
          )
        : await invoke();
      if (rawResult?.__adaptiveEscalated) {
        return rawResult;
      }
      this._checkSignal(runtime.signal);
      const result = await this.toolPolicy.onAfterExecute(toolInstance, rawResult, {
        run: runtime.run || null,
        toolCall,
      });
      if (!this.resolver.validator.validateOutput(toolInstance, result).valid) {
        throw new InvalidToolCallError('Tool output schema validation failed.');
      }
      if (runtime.run) {
        runtime.run.recordTiming('toolMs', Date.now() - toolStartedAt);
      }

      if (runtime.run) {
        this._completeStep(runtime.run, step.id, result);
        await this._emitEvent(runtime.run, 'tool_completed', {
          toolName: toolCall.name,
          result,
        });
        await this._checkpointRun(runtime.run, 'tool_completed', {
          toolName: toolCall.name,
        });
      }

      return result;
    } catch (error) {
      if (externalReturned && error && typeof error === 'object') error.retryable = false;
      if (runtime.run) {
        if (step) {
          this._failStep(runtime.run, step.id, error);
        }
        await this._emitEvent(runtime.run, 'tool_failed', {
          toolName: toolCall.name,
          message: error.message || String(error),
        });
      }

      this._checkSignal(runtime.signal);
      if (error?.retryable === false) throw error;
      const wrapped = new ToolExecutionError(`Tool "${toolCall.name}" failed: ${error.message || String(error)}`);
      wrapped.uncertain = ['external_write', 'system_write', 'destructive'].includes(toolInstance.metadata?.sideEffectLevel);
      throw wrapped;
    }
  }

  async runMedia(operation, input, config = {}) {
    const capabilities = { analyzeImage: 'imageAnalysis', generateImage: 'imageGeneration',
      transcribeAudio: 'audioTranscription', generateAudio: 'audioGeneration',
      analyzeVideo: 'videoAnalysis', generateVideo: 'videoGeneration' };
    const capability = Object.hasOwn(capabilities, operation) ? capabilities[operation] : null;
    const declared = this.adapter?.getCapabilities?.();
    if (!capability || typeof this.adapter?.[operation] !== 'function' || (declared && declared[capability] !== true)) {
      throw new AdapterCapabilityError('Adapter does not support the requested media operation.');
    }
    const finalConfig = { ...this.defaultConfig, ...config };
    const runId = finalConfig.runId || randomUUID();
    return this.runLock.withLock(this._lockKey(runId), async () => {
      if (this.runStore?.getRun && await this.runStore.getRun(runId)) throw new ToolPolicyError('Run ID already exists.');
      // Legacy adapters may accept buffers, local paths, or signed URLs. Never persist
      // those inputs or their raw outputs implicitly.
      const run = new Run({ id: runId, input: { operation, contentRecorded: false },
        metadata: { ...finalConfig.metadata, executionMode: 'media', operation,
          executionIdentity: this._resolveExecutionIdentity(finalConfig) } });
      run.setStatus('running');
      await this._persistRun(run);
      let dispatched = false;
      let mediaStep;
      try {
        this._checkSignal(finalConfig.signal);
        const request = { operation, input, config: finalConfig };
        if (this.authorizeModelCall && await this.authorizeModelCall(request, { run }) !== true) {
          throw new ToolPolicyError('Media provider call denied.');
        }
        let payload = input;
        let providerConfig = { ...finalConfig };
        // Analysis helpers historically included memory and retrieval in their prompt.
        if (['analyzeImage', 'analyzeVideo', 'generateImage', 'generateVideo'].includes(operation)) {
          const prompt = operation.startsWith('analyze')
            ? finalConfig.prompt || (operation === 'analyzeImage' ? 'Analyze this image.' : 'Describe this video.') : input;
          const promptObject = await this._buildSystemPrompt(prompt, finalConfig, { run, signal: finalConfig.signal });
          if (operation.startsWith('analyze')) providerConfig.prompt = promptObject;
          else payload = operation === 'generateImage' ? promptObject : promptObject.user;
        }
        // Inspect the fully assembled request as well: memory/RAG can add disclosure.
        if (this.authorizeModelCall && await this.authorizeModelCall({ operation, input: payload, config: providerConfig }, { run }) !== true) {
          throw new ToolPolicyError('Assembled media provider call denied.');
        }
        this._checkSignal(finalConfig.signal);
        await this._reserveExecution(run, 'modelCalls');
        const step = mediaStep = this._startStep(run, 'model', { operation, contentRecorded: false });
        await this._emitEvent(run, 'media_started', { operation, stepId: step.id });
        const result = await this._withBudget(run, 'model', { operation, input: payload, config: providerConfig },
          () => invokeWithDeadline(signal => {
            dispatched = true;
            return this.adapter[operation](payload, { ...providerConfig, signal });
          }, { signal: finalConfig.signal, timeoutMs: this.invocationTimeoutMs }));
        this._checkSignal(finalConfig.signal);
        const completion = result?.completionStatus || 'completed';
        if (!['completed', 'incomplete', 'uncertain'].includes(completion)) throw new Error('Invalid media completion status.');
        run.output = { operation, contentRecorded: false };
        run.state.resultStatus = completion;
        run.setStatus(completion === 'completed' ? 'completed' : 'paused');
        if (run.status === 'paused') run.pendingPause = { stage: 'media_reconciliation', reason: 'Media output is not complete.' };
        this._completeStep(run, step.id, { operation, contentRecorded: false, completionStatus: completion });
        await this._emitEvent(run, `media_${run.status}`, { operation, stepId: step.id });
        await this._checkpointRun(run, `media_${run.status}`);
        return { run, result };
      } catch (error) {
        const safeError = new ToolExecutionError('Media operation did not complete.');
        safeError.retryable = false;
        safeError.uncertain = dispatched;
        if (mediaStep) this._failStep(run, mediaStep.id, safeError);
        if (finalConfig.signal?.aborted && !dispatched) return this._failRun(run, new RunCancelledError('Media operation cancelled.'));
        if (!dispatched && error instanceof ToolPolicyError) return this._failRun(run, error);
        return this._failRun(run, safeError);
      }
    });
  }

  async analyzeImage(input, config = {}) { return (await this.runMedia('analyzeImage', input, config)).result; }
  async generateImage(input, config = {}) { return (await this.runMedia('generateImage', input, config)).result; }
  async transcribeAudio(input, config = {}) { return (await this.runMedia('transcribeAudio', input, config)).result; }
  async generateAudio(input, config = {}) { return (await this.runMedia('generateAudio', input, config)).result; }
  async analyzeVideo(input, config = {}) { return (await this.runMedia('analyzeVideo', input, config)).result; }
  async generateVideo(input, config = {}) { return (await this.runMedia('generateVideo', input, config)).result; }

  async init() {
    if (!this.mcpClient || typeof this.mcpClient.toTools !== 'function') {
      return;
    }

    try {
      const mcpTools = await this.mcpClient.toTools();
      if (Array.isArray(mcpTools) && mcpTools.length) {
        this.tools.push(...mcpTools);
        this.resolver.tools = this.tools;
      }
    } catch (error) {
      console.warn('[Agent] Failed to load MCP tools:', error.message);
    }
  }

  async pauseRun(runId, { reason = 'Paused manually.', stage = 'manual', payload = {} } = {}) {
    return this.runLock.withLock(this._lockKey(runId), () => this._pauseStoredRun(runId, { reason, stage, payload }));
  }

  async _pauseStoredRun(runId, { reason, stage, payload }) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot pause a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    if (run.status === 'completed' || run.status === 'failed') {
      throw new RunPausedError(`Run "${runId}" cannot be paused from status "${run.status}".`);
    }

    return this._pauseRun(run, reason, { stage, payload });
  }

  async cancelRun(runId, { reason = 'Cancelled manually.', payload = {} } = {}) {
    return this.runLock.withLock(this._lockKey(runId), () => this._cancelStoredRun(runId, { reason, payload }));
  }

  async _cancelStoredRun(runId, { reason, payload }) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot cancel a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      return run;
    }

    return this._cancelRun(run, reason, payload);
  }

  async branchRun(
    runId,
    { checkpointId = null, input = null, metadata = {}, persist = true } = {}
  ) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot branch a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const sourceRun = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const branchedRun = sourceRun.branchFromCheckpoint(checkpointId, {
      input: input ?? sourceRun.input,
      metadata: {
        description: this.description,
        ...metadata,
      },
    });

    await this._emitEvent(branchedRun, 'run_branched', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: branchedRun.metadata.lineage.branchCheckpointId,
    });
    await this._checkpointRun(branchedRun, 'run_branched', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: branchedRun.metadata.lineage.branchCheckpointId,
    });

    if (persist) {
      await this._persistRun(branchedRun);
    }

    return branchedRun;
  }

  async createDistributedEnvelope(
    runId,
    { action = 'resume', checkpointId = null, metadata = {} } = {}
  ) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot create a distributed envelope without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    return DistributedRunEnvelope.create(run, {
      runtimeKind: 'agent',
      action,
      checkpointId,
      metadata: {
        ...(run.metadata?.executionIdentity ? { executionIdentity: run.metadata.executionIdentity } : {}),
        ...(run.metadata?.distributedAuthScope
          ? { distributedAuthScope: run.metadata.distributedAuthScope }
          : {}),
        ...metadata,
      },
    });
  }

  async continueDistributedRun(envelope, config = {}) {
    const parsed = DistributedRunEnvelope.parse(envelope);
    if (parsed.runtimeKind !== 'agent') {
      throw new RunNotFoundError(`Envelope runtimeKind "${parsed.runtimeKind}" is not valid for Agent.`);
    }

    if (parsed.action === 'resume') {
      return this.resumeRun(parsed.runId, config);
    }

    if (parsed.action === 'branch') {
      const branch = await this.branchRun(parsed.runId, {
        checkpointId: parsed.checkpointId || null,
        metadata: parsed.metadata || {},
      });

      return this.resumeRun(branch.id, config);
    }

    if (parsed.action === 'replay') {
      return this.replayRun(parsed.runId, {
        checkpointId: parsed.checkpointId || null,
        metadata: parsed.metadata || {},
      });
    }

    throw new RunNotFoundError(`Unsupported distributed run action "${parsed.action}".`);
  }

  async replayRun(
    runId,
    { persist = true, metadata = {}, replayRunId = null, checkpointId = null } = {}
  ) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot replay a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const sourceRun = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const replayRun =
      checkpointId
        ? sourceRun.branchFromCheckpoint(checkpointId, {
            id: replayRunId || `${sourceRun.id}:partial-replay:${Date.now()}`,
            metadata: {
              description: this.description,
              ...metadata,
            },
          })
        : Run.fromJSON(sourceRun.toJSON());
    replayRun.id =
      replayRunId ||
      replayRun.id ||
      `${sourceRun.id}:${checkpointId ? 'partial-replay' : 'replay'}:${Date.now()}`;
    if (!checkpointId) {
      replayRun.id = replayRunId || `${sourceRun.id}:replay:${Date.now()}`;
    }
    replayRun.metadata = {
      ...replayRun.metadata,
      ...metadata,
      replay: {
        mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId || null,
        replayedAt: new Date().toISOString(),
      },
      lineage: {
        ...replayRun.metadata.lineage,
        rootRunId: sourceRun.metadata?.lineage?.rootRunId || sourceRun.id,
        parentRunId: null,
        childRunIds: [],
      },
    };
    replayRun.events = [];
    replayRun.checkpoints = [];
    replayRun.timestamps = {
      createdAt: new Date().toISOString(),
      startedAt: null,
      updatedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      cancelledAt: null,
    };
    replayRun.pendingApproval = null;
    replayRun.pendingPause = null;

    replayRun.setStatus('running');
    await this._emitEvent(replayRun, 'replay_started', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
    });
    await this._checkpointRun(replayRun, 'replay_started', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
    });

    if (!checkpointId) {
      replayRun.output = sourceRun.output;
      replayRun.state = JSON.parse(JSON.stringify(sourceRun.state || {}));
      replayRun.messages = JSON.parse(JSON.stringify(sourceRun.messages || []));
      replayRun.steps = JSON.parse(JSON.stringify(sourceRun.steps || []));
      replayRun.toolCalls = JSON.parse(JSON.stringify(sourceRun.toolCalls || []));
      replayRun.toolResults = JSON.parse(JSON.stringify(sourceRun.toolResults || []));
      replayRun.metrics = JSON.parse(JSON.stringify(sourceRun.metrics || replayRun.metrics));
      replayRun.errors = JSON.parse(JSON.stringify(sourceRun.errors || []));
      replayRun.setStatus(sourceRun.status);
    } else {
      replayRun.setStatus('paused');
      replayRun.pendingPause = {
        reason: `Frozen replay prepared from checkpoint "${checkpointId}".`,
        stage: 'replay',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId,
      };
    }

    await this._emitEvent(replayRun, 'replay_completed', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      status: checkpointId ? replayRun.status : sourceRun.status,
    });
    await this._checkpointRun(replayRun, 'replay_completed', {
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      status: checkpointId ? replayRun.status : sourceRun.status,
    });

    if (persist) {
      await this._persistRun(replayRun);
    }

    return replayRun;
  }

  inspectRun(run) {
    return RunInspector.summarize(run);
  }
}

module.exports = { Agent };
