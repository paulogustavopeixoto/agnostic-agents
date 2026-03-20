class PolicyAutonomyAttestation {
  static issue({
    candidateId = 'candidate',
    policyPack = null,
    autonomyEnvelope = null,
    jurisdictions = [],
    approvedBy = [],
    notes = null,
  } = {}) {
    return {
      kind: 'agnostic-agents/policy-autonomy-attestation',
      version: '1.0.0',
      candidateId,
      policy: normalizePolicy(policyPack),
      autonomyEnvelope: normalizeEnvelope(autonomyEnvelope),
      jurisdictions: [...jurisdictions],
      approvedBy: [...approvedBy],
      notes,
      summary: {
        candidateId,
        policyPackId: policyPack?.id || null,
        autonomyEnvelopeId: autonomyEnvelope?.id || null,
        jurisdictionCount: jurisdictions.length,
        approverCount: approvedBy.length,
        valid: approvedBy.length > 0,
      },
    };
  }
}

function normalizePolicy(policyPack) {
  if (!policyPack) {
    return null;
  }

  return {
    id: policyPack.id || null,
    name: policyPack.name || null,
    version: policyPack.version || null,
  };
}

function normalizeEnvelope(autonomyEnvelope) {
  if (!autonomyEnvelope) {
    return null;
  }

  return {
    id: autonomyEnvelope.id || null,
    budget: autonomyEnvelope.budget || null,
    threshold: autonomyEnvelope.threshold || null,
  };
}

module.exports = { PolicyAutonomyAttestation };
