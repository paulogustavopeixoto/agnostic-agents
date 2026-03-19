const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ExtensionManifest,
  EvalReportArtifact,
  InteropContractValidator,
} = require('../index');

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-interop-flow-'));
  const manifestPath = path.join(directory, 'extension-manifest.json');
  const evalReportPath = path.join(directory, 'eval-report.json');

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      ExtensionManifest.fromExtension({
        name: 'external-control-plane',
        version: '1.0.0',
        contributes: {
          eventSinks: [{ id: 'external-sink' }],
        },
      }).toJSON(),
      null,
      2
    )
  );

  fs.writeFileSync(
    evalReportPath,
    JSON.stringify(
      EvalReportArtifact.fromReport(
        {
          total: 1,
          passed: 1,
          failed: 0,
          results: [{ id: 'external-check', passed: true, durationMs: 1, error: null }],
        },
        { source: 'external-repo' }
      ).toJSON(),
      null,
      2
    )
  );

  const validator = new InteropContractValidator();
  const report = validator.validateFiles([
    { filePath: manifestPath, type: 'manifest' },
    { filePath: evalReportPath, type: 'evalReport' },
  ]);

  console.log('External conformance flow summary:');
  console.dir(
    {
      directory,
      report,
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
