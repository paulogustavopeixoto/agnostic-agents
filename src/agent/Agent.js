const { RetryManager } = require('../utils/RetryManager');
const { MissingInfoResolver } = require('./MissingInfoResolver');
const { Run } = require('../runtime/Run');
const { ToolPolicy } = require('../runtime/ToolPolicy');
const { EventBus } = require('../runtime/EventBus');
const { ConsoleDebugSink } = require('../runtime/ConsoleDebugSink');
const { RunInspector } = require('../runtime/RunInspector');
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
      onEvent = null,
      eventBus = null,
      debug = false,
    } = {}
  ) {
    this.adapter = adapter;
    this.toolRegistry = null;
    this.tools = this._normalizeTools(tools);
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
    this.rag = rag;
    this.retryManager = retryManager;
    this.mcpClient = mcpClient;
    this.runStore = runStore;
    this.toolPolicy = toolPolicy instanceof ToolPolicy ? toolPolicy : new ToolPolicy(toolPolicy || {});
    this.onEvent = onEvent;
    this.eventBus = eventBus instanceof EventBus ? eventBus : new EventBus(eventBus || {});
    if (debug) {
      this.eventBus.addSink(new ConsoleDebugSink());
    }
    this.debug = debug;
    this.resolver = new MissingInfoResolver({
      memory: this.memory,
      rag: this.rag,
      askUser,
      tools: this.tools,
    });
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
      messageCount: run.messages.length,
      toolCallCount: run.toolCalls.length,
      toolResultCount: run.toolResults.length,
    });
    await this._persistRun(run);
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

    return facts.length ? `Here is what I remember:\n${facts.join('\n')}\n` : '';
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

      const retrieval = await this.retryManager.execute(() =>
        typeof this.rag.searchWithProvenance === 'function'
          ? this.rag.searchWithProvenance(userMessage, config.ragOptions || {})
          : this.rag.search(userMessage, config.ragOptions || {})
      );
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
    const memoryContext = await this._retrieveMemoryContext(userPrompt);
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
    if (!this.adapter?.generateText) {
      throw new AdapterCapabilityError('Agent requires an adapter with generateText().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const run = new Run({
      input: userMessage,
      state: { ...(finalConfig.state || {}) },
      metadata: {
        description: this.description,
      },
    });

    run.setStatus('running');
    await this._persistRun(run);

    try {
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
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot resume a run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);

    if (run.status === 'paused' && run.pendingPause) {
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

      if (!approvalResult?.approved) {
        throw new ToolPolicyError(
          approvalResult?.reason || `Execution denied for tool "${run.pendingApproval.toolName}".`
        );
      }

      const toolResult = await this.retryManager.execute(() =>
        this._handleToolCall(approvalRequest.toolCall, { run })
      );
      this._appendToolMessages(run, approvalRequest.toolCall, toolResult);
      run.pendingApproval = null;
      await this._persistRun(run);
      await this._checkpointRun(run, 'tool_approved_and_resumed', {
        toolName: approvalRequest.toolName,
      });

      return this._continueRun(run, { ...this.defaultConfig, ...config }, { skipPromptBuild: true });
    } catch (error) {
      return this._failRun(run, error);
    }
  }

  async _continueRun(run, finalConfig, options = {}) {
    let result;

    try {
      while (true) {
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

        result = await this.retryManager.execute(() =>
          this.adapter.generateText(run.messages, { ...finalConfig, tools: this.tools })
        );
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

          const gate = await this._gateToolCall(run, toolCall, finalConfig);
          if (gate.status === 'waiting_for_approval') {
            await this._checkpointRun(run, 'waiting_for_approval', {
              toolName: toolCall.name,
            });
            return run;
          }

          const toolResult = await this.retryManager.execute(() =>
            this._handleToolCall(toolCall, { run })
          );

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
      run.setStatus('completed');

      if (this.memory?.storeConversation) {
        this.memory.storeConversation(run.input, result.message || JSON.stringify(result));
      } else if (this.memory?.store) {
        this.memory.store(run.input, result);
      }

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
    run.setStatus('failed');
    await this._emitEvent(run, 'run_failed', {
      name: error.name || 'Error',
      message: error.message || String(error),
    });
    await this._checkpointRun(run, 'run_failed', {
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
      runId: run.id,
      toolName: toolCall.name,
      toolCall,
      arguments: toolCall.arguments || {},
      metadata: toolInstance.metadata || {},
    };

    run.addToolCall(request);
    await this._emitEvent(run, 'tool_requested', request);

    const decision = this.toolPolicy.evaluate(toolInstance, toolCall.arguments || {}, {
      run,
      config: finalConfig,
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
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    const beforeExecution = await this.toolPolicy.onBeforeExecute(
      toolInstance,
      toolCall.arguments || {},
      { run, config: finalConfig }
    );

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
      await this._emitEvent(run, 'approval_requested', run.pendingApproval);
      await this._persistRun(run);
      return { status: 'waiting_for_approval' };
    }

    return { status: 'approved' };
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
  }

  async _handleToolCall(toolCall, runtime = {}) {
    const toolInstance = this.tools.find(tool => tool.name === toolCall.name);
    if (!toolInstance) {
      throw new ToolNotFoundError(`Tool ${toolCall.name} not found.`);
    }

    const resolvedArgs = await this.resolver.resolve(toolInstance, toolCall.arguments || {});
    const toolContext = { toolCall, run: runtime.run || null };
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

    try {
      const toolStartedAt = Date.now();
      const rawResult = await toolInstance.call(resolvedArgs, toolContext);
      const result = await this.toolPolicy.onAfterExecute(toolInstance, rawResult, {
        run: runtime.run || null,
        toolCall,
      });
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
      if (runtime.run) {
        if (step) {
          this._failStep(runtime.run, step.id, error);
        }
        await this._emitEvent(runtime.run, 'tool_failed', {
          toolName: toolCall.name,
          message: error.message || String(error),
        });
      }

      throw new ToolExecutionError(
        `Tool "${toolCall.name}" failed: ${error.message || String(error)}`
      );
    }
  }

  async analyzeImage(imageData, config = {}) {
    if (!this.adapter?.analyzeImage) {
      throw new AdapterCapabilityError('Adapter does not support analyzeImage().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(
      config.prompt || 'Analyze this image.',
      finalConfig
    );

    return this.retryManager.execute(() =>
      this.adapter.analyzeImage(imageData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  async generateImage(userPrompt, config = {}) {
    if (!this.adapter?.generateImage) {
      throw new AdapterCapabilityError('Adapter does not support generateImage().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(userPrompt, finalConfig);

    return this.retryManager.execute(() => this.adapter.generateImage(promptObject, finalConfig));
  }

  async transcribeAudio(audioData, config = {}) {
    if (!this.adapter?.transcribeAudio) {
      throw new AdapterCapabilityError('Adapter does not support transcribeAudio().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    return this.retryManager.execute(() => this.adapter.transcribeAudio(audioData, finalConfig));
  }

  async generateAudio(text, config = {}) {
    if (!this.adapter?.generateAudio) {
      throw new AdapterCapabilityError('Adapter does not support generateAudio().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    return this.retryManager.execute(() => this.adapter.generateAudio(text, finalConfig));
  }

  async analyzeVideo(videoData, config = {}) {
    if (!this.adapter?.analyzeVideo) {
      throw new AdapterCapabilityError('Adapter does not support analyzeVideo().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(
      config.prompt || 'Describe this video.',
      finalConfig
    );

    return this.retryManager.execute(() =>
      this.adapter.analyzeVideo(videoData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  async generateVideo(text, config = {}) {
    if (!this.adapter?.generateVideo) {
      throw new AdapterCapabilityError('Adapter does not support generateVideo().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(text, finalConfig);

    return this.retryManager.execute(() =>
      this.adapter.generateVideo(promptObject.user, finalConfig)
    );
  }

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

  inspectRun(run) {
    return RunInspector.summarize(run);
  }
}

module.exports = { Agent };
