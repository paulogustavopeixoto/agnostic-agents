const { PolicyPack } = require('./PolicyPack');

class PolicyLifecycleManager {
  constructor({ draft = null, active = null, history = [] } = {}) {
    this.draft = draft ? this._normalizePack(draft) : null;
    this.active = active ? this._normalizePack(active) : null;
    this.history = Array.isArray(history) ? history.map(entry => this._normalizeHistoryEntry(entry)) : [];
  }

  setDraft(policyPack) {
    this.draft = this._normalizePack(policyPack);
    return this.draft;
  }

  activate(policyPack, metadata = {}) {
    return this.promote(policyPack, metadata);
  }

  promote(policyPack = this.draft, metadata = {}) {
    if (!policyPack) {
      throw new Error('PolicyLifecycleManager.promote requires a draft or explicit policy pack.');
    }

    const next = this._normalizePack(policyPack);
    const previous = this.active;

    if (previous) {
      this.history.unshift({
        type: 'previous_active',
        policyPack: previous,
        promotedAt: metadata.promotedAt || new Date().toISOString(),
        reason: metadata.reason || 'Superseded by a promoted policy pack.',
        rollback: {
          action: 'restore_policy_pack',
          policyPackId: previous.id,
          version: previous.version,
        },
      });
    }

    this.active = next;
    if (this.draft && this._sameIdentity(this.draft, next)) {
      this.draft = null;
    }

    return {
      action: 'promote',
      active: this.active,
      previousActive: previous,
      summary: this.summarize(),
      metadata: {
        promotedAt: metadata.promotedAt || new Date().toISOString(),
        reason: metadata.reason || 'Promoted to active.',
      },
    };
  }

  rollback({ version = null, policyPackId = null, reason = 'Rolled back to a previous active policy pack.' } = {}) {
    const entry = this.history.find(item => {
      if (policyPackId && item.policyPack.id === policyPackId) return true;
      if (version && item.policyPack.version === version) return true;
      return !policyPackId && !version;
    });

    if (!entry) {
      throw new Error('PolicyLifecycleManager.rollback could not find a matching historical policy pack.');
    }

    const previousActive = this.active;
    this.active = this._normalizePack(entry.policyPack);
    if (previousActive) {
      this.history.unshift({
        type: 'rollback_source',
        policyPack: previousActive,
        promotedAt: new Date().toISOString(),
        reason,
        rollback: {
          action: 'restore_policy_pack',
          policyPackId: previousActive.id,
          version: previousActive.version,
        },
      });
    }

    return {
      action: 'rollback',
      active: this.active,
      rolledBackFrom: previousActive,
      summary: this.summarize(),
      metadata: {
        rolledBackTo: this.active.version || this.active.id || null,
        reason,
      },
    };
  }

  summarize() {
    return {
      draft: this.draft
        ? {
            id: this.draft.id,
            name: this.draft.name,
            version: this.draft.version,
          }
        : null,
      active: this.active
        ? {
            id: this.active.id,
            name: this.active.name,
            version: this.active.version,
          }
        : null,
      historyCount: this.history.length,
      rollbackTargets: this.history.map(entry => ({
        id: entry.policyPack.id,
        version: entry.policyPack.version,
        reason: entry.reason || null,
      })),
    };
  }

  _normalizePack(policyPack) {
    return policyPack instanceof PolicyPack ? policyPack : PolicyPack.fromJSON(policyPack || {});
  }

  _normalizeHistoryEntry(entry = {}) {
    return {
      ...entry,
      policyPack: this._normalizePack(entry.policyPack || entry),
    };
  }

  _sameIdentity(left, right) {
    return (left.id || null) === (right.id || null) && (left.version || null) === (right.version || null);
  }
}

module.exports = { PolicyLifecycleManager };
