const { randomUUID } = require('crypto');

function commonMessages(prompt) {
  if (Array.isArray(prompt)) return prompt;
  if (typeof prompt === 'string') return [{ role: 'user', content: prompt }];
  return [
    ...(prompt.system ? [{ role: 'system', content: prompt.system }] : []),
    ...(prompt.context ? [{ role: 'user', content: prompt.context }] : []),
    ...(prompt.user ? [{ role: 'user', content: prompt.user }] : []),
  ];
}

function anthropicMessages(prompt) {
  const system = [], messages = [], pending = new Map();
  for (const message of commonMessages(prompt)) {
    if (message.role === 'system') { system.push(message.content); continue; }
    if (message.role === 'assistant' && (message.function_call || message.tool_calls)) {
      const calls = message.tool_calls || [{ id: message.function_call.id, function: message.function_call }];
      const content = message.content ? [{ type: 'text', text: message.content }] : [];
      for (const call of calls) {
        const fn = call.function, id = call.id || randomUUID();
        const input = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments || {};
        content.push({ type: 'tool_use', id, name: fn.name, input });
        pending.set(id, { id, name: fn.name });
      }
      messages.push({ role: 'assistant', content });
    } else if (['function', 'tool'].includes(message.role)) {
      const key = message.tool_call_id || message.name;
      const call = pending.get(key) || [...pending.values()].find(item => item.name === message.name);
      if (!call) throw new TypeError('Unmatched tool result.');
      pending.delete(call.id);
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }] });
    } else {
      if (!['user', 'assistant'].includes(message.role)) throw new TypeError('Unsupported message role.');
      messages.push({ role: message.role, content: message.content });
    }
  }
  return { system: system.length ? system.join('\n\n') : undefined, messages };
}

function geminiMessages(prompt) {
  const system = [], contents = [];
  for (const message of commonMessages(prompt)) {
    if (message.role === 'system') { system.push(message.content); continue; }
    const parts = [];
    if (message.function_call || message.tool_calls) {
      if (message.content) parts.push({ text: message.content });
      for (const call of message.tool_calls || [{ function: message.function_call }]) {
        const fn = call.function;
        parts.push({ functionCall: { name: fn.name,
          args: typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments || {} } });
      }
    } else if (['tool', 'function'].includes(message.role)) {
      let response;
      try { response = JSON.parse(message.content); } catch { response = { result: message.content }; }
      if (!response || typeof response !== 'object' || Array.isArray(response)) response = { result: response };
      parts.push({ functionResponse: { name: message.name, response } });
    } else parts.push({ text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) });
    contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts });
  }
  return { systemInstruction: system.length ? system.join('\n\n') : undefined, contents };
}

function completionState(reason) {
  const incomplete = ['length', 'max_tokens', 'MAX_TOKENS', 'pause_turn'].includes(reason);
  const completed = !reason || ['stop', 'tool_calls', 'function_call', 'end_turn', 'tool_use', 'stop_sequence', 'STOP'].includes(reason);
  return { finishReason: reason, completionStatus: incomplete ? 'incomplete' : completed ? 'completed' : 'uncertain' };
}
module.exports = { commonMessages, anthropicMessages, geminiMessages, completionState };
