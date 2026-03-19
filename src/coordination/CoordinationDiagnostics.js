class CoordinationDiagnostics {
  summarize({
    review = null,
    resolution = null,
    plan = null,
    verification = null,
    quality = null,
  } = {}) {
    const flags = [];
    const recommendations = [];

    if (review?.summary?.disagreement || resolution?.disagreement) {
      flags.push('reviewer_disagreement');
      recommendations.push('Review the disagreement path before allowing automatic execution.');
    }

    if (resolution?.action === 'escalate') {
      flags.push('operator_escalation');
      recommendations.push('Escalate to an operator because coordination did not converge safely.');
    }

    if (plan?.gaps?.length) {
      flags.push('missing_roles');
      recommendations.push('Fill missing planner/executor/verifier/critic/aggregator roles before retrying.');
    }

    if (verification?.action === 'escalate' || verification?.summary?.action === 'escalate') {
      flags.push('verification_escalation');
      recommendations.push('Use the verification trace to inspect conflicting verifier and critic outcomes.');
    }

    if (verification?.summary?.disagreement) {
      flags.push('verification_disagreement');
      recommendations.push('Compare adversarial and primary verification results before accepting the output.');
    }

    const topVerifierScore = quality?.verifierQuality?.[0]?.score ?? null;
    if (typeof topVerifierScore === 'number' && topVerifierScore < 0.7) {
      flags.push('low_verifier_quality');
      recommendations.push('Strengthen verifier composition or routing before increasing autonomy.');
    }

    return {
      flags,
      recommendations,
      summary: {
        critiqueCount: review?.summary?.total || 0,
        disagreement: Boolean(review?.summary?.disagreement || resolution?.disagreement),
        resolutionAction: resolution?.action || null,
        roleStrategy: plan?.strategy || null,
        missingRoles: plan?.gaps || [],
        verificationAction: verification?.action || verification?.summary?.action || null,
        qualitySnapshot: {
          topVerifierScore,
          topExecutorScore: quality?.executorQuality?.[0]?.score ?? null,
        },
      },
    };
  }
}

module.exports = { CoordinationDiagnostics };
