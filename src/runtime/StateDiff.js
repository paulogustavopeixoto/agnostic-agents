const { StateBundle } = require('./StateBundle');

class StateDiff {
  static diff(left, right) {
    const before = left instanceof StateBundle ? left : StateBundle.fromJSON(left || {});
    const after = right instanceof StateBundle ? right : StateBundle.fromJSON(right || {});

    return {
      left: {
        runId: before.run?.id || null,
        status: before.run?.status || null,
      },
      right: {
        runId: after.run?.id || null,
        status: after.run?.status || null,
      },
      statusChanged: before.run?.status !== after.run?.status,
      checkpointCountChanged: (before.run?.checkpoints?.length || 0) !== (after.run?.checkpoints?.length || 0),
      messageCountChanged: (before.run?.messages?.length || 0) !== (after.run?.messages?.length || 0),
      toolCallCountChanged: (before.run?.toolCalls?.length || 0) !== (after.run?.toolCalls?.length || 0),
      stateKeysAdded: StateDiff._diffAddedKeys(before.run?.state || {}, after.run?.state || {}),
      stateKeysRemoved: StateDiff._diffAddedKeys(after.run?.state || {}, before.run?.state || {}),
      memoryLayersAdded: StateDiff._diffAddedKeys(before.memory || {}, after.memory || {}),
      memoryLayersRemoved: StateDiff._diffAddedKeys(after.memory || {}, before.memory || {}),
    };
  }

  static _diffAddedKeys(left = {}, right = {}) {
    return Object.keys(right).filter(key => !(key in left));
  }
}

module.exports = { StateDiff };
