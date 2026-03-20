const { MemoryAuditView } = require('./MemoryAuditView');
const { MemoryGovernanceDiagnostics } = require('./MemoryGovernanceDiagnostics');

class MemoryGovernanceReviewWorkflow {
  constructor({ auditView = null, diagnostics = null } = {}) {
    this.auditView = auditView instanceof MemoryAuditView ? auditView : new MemoryAuditView();
    this.diagnostics =
      diagnostics instanceof MemoryGovernanceDiagnostics
        ? diagnostics
        : new MemoryGovernanceDiagnostics();
  }

  run({ audit = [], benchmarkReport = null, stateSummary = null } = {}) {
    const auditSummary = this.auditView.build({ audit });
    const diagnostics = this.diagnostics.summarize({
      auditView: auditSummary,
      benchmarkReport,
      stateSummary,
    });

    return {
      auditSummary,
      diagnostics,
      checklist: [
        'Review blocked memory reads and writes.',
        'Inspect conflict-detection outcomes.',
        'Confirm retention actions match policy intent.',
        'Check benchmark failures before rollout.',
        'Verify memory access contracts cover all core surfaces.',
      ],
    };
  }
}

module.exports = { MemoryGovernanceReviewWorkflow };
