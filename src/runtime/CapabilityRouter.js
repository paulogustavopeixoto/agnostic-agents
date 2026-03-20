const { HistoricalRoutingAdvisor } = require('./HistoricalRoutingAdvisor');

class CapabilityRouter {
  constructor({ candidates = [], routingAdvisor = null, weights = {} } = {}) {
    this.candidates = Array.isArray(candidates) ? [...candidates] : [];
    this.routingAdvisor =
      routingAdvisor instanceof HistoricalRoutingAdvisor ? routingAdvisor : routingAdvisor;
    this.weights = {
      taskType: 4,
      preferredKind: 2,
      cost: 2,
      risk: 2,
      latency: 2,
      preferredCapability: 1.5,
      reputation: 2,
      certification: 1,
      simulation: 3,
      historical: 3,
      ...weights,
    };
  }

  register(candidate = {}) {
    const normalized = this._normalizeCandidate(candidate);
    this.candidates.push(normalized);
    return normalized;
  }

  rank(request = {}, candidates = this.candidates) {
    const normalizedRequest = this._normalizeRequest(request);
    const normalizedCandidates = candidates.map(candidate => this._normalizeCandidate(candidate));
    const advisorOrder = this._rankWithAdvisor(normalizedCandidates, normalizedRequest);

    const ranked = normalizedCandidates
      .map(candidate => this._scoreCandidate(candidate, normalizedRequest, advisorOrder))
      .sort((left, right) => {
        if (left.eligible !== right.eligible) {
          return left.eligible ? -1 : 1;
        }
        return right.score - left.score;
      });

    return {
      request: normalizedRequest,
      selectedCandidate: ranked.find(item => item.eligible) || null,
      rankedCandidates: ranked,
      rejectedCandidates: ranked.filter(item => !item.eligible),
    };
  }

  select(request = {}, candidates = this.candidates) {
    const decision = this.rank(request, candidates);
    return {
      candidate: decision.selectedCandidate,
      explanation: this.explain(decision),
      rankedCandidates: decision.rankedCandidates,
      rejectedCandidates: decision.rejectedCandidates,
      request: decision.request,
    };
  }

