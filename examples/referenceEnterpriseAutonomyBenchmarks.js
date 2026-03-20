const {
  EnterpriseAutonomyBenchmarkSuite,
} = require('../index');

async function main() {
  const suite = new EnterpriseAutonomyBenchmarkSuite();
  const report = await suite.run({
    longLivedRun: {
      status: 'completed',
      checkpoints: 4,
      resumable: true,
    },
    supervision: {
      action: 'review',
      approvals: 1,
      checkpoints: 2,
    },
    rollback: {
      action: 'block_rollout',
      rollbackReady: true,
      reason: 'fleet regression and assurance block',
    },
  });

  console.log('Enterprise autonomy benchmark report');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
