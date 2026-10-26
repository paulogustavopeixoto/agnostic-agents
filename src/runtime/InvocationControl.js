const { ToolPolicyError, RunCancelledError } = require('../errors');

async function invokeWithDeadline(invoke, { signal, timeoutMs = null } = {}) {
  if (timeoutMs !== null && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647)) {
    throw new TypeError('Invalid invocation timeout.');
  }
  if (signal?.aborted) throw new RunCancelledError('Invocation cancelled.');
  const controller = new AbortController();
  let timer;
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const cancel = () => controller.abort(new RunCancelledError('Invocation cancelled.'));
  const onAbort = () => rejectAbort(controller.signal.reason);
  controller.signal.addEventListener('abort', onAbort, { once: true });
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  if (timeoutMs !== null) timer = setTimeout(() => {
    const error = new ToolPolicyError('Invocation deadline exceeded; external outcome may be uncertain.');
    error.uncertain = true;
    controller.abort(error);
  }, timeoutMs);
  try {
    return await Promise.race([Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return invoke(controller.signal);
    }), aborted]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
  }
}

async function* iterateWithControl(factory, { signal, timeoutMs = null } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort(new RunCancelledError('Stream cancelled.'));
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  let iterator;
  let ended = false;
  try {
    const iterable = await invokeWithDeadline(() => factory(controller.signal), { signal: controller.signal, timeoutMs });
    iterator = iterable[Symbol.asyncIterator]();
    while (true) {
      const next = await invokeWithDeadline(() => iterator.next(), { signal: controller.signal, timeoutMs });
      if (next.done) { ended = true; return; }
      yield next.value;
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!ended) controller.abort(new RunCancelledError('Stream closed.'));
    if (iterator?.return) await invokeWithDeadline(() => iterator.return(), { timeoutMs: timeoutMs || 1000 });
  }
}

module.exports = { invokeWithDeadline, iterateWithControl };
