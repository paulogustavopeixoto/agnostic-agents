const {
  AutonomyPolicyRegistry,
  InterventionPolicyRegistry,
  ApprovalDecisionCache,
  OperatorInterventionPlanner,
} = require('../index');

async function main() {
  const autonomyPolicies = new AutonomyPolicyRegistry({
    policies: [
      {
        id: 'eu-prod-review',
        environment: 'prod',
        tenant: 'acme',
        jurisdiction: 'eu',
        riskClass: 'high',
        reviewRequired: true,
        escalationAction: 'escalate',
        dataHandling: ['redact_pii', 'local_processing_only'],
        disallowedTools: ['bulk_export_contacts'],
      },
    ],
  });

  const interventionPolicies = new InterventionPolicyRegistry({
    policies: [
      {
        id: 'release-highrisk-prod',
        environment: 'prod',
        taskFamily: 'release_review',
        riskClass: 'high',
        recommendedAction: 'require_operator_review',
        checklist: ['review_rationale', 'review_alternatives', 'confirm_tenant_scope'],
        rationaleTemplate:
          'Apply operator review for {taskFamily} because {riskClass} risk work is running in {environment}.',
      },
    ],
  });

  const approvalCache = new ApprovalDecisionCache();
  approvalCache.cache({
    id: 'approval-1',
    action: 'send_status_update',
    environment: 'prod',
    tenant: 'acme',
    approver: 'ops-lead',
  });

  const autonomyDecision = autonomyPolicies.evaluate({
    environment: 'prod',
    tenant: 'acme',
    jurisdiction: 'eu',
    riskClass: 'high',
    toolName: 'send_status_update',
  });

  const blockedDecision = autonomyPolicies.evaluate({
    environment: 'prod',
    tenant: 'acme',
    jurisdiction: 'eu',
    riskClass: 'high',
    toolName: 'bulk_export_contacts',
  });

  const planner = new OperatorInterventionPlanner({
    interventionPolicies,
  });

  const interventionPlan = planner.plan({
    run: {
      id: 'run-autonomy-1',
      status: 'waiting_for_approval',
      toolCalls: [],
      events: 0,
      steps: [],
      checkpoints: [],
    },
    incident: {
      type: 'release_incident',
      taskFamily: 'release_review',
      riskClass: 'high',
    },
    context: {
      environment: 'prod',
      taskFamily: 'release_review',
      riskClass: 'high',
    },
  });

  const cachedApproval = approvalCache.find({
    action: 'send_status_update',
    environment: 'prod',
    tenant: 'acme',
  });

  approvalCache.revoke('approval-1', {
    reason: 'policy_changed',
    revokedBy: 'ops-lead',
  });

  console.log('Autonomy policy summary');
  console.dir(
    {
      autonomyDecision,
      blockedDecision,
      interventionPlan,
      cachedApproval,
      approvalCache: approvalCache.summarize(),
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
