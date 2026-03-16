const { Run } = require('./Run');

class TraceDiffer {
  static diff(leftRun, rightRun) {
    const left = leftRun instanceof Run ? leftRun : Run.fromJSON(leftRun || {});
    const right = rightRun instanceof Run ? rightRun : Run.fromJSON(rightRun || {});

    const summarizeSteps = run =>
      (run.steps || []).map(step => ({
        type: step.type,
        status: step.status,
        output: step.output ?? null,
      }));

    const summarizeEvents = run => (run.events || []).map(event => event.type);
    const summarizeToolCalls = run =>
      (run.toolCalls || []).map(call => ({
        toolName: call.toolName || call.name || null,
        arguments: call.arguments || null,
      }));

    const leftSteps = summarizeSteps(left);
    const rightSteps = summarizeSteps(right);
    const leftEvents = summarizeEvents(left);
    const rightEvents = summarizeEvents(right);
    const leftToolCalls = summarizeToolCalls(left);
    const rightToolCalls = summarizeToolCalls(right);

    return {
      leftRunId: left.id,
      rightRunId: right.id,
      statusChanged: left.status !== right.status,
      outputChanged: JSON.stringify(left.output ?? null) !== JSON.stringify(right.output ?? null),
      eventCountDelta: rightEvents.length - leftEvents.length,
      stepCountDelta: rightSteps.length - leftSteps.length,
      toolCallCountDelta: rightToolCalls.length - leftToolCalls.length,
      eventTypesAdded: rightEvents.filter(type => !leftEvents.includes(type)),
      eventTypesRemoved: leftEvents.filter(type => !rightEvents.includes(type)),
      firstDivergingStepIndex: TraceDiffer._findFirstDivergingIndex(leftSteps, rightSteps),
      firstDivergingEventIndex: TraceDiffer._findFirstDivergingIndex(leftEvents, rightEvents),
      firstDivergingToolCallIndex: TraceDiffer._findFirstDivergingIndex(leftToolCalls, rightToolCalls),
    };
  }

  static _findFirstDivergingIndex(left, right) {
    const max = Math.max(left.length, right.length);
    for (let index = 0; index < max; index += 1) {
      if (JSON.stringify(left[index] ?? null) !== JSON.stringify(right[index] ?? null)) {
        return index;
      }
    }

    return -1;
  }
}

module.exports = { TraceDiffer };
