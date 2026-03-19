const {
  InteropArtifactRegistry,
  Tool,
  Run,
  PolicyPack,
  ToolPolicy,
  ExtensionManifest,
} = require('../index');

const registry = new InteropArtifactRegistry();

const toolArtifact = registry.export(
  'tool',
  new Tool({
    name: 'send_status_update',
    description: 'Send a simple status update.',
    parameters: {
      type: 'object',
      properties: {
        recipient: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['recipient', 'summary'],
    },
    metadata: {
      sideEffectLevel: 'external_write',
    },
    implementation: async ({ recipient, summary }) => ({
      delivered: true,
      recipient,
      summary,
    }),
  }),
  { exportedBy: 'referenceInteropRegistry' }
);

const traceArtifact = registry.export(
  'trace',
  new Run({
    id: 'interop-run',
    input: 'Send a status update.',
    status: 'completed',
    output: 'Delivered update.',
    checkpoints: [
      {
        id: 'interop-run:checkpoint:1',
        label: 'run_completed',
        status: 'completed',
      },
    ],
    metadata: {
      lineage: {
        rootRunId: 'interop-run',
      },
    },
  }),
  { exportedBy: 'referenceInteropRegistry' }
);

const policyArtifact = registry.export(
  'policyPack',
  PolicyPack.fromToolPolicy(
    new ToolPolicy({
      defaultAction: 'allow',
      rules: [
        {
          id: 'require-approval-write',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
        },
      ],
    }),
    {
      id: 'interop-policy-pack',
      name: 'interop-policy-pack',
      version: '1.0.0',
    }
  )
);

const evalArtifact = registry.export(
  'evalReport',
  {
    total: 2,
    passed: 2,
    failed: 0,
    checks: [
      { id: 'artifact-validation', passed: true },
      { id: 'schema-validation', passed: true },
    ],
  },
  { suite: 'interop-registry-demo' }
);

const manifestArtifact = registry.export(
  'manifest',
  ExtensionManifest.fromExtension({
    name: 'reference-extension',
    version: '1.0.0',
    description: 'Reference extension manifest.',
    contributes: {
      policyRules: [{ id: 'extension-policy-rule' }],
    },
  })
);

const importedToolArtifact = registry.import('tool', toolArtifact);
const importedTool = importedToolArtifact.toTool({
  implementation: async ({ recipient, summary }) => ({
    delivered: true,
    recipient,
    summary,
  }),
});
const importedTrace = registry.import('trace', traceArtifact);
const importedPolicyPack = registry.import('policyPack', policyArtifact);
const importedEval = registry.import('evalReport', evalArtifact);
const importedManifest = registry.import('manifest', manifestArtifact);

console.log('Interop registry summary:');
console.dir(
  {
    toolFormat: toolArtifact.format,
    traceFormat: traceArtifact.format,
    policyFormat: policyArtifact.format,
    evalFormat: evalArtifact.format,
    manifestFormat: manifestArtifact.format,
    importedToolName: importedTool.name,
    importedTraceRunId: importedTrace.id,
    importedPolicyPackName: importedPolicyPack.name,
    importedEvalSummary: importedEval.summarize(),
    importedManifestName: importedManifest.name,
  },
  { depth: null }
);
