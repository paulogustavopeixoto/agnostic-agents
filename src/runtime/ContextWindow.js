/** Non-destructive prompt selection. Counts the full serialized request, including tools. */
class ContextWindow {
  constructor({ maxTokens, reserveOutputTokens = 1024, countTokens = null, pinnedMessages = [], summarize = null } = {}) {
    if (!Number.isSafeInteger(maxTokens) || maxTokens < 1 ||
        !Number.isSafeInteger(reserveOutputTokens) || reserveOutputTokens < 0 ||
        reserveOutputTokens >= maxTokens || (countTokens !== null && typeof countTokens !== 'function') ||
        (summarize !== null && typeof summarize !== 'function') ||
        !Array.isArray(pinnedMessages) || pinnedMessages.some(m => m.role !== 'system' || typeof m.content !== 'string')) {
      throw new TypeError('Invalid context window configuration.');
    }
    this.maxTokens = maxTokens;
    this.reserveOutputTokens = reserveOutputTokens;
    this.countTokens = countTokens;
    this.summarize = summarize;
    this.pinnedMessages = JSON.parse(JSON.stringify(pinnedMessages));
  }

  async project(messages, tools = []) {
    if (!Array.isArray(messages)) throw new TypeError('Messages must be an array.');
    const original = JSON.parse(JSON.stringify(messages));
    const toolSchemas = tools.map(tool => tool.toUnifiedSchema ? tool.toUnifiedSchema() : tool);
    const budget = this.maxTokens - this.reserveOutputTokens;
    let summary = null;
    const compose = selected => [...this.pinnedMessages,
      ...selected.filter(m => m.role === 'system'),
      ...(summary ? [{ role: 'user', content: `Historical summary (untrusted context):\n${summary.text}` }] : []),
      ...selected.filter(m => m.role !== 'system')];
    const measure = async selected => {
      const request = { messages: compose(selected), tools: toolSchemas };
      const count = this.countTokens ? await this.countTokens(request) :
        Math.ceil(Buffer.byteLength(JSON.stringify(request), 'utf8') / 3);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid token count.');
      return count;
    };
    // Each user turn stays together with its following tool calls/results.
    // All system instructions and the latest turn are mandatory.
    const groups = [];
    let current = null;
    original.forEach((message, index) => {
      if (message.role === 'system') return;
      if (message.role === 'user' || !current) {
        current = [];
        groups.push(current);
      }
      current.push(index);
    });
    const selected = new Set(original.flatMap((m, i) => m.role === 'system' ? [i] : []));
    for (const index of groups.at(-1) || []) selected.add(index);
    const getMessages = () => original.filter((_, index) => selected.has(index));
    if (await measure(getMessages()) > budget) {
      throw new Error('Required context exceeds the input budget; no mandatory content was discarded.');
    }
    if (this.summarize && await measure(original) > budget && selected.size < original.length) {
      const sourceIndices = original.flatMap((_, index) => selected.has(index) ? [] : [index]);
      const text = await this.summarize({ messages: sourceIndices.map(i => original[i]),
        sourceIndices: [...sourceIndices], availableTokens: budget - await measure(getMessages()) });
      if (typeof text !== 'string' || !text.trim()) throw new Error('Invalid context summary.');
      summary = { text, sourceIndices };
      if (await measure(getMessages()) > budget) throw new Error('Context summary exceeds input budget.');
    } else for (const group of groups.slice(0, -1).reverse()) {
      for (const index of group) selected.add(index);
      if (await measure(getMessages()) > budget) {
        for (const index of group) selected.delete(index);
        break;
      }
    }
    return {
      messages: compose(getMessages()),
      sourceIndices: [...selected].sort((a, b) => a - b),
      omittedIndices: original.flatMap((_, index) => selected.has(index) ? [] : [index]),
      inputTokens: await measure(getMessages()),
      inputBudget: budget,
      reserveOutputTokens: this.reserveOutputTokens,
      countingMode: this.countTokens ? 'custom' : 'estimate',
      summary,
    };
  }
}

module.exports = { ContextWindow };