  explain(decision = {}) {
    const selected = decision.selectedCandidate;
    if (!selected) {
      return 'No eligible candidate satisfied the requested capabilities, trust zone, and routing constraints.';
    }

    const positiveReasons = selected.reasons.filter(item => item.type === 'positive').map(item => item.message);
    const negativeReasons = selected.reasons.filter(item => item.type === 'constraint').map(item => item.message);

    return [
      `Selected "${selected.id}" (${selected.kind}) with score ${selected.score.toFixed(2)}.`,
      positiveReasons.length ? `Positive signals: ${positiveReasons.join(' ')}` : null,
      negativeReasons.length ? `Constraints applied: ${negativeReasons.join(' ')}` : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  _scoreCandidate(candidate, request, advisorOrder = new Map()) {
    const reasons = [];
    let eligible = true;
    let score = 0;

    if (
      request.disallowedKinds.length &&
      request.disallowedKinds.includes(candidate.kind)
    ) {
      eligible = false;
      reasons.push({ type: 'constraint', message: `Kind "${candidate.kind}" is disallowed for this route.` });
    }

    if (
      request.allowedKinds.length &&
      !request.allowedKinds.includes(candidate.kind)
    ) {
      eligible = false;
      reasons.push({ type: 'constraint', message: `Kind "${candidate.kind}" is outside the allowed route kinds.` });
    }

    if (
      request.requiredCapabilities.some(capability => !candidate.capabilities.includes(capability))
    ) {
      eligible = false;
      reasons.push({
        type: 'constraint',
        message: `Missing required capabilities: ${request.requiredCapabilities
          .filter(capability => !candidate.capabilities.includes(capability))
          .join(', ')}.`,
      });
    }

    if (request.trustZone && candidate.profile.trustZones.length) {
      if (!candidate.profile.trustZones.includes(request.trustZone)) {
        eligible = false;
        reasons.push({
          type: 'constraint',
          message: `Candidate trust zones do not include "${request.trustZone}".`,
        });
      }
    }

    if (request.requiresSimulation && !candidate.profile.supportsSimulation) {
      eligible = false;
      reasons.push({
        type: 'constraint',
        message: 'Candidate does not support simulation/sandbox execution.',
      });
    }

    if (request.taskType && candidate.profile.taskTypes.includes(request.taskType)) {
      score += this.weights.taskType;
      reasons.push({ type: 'positive', message: `Matched task type "${request.taskType}".` });
    }

    if (request.preferredKinds.includes(candidate.kind)) {
      score += this.weights.preferredKind;
      reasons.push({ type: 'positive', message: `Matched preferred kind "${candidate.kind}".` });
    }

    score += this._scoreTier(candidate.profile.costTier, request.costPreference, this.weights.cost, 'cost', reasons);
    score += this._scoreTier(candidate.profile.riskTier, request.riskPreference, this.weights.risk, 'risk', reasons);
    score += this._scoreTier(
      candidate.profile.latencyTier,
      request.latencyPreference,
      this.weights.latency,
      'latency',
      reasons
    );

    for (const capability of request.preferredCapabilities) {
      if (candidate.capabilities.includes(capability)) {
        score += this.weights.preferredCapability;
        reasons.push({ type: 'positive', message: `Supports preferred capability "${capability}".` });
      }
    }

    if (request.requiresSimulation && candidate.profile.supportsSimulation) {
      score += this.weights.simulation;
      reasons.push({ type: 'positive', message: 'Supports simulation before external execution.' });
    }

    if (typeof candidate.profile.reputationScore === 'number') {
      score += candidate.profile.reputationScore * this.weights.reputation;
      reasons.push({
        type: 'positive',
        message: `Reputation score contributes ${(
          candidate.profile.reputationScore * this.weights.reputation
        ).toFixed(2)}.`,
      });
    }

    if (candidate.profile.certificationLevel !== 'uncertified') {
      score += this.weights.certification;
      reasons.push({
        type: 'positive',
        message: `Certification level "${candidate.profile.certificationLevel}" improves eligibility.`,
      });
    }

    if (advisorOrder.has(candidate.id)) {
      const position = advisorOrder.get(candidate.id);
      const advisorBonus = Math.max(this.weights.historical - position, 0);
      score += advisorBonus;
      if (advisorBonus > 0) {
        reasons.push({
          type: 'positive',
          message: `Historical routing outcomes add ${advisorBonus.toFixed(2)}.`,
        });
      }
    }

    return {
      id: candidate.id,
      kind: candidate.kind,
      score: Number(score.toFixed(3)),
      eligible,
      reasons,
      candidate,
    };
  }

  _scoreTier(candidateTier, requestedTier, weight, label, reasons) {
    if (!requestedTier) {
      return 0;
    }
    if (candidateTier === requestedTier) {
      reasons.push({ type: 'positive', message: `Matched ${label} preference "${requestedTier}".` });
      return weight;
    }
    return 0;
  }

  _rankWithAdvisor(candidates, request) {
    if (!this.routingAdvisor?.rankProviders) {
      return new Map();
    }

    const routed = this.routingAdvisor.rankProviders(
      candidates.map(candidate => ({
        provider: { name: candidate.id },
        profile: {
          labels: [candidate.id],
          taskTypes: candidate.profile.taskTypes,
          riskTier: candidate.profile.riskTier,
          costTier: candidate.profile.costTier,
        },
      })),
      {
        methodName: request.methodName,
        args: [
          [],
          {
            route: {
              taskType: request.taskType,
              hints: {
                taskType: request.taskType,
                cost: request.costPreference,
                risk: request.riskPreference,
              },
            },
          },
        ],
      }
    );

    return new Map(
      routed.map((entry, index) => [entry.profile?.labels?.[0] || entry.provider?.name, index])
    );
  }

  _normalizeCandidate(candidate = {}) {
    return {
      id: candidate.id || candidate.name || `candidate-${this.candidates.length + 1}`,
      kind: candidate.kind || 'model',
      capabilities: Array.isArray(candidate.capabilities) ? [...candidate.capabilities] : [],
      profile: {
        taskTypes: [...(candidate.profile?.taskTypes || candidate.taskTypes || [])],
        trustZones: [...(candidate.profile?.trustZones || candidate.trustZones || [])],
        costTier: candidate.profile?.costTier || candidate.costTier || 'medium',
        riskTier: candidate.profile?.riskTier || candidate.riskTier || 'medium',
        latencyTier: candidate.profile?.latencyTier || candidate.latencyTier || 'medium',
        certificationLevel:
          candidate.profile?.certificationLevel || candidate.certificationLevel || 'uncertified',
        reputationScore:
          typeof (candidate.profile?.reputationScore ?? candidate.reputationScore) === 'number'
            ? candidate.profile?.reputationScore ?? candidate.reputationScore
            : 0.5,
        supportsSimulation: Boolean(
          candidate.profile?.supportsSimulation ?? candidate.supportsSimulation
        ),
      },
      metadata: { ...(candidate.metadata || {}) },
    };
  }

  _normalizeRequest(request = {}) {
    return {
      taskType: request.taskType || request.route?.taskType || request.route?.hints?.taskType || null,
      methodName: request.methodName || 'generateText',
      requiredCapabilities: [...(request.requiredCapabilities || [])],
      preferredCapabilities: [...(request.preferredCapabilities || [])],
      preferredKinds: [...(request.preferredKinds || [])],
      allowedKinds: [...(request.allowedKinds || [])],
      disallowedKinds: [...(request.disallowedKinds || [])],
      trustZone: request.trustZone || request.route?.trustZone || null,
      costPreference: request.costPreference || request.route?.cost || request.route?.hints?.cost || null,
      riskPreference: request.riskPreference || request.route?.risk || request.route?.hints?.risk || null,
      latencyPreference:
        request.latencyPreference || request.route?.latency || request.route?.hints?.latency || null,
      requiresSimulation: Boolean(request.requiresSimulation),
      metadata: { ...(request.metadata || {}) },
    };
  }
}

module.exports = { CapabilityRouter };
