const { randomUUID } = require('crypto');
const { BaseProvider } = require('./BaseProvider');
const { BoundedHttpClient } = require('../utils/BoundedHttpClient');
const { ToolExecutionError } = require('../errors');

class CompatibleChatAdapter extends BaseProvider {
  constructor({ origin, apiKey, model, fetchImpl, timeoutMs, maxBytes } = {}) {
    super({ capabilities: { toolCalling: true } });
    if (typeof apiKey !== 'string' || !apiKey.trim() || typeof model !== 'string' || !model.trim()) {
      throw new TypeError('An API key and explicit model are required.');
    }
    this.model = model;
    this.http = new BoundedHttpClient({ origin, headers: { Authorization: `Bearer ${apiKey}` }, fetchImpl, timeoutMs, maxBytes });
  }

  async generateText(prompt, config = {}) {
    const legacyIds = new Map();
    const messages = Array.isArray(prompt) ? prompt.map((message, index) => {
      if (message.role === 'function') return { role: 'tool', tool_call_id: message.tool_call_id || legacyIds.get(message.name) || message.name,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) };
      if (message.function_call) {
        const id = message.function_call.id || `call_${index}_${message.function_call.name}`;
        legacyIds.set(message.function_call.name, id);
        return { role: 'assistant', content: message.content || null,
        tool_calls: [{ id, type: 'function', function: {
          name: message.function_call.name, arguments: message.function_call.arguments,
        } }] };
      }
      return message;
    }) : [
      ...(prompt?.system ? [{ role: 'system', content: prompt.system }] : []),
      ...(prompt?.context ? [{ role: 'user', content: prompt.context }] : []),
      { role: 'user', content: typeof prompt === 'string' ? prompt : prompt?.user || '' },
    ];
    const tools = config.tools?.map(tool => ({ type: 'function', function: tool.toOpenAIFunction() }));
    const result = await this.http.request({ path: '/v1/chat/completions', signal: config.signal,
      body: { model: config.model || this.model, messages, max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.7, ...(tools?.length ? { tools, tool_choice: 'auto' } : {}) } });
    try {
    const choice = result?.choices?.[0];
    if (!choice?.message || (choice.message.content !== null && choice.message.content !== undefined &&
        typeof choice.message.content !== 'string')) throw new Error('Unsupported chat result.');
    const toolCalls = (choice.message.tool_calls || []).map(call => {
      const args = JSON.parse(call.function.arguments);
      if (!args || typeof args !== 'object' || Array.isArray(args) || typeof call.function.name !== 'string') {
        throw new Error('Invalid provider tool call.');
      }
      return { id: call.id || randomUUID(), name: call.function.name, arguments: args };
    });
    return { message: choice.message.content || '', ...(toolCalls.length ? { toolCalls } : {}),
      completionStatus: ['stop', 'tool_calls'].includes(choice.finish_reason) ? 'completed' : 'incomplete',
      usage: result.usage ? { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens,
        total: result.usage.total_tokens } : undefined };
    } catch {
      const error = new ToolExecutionError('Invalid provider chat result.');
      error.retryable = false;
      throw error;
    }
  }

  async generateToolResult(prompt, toolCall, toolResult, config = {}) {
    const messages = Array.isArray(prompt) ? [...prompt] : [
      ...(prompt?.system ? [{ role: 'system', content: prompt.system }] : []),
      ...(prompt?.context ? [{ role: 'user', content: prompt.context }] : []),
      { role: 'user', content: prompt?.user || '' },
    ];
    if (!Array.isArray(prompt)) messages.push(
      { role: 'assistant', content: null, tool_calls: [{ id: toolCall.id || toolCall.name, type: 'function',
        function: { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) } }] },
      { role: 'tool', tool_call_id: toolCall.id || toolCall.name, content: JSON.stringify(toolResult) });
    return (await this.generateText(messages, config)).message;
  }
}

class MistralAdapter extends CompatibleChatAdapter {
  constructor(apiKey, options = {}) { super({ ...options, apiKey, origin: 'https://api.mistral.ai' }); }
}
class XAIAdapter extends CompatibleChatAdapter {
  constructor(apiKey, options = {}) { super({ ...options, apiKey, origin: 'https://api.x.ai' }); }
}
module.exports = { CompatibleChatAdapter, MistralAdapter, XAIAdapter };
