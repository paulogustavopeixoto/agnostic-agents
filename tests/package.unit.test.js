const fs = require('fs');
const os = require('os');
const path = require('path');

const pkg = require('../index');
const { Tool } = require('../src/tools/adapters/Tool');
const { Memory } = require('../src/agent/Memory');
const { BaseLayerStore } = require('../src/agent/memory/BaseLayerStore');
const { InMemoryLayerStore } = require('../src/agent/memory/InMemoryLayerStore');
const { FileLayerStore } = require('../src/agent/memory/FileLayerStore');
const { RetryManager } = require('../src/utils/RetryManager');
const { RAG } = require('../src/rag/RAG');
const { VectorStoreRetriever } = require('../src/rag/retrievers/VectorStoreRetriever');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { FallbackRouter } = require('../src/llm/FallbackRouter');
const { MCPClient } = require('../src/mcp/MCPClient');
const { OpenAPILoader } = require('../src/api/OpenAPILoader');
const { ApiLoader } = require('../src/api/ApiLoader');
const { CurlLoader } = require('../src/api/CurlLoader');
const { PostmanLoader } = require('../src/api/PostmanLoader');
const { CritiqueProtocol } = require('../src/coordination/CritiqueProtocol');
const { CritiqueSchemaRegistry } = require('../src/coordination/CritiqueSchemaRegistry');
const { TrustRegistry } = require('../src/coordination/TrustRegistry');
const { DisagreementResolver } = require('../src/coordination/DisagreementResolver');
const { CoordinationLoop } = require('../src/coordination/CoordinationLoop');
const { DecompositionAdvisor } = require('../src/coordination/DecompositionAdvisor');
const { CoordinationBenchmarkSuite } = require('../src/coordination/CoordinationBenchmarkSuite');
const { CoordinationRoleContract } = require('../src/coordination/CoordinationRoleContract');
const { CoordinationTrace } = require('../src/coordination/CoordinationTrace');
const { RoleAwareCoordinationPlanner } = require('../src/coordination/RoleAwareCoordinationPlanner');
const { VerificationStrategySelector } = require('../src/coordination/VerificationStrategySelector');
const { MultiPassVerificationEngine } = require('../src/coordination/MultiPassVerificationEngine');
const { CoordinationQualityTracker } = require('../src/coordination/CoordinationQualityTracker');
const { CoordinationDiagnostics } = require('../src/coordination/CoordinationDiagnostics');
const { Run } = require('../src/runtime/Run');
const { EvidenceGraph } = require('../src/runtime/EvidenceGraph');
const { EvalHarness } = require('../src/runtime/EvalHarness');
const { InvariantRegistry } = require('../src/runtime/InvariantRegistry');
const { AssuranceReport } = require('../src/runtime/AssuranceReport');
const { AssuranceSuite } = require('../src/runtime/AssuranceSuite');
const { AssuranceGuardrail } = require('../src/runtime/AssuranceGuardrail');
const { AssuranceRecoveryPlanner } = require('../src/runtime/AssuranceRecoveryPlanner');
const { EvalReportArtifact } = require('../src/runtime/EvalReportArtifact');
const { ToolSchemaArtifact } = require('../src/runtime/ToolSchemaArtifact');
const { LearningLoop } = require('../src/runtime/LearningLoop');
const { PolicyTuningAdvisor } = require('../src/runtime/PolicyTuningAdvisor');
const { VerifierEnsemble } = require('../src/runtime/VerifierEnsemble');
const { ConfidencePolicy } = require('../src/runtime/ConfidencePolicy');
const { AdaptiveRetryPolicy } = require('../src/runtime/AdaptiveRetryPolicy');
const { HistoricalRoutingAdvisor } = require('../src/runtime/HistoricalRoutingAdvisor');
const { CapabilityRouter } = require('../src/runtime/CapabilityRouter');
const { AdaptiveDecisionLedger } = require('../src/runtime/AdaptiveDecisionLedger');
const { AdaptiveGovernanceGate } = require('../src/runtime/AdaptiveGovernanceGate');
const { FleetRolloutPlan } = require('../src/runtime/FleetRolloutPlan');
const { FleetHealthMonitor } = require('../src/runtime/FleetHealthMonitor');
const { FleetCanaryEvaluator } = require('../src/runtime/FleetCanaryEvaluator');
const { FleetSafetyController } = require('../src/runtime/FleetSafetyController');
const { FleetImpactComparator } = require('../src/runtime/FleetImpactComparator');
const { FleetRollbackAdvisor } = require('../src/runtime/FleetRollbackAdvisor');
const { RouteFleetDiagnostics } = require('../src/runtime/RouteFleetDiagnostics');
const { SecretResolver } = require('../src/runtime/SecretResolver');
const { SchemaNormalizer } = require('../src/runtime/SchemaNormalizer');
const { ToolRecorder } = require('../src/runtime/ToolRecorder');
const { ToolMockBuilder } = require('../src/runtime/ToolMockBuilder');
const { ToolSandboxRunner } = require('../src/runtime/ToolSandboxRunner');
const { OperatorInterventionPlanner } = require('../src/runtime/OperatorInterventionPlanner');
const { OperatorSummary } = require('../src/runtime/OperatorSummary');
const { OperatorTriageWorkflow } = require('../src/runtime/OperatorTriageWorkflow');
const { PromptArtifact } = require('../src/runtime/PromptArtifact');
const { PromptRegistry } = require('../src/runtime/PromptRegistry');
const { RunRecipe } = require('../src/runtime/RunRecipe');
const { WorkflowPreset } = require('../src/runtime/WorkflowPreset');
const { IncidentBundleExporter } = require('../src/runtime/IncidentBundleExporter');
const { CredentialDelegationKit } = require('../src/runtime/CredentialDelegationKit');
const { RoutePolicySimulator } = require('../src/runtime/RoutePolicySimulator');
const { MemoryProvenanceLedger } = require('../src/runtime/MemoryProvenanceLedger');
const { MemoryRetentionPolicy } = require('../src/runtime/MemoryRetentionPolicy');
const { MemoryAccessController } = require('../src/runtime/MemoryAccessController');
const { MemoryConflictResolver } = require('../src/runtime/MemoryConflictResolver');
const { MemoryAccessContractRegistry } = require('../src/runtime/MemoryAccessContractRegistry');
const { MemoryAuditView } = require('../src/runtime/MemoryAuditView');
const { MemoryGovernanceBenchmarkSuite } = require('../src/runtime/MemoryGovernanceBenchmarkSuite');
const { MemoryGovernanceDiagnostics } = require('../src/runtime/MemoryGovernanceDiagnostics');
const { MemoryGovernanceReviewWorkflow } = require('../src/runtime/MemoryGovernanceReviewWorkflow');
const { AutonomyBudget } = require('../src/runtime/AutonomyBudget');
const { AutonomyBudgetLedger } = require('../src/runtime/AutonomyBudgetLedger');
const { UncertaintySupervisionPolicy } = require('../src/runtime/UncertaintySupervisionPolicy');
const { ApprovalDelegationContract } = require('../src/runtime/ApprovalDelegationContract');
const { AutonomyEnvelope } = require('../src/runtime/AutonomyEnvelope');
const { AutonomyPolicyRegistry } = require('../src/runtime/AutonomyPolicyRegistry');
const { InterventionPolicyRegistry } = require('../src/runtime/InterventionPolicyRegistry');
const { ApprovalDecisionCache } = require('../src/runtime/ApprovalDecisionCache');
const { WorkflowSupervisionCheckpoint } = require('../src/runtime/WorkflowSupervisionCheckpoint');
const { ProgressiveAutonomyController } = require('../src/runtime/ProgressiveAutonomyController');
const { AutonomyBenchmarkSuite } = require('../src/runtime/AutonomyBenchmarkSuite');
const { AutonomyFleetSummary } = require('../src/runtime/AutonomyFleetSummary');
const { AutonomyRolloutGuard } = require('../src/runtime/AutonomyRolloutGuard');
const { UnifiedExecutionGraph } = require('../src/runtime/UnifiedExecutionGraph');
const { EnterpriseAutonomyArchitecture } = require('../src/runtime/EnterpriseAutonomyArchitecture');
const { EnterpriseOperatingModel } = require('../src/runtime/EnterpriseOperatingModel');
const { AutonomyStackConfig } = require('../src/runtime/AutonomyStackConfig');
const { AutonomyStackComparator } = require('../src/runtime/AutonomyStackComparator');
const { AutonomyDriftGuard } = require('../src/runtime/AutonomyDriftGuard');
const { OperationalScorecard } = require('../src/runtime/OperationalScorecard');
const { EnterpriseAutonomyBenchmarkSuite } = require('../src/runtime/EnterpriseAutonomyBenchmarkSuite');
const { DelegationBudget } = require('../src/coordination/DelegationBudget');
const { SharedContextScope } = require('../src/coordination/SharedContextScope');
const { CoordinationSafetyGuard } = require('../src/coordination/CoordinationSafetyGuard');
const { GovernanceRecordLedger } = require('../src/runtime/GovernanceRecordLedger');
const { AuditStitcher } = require('../src/runtime/AuditStitcher');
const { GovernanceTimeline } = require('../src/runtime/GovernanceTimeline');
const { OperatorDashboardSnapshot } = require('../src/runtime/OperatorDashboardSnapshot');
const { OperatorControlLoop } = require('../src/runtime/OperatorControlLoop');
const { AdaptationPolicyEnvelope } = require('../src/runtime/AdaptationPolicyEnvelope');
const { ImprovementEffectTracker } = require('../src/runtime/ImprovementEffectTracker');
const { LearnedAdaptationArtifact } = require('../src/runtime/LearnedAdaptationArtifact');
const { ImprovementProposalEngine } = require('../src/runtime/ImprovementProposalEngine');
const { ImprovementActionPlanner } = require('../src/runtime/ImprovementActionPlanner');
const { LearningBenchmarkSuite } = require('../src/runtime/LearningBenchmarkSuite');
const { AdaptationRegressionGuard } = require('../src/runtime/AdaptationRegressionGuard');
const { GovernedImprovementLoop } = require('../src/runtime/GovernedImprovementLoop');
const { GovernanceHooks } = require('../src/runtime/GovernanceHooks');
const { WebhookGovernanceAdapter } = require('../src/runtime/WebhookGovernanceAdapter');
const { FileAuditSink } = require('../src/runtime/FileAuditSink');
const { WebhookEventSink } = require('../src/runtime/WebhookEventSink');
const { RuntimeEventRedactor } = require('../src/runtime/RuntimeEventRedactor');
const { ExtensionHost } = require('../src/runtime/ExtensionHost');
const { StorageBackendRegistry } = require('../src/runtime/StorageBackendRegistry');
const { RunTreeInspector } = require('../src/runtime/RunTreeInspector');
const { IncidentDebugger } = require('../src/runtime/IncidentDebugger');
const { BranchQualityAnalyzer } = require('../src/runtime/BranchQualityAnalyzer');
const { DistributedRecoveryPlanner } = require('../src/runtime/DistributedRecoveryPlanner');
const { DistributedRecoveryRunner } = require('../src/runtime/DistributedRecoveryRunner');
const { TraceDiffer } = require('../src/runtime/TraceDiffer');
const { DistributedRunEnvelope } = require('../src/runtime/DistributedRunEnvelope');
const { TraceCorrelation } = require('../src/runtime/TraceCorrelation');
const { ExecutionIdentity } = require('../src/runtime/ExecutionIdentity');
const { ApprovalInbox } = require('../src/runtime/ApprovalInbox');
const { BackgroundJobScheduler } = require('../src/runtime/BackgroundJobScheduler');
const { DelegationRuntime } = require('../src/runtime/DelegationRuntime');
const { PlanningRuntime } = require('../src/runtime/PlanningRuntime');
const { TraceSerializer } = require('../src/runtime/TraceSerializer');
const { ToolPolicy } = require('../src/runtime/ToolPolicy');
const { ProductionPolicyPack } = require('../src/runtime/ProductionPolicyPack');
const { ExtensionManifest } = require('../src/runtime/ExtensionManifest');
const { ConformanceKit } = require('../src/runtime/ConformanceKit');
const { ArtifactCompatibilitySuite } = require('../src/runtime/ArtifactCompatibilitySuite');
const { InteropContractValidator } = require('../src/runtime/InteropContractValidator');
const { CertificationKit } = require('../src/runtime/CertificationKit');
const { DeploymentPatternCertificationKit } = require('../src/runtime/DeploymentPatternCertificationKit');
const { CompatibilitySummary } = require('../src/runtime/CompatibilitySummary');
const { InteropArtifactRegistry } = require('../src/runtime/InteropArtifactRegistry');
const { PolicyPack } = require('../src/runtime/PolicyPack');
const { PolicyDecisionReport } = require('../src/runtime/PolicyDecisionReport');
const { PolicyEvaluationRecord } = require('../src/runtime/PolicyEvaluationRecord');
const { PolicySimulator } = require('../src/runtime/PolicySimulator');
const { PolicyScopeResolver } = require('../src/runtime/PolicyScopeResolver');
const { CoordinationPolicyGate } = require('../src/runtime/CoordinationPolicyGate');
const { PolicyLifecycleManager } = require('../src/runtime/PolicyLifecycleManager');
const { ApprovalEscalationPolicySuite } = require('../src/runtime/ApprovalEscalationPolicySuite');
const { RecoveryPolicyGate } = require('../src/runtime/RecoveryPolicyGate');
const { CompensationPolicyPlanner } = require('../src/runtime/CompensationPolicyPlanner');
const { StateBundle } = require('../src/runtime/StateBundle');
const { StateDiff } = require('../src/runtime/StateDiff');
const { StateBundleSerializer } = require('../src/runtime/StateBundleSerializer');
const { StateContractRegistry } = require('../src/runtime/StateContractRegistry');
const { StateIntegrityChecker } = require('../src/runtime/StateIntegrityChecker');
const { StateConsistencyChecker } = require('../src/runtime/StateConsistencyChecker');
const { StateRestorePlanner } = require('../src/runtime/StateRestorePlanner');
const { StateDurableRestoreSuite } = require('../src/runtime/StateDurableRestoreSuite');
const { StateIncidentReconstructor } = require('../src/runtime/StateIncidentReconstructor');
const { EventBus } = require('../src/runtime/EventBus');
const { BaseRunStore } = require('../src/runtime/stores/BaseRunStore');
const { BaseJobStore } = require('../src/runtime/stores/BaseJobStore');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');
const { FileRunStore } = require('../src/runtime/stores/FileRunStore');
const { InMemoryJobStore } = require('../src/runtime/stores/InMemoryJobStore');
const { FileJobStore } = require('../src/runtime/stores/FileJobStore');
const { BaseEnvironmentAdapter } = require('../src/runtime/environments/BaseEnvironmentAdapter');
const { BrowserEnvironmentAdapter } = require('../src/runtime/environments/BrowserEnvironmentAdapter');
const { ShellEnvironmentAdapter } = require('../src/runtime/environments/ShellEnvironmentAdapter');
const { ApiEnvironmentAdapter } = require('../src/runtime/environments/ApiEnvironmentAdapter');
const { QueueEnvironmentAdapter } = require('../src/runtime/environments/QueueEnvironmentAdapter');
const { FileEnvironmentAdapter } = require('../src/runtime/environments/FileEnvironmentAdapter');
const { Workflow } = require('../src/runtime/workflow/Workflow');
const { WorkflowStep } = require('../src/runtime/workflow/WorkflowStep');
const { ExecutionGraph } = require('../src/runtime/workflow/ExecutionGraph');
const { DelegationContract } = require('../src/runtime/workflow/DelegationContract');
const { AgentWorkflowStep } = require('../src/runtime/workflow/AgentWorkflowStep');
const { WorkflowRunner } = require('../src/runtime/workflow/WorkflowRunner');
const { ToolValidator } = require('../src/utils/ToolValidator');

describe('Package/module unit tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('index exports the public surface', () => {
    expect(pkg.Agent).toBeDefined();
    expect(pkg.Tool).toBeDefined();
    expect(pkg.Memory).toBeDefined();
    expect(pkg.BaseLayerStore).toBeDefined();
    expect(pkg.InMemoryLayerStore).toBeDefined();
    expect(pkg.FileLayerStore).toBeDefined();
    expect(pkg.RAG).toBeDefined();
    expect(pkg.BaseRetriever).toBeDefined();
    expect(pkg.VectorStoreRetriever).toBeDefined();
    expect(pkg.FallbackRouter).toBeDefined();
    expect(pkg.MCPClient).toBeDefined();
    expect(pkg.OpenAPILoader).toBeDefined();
    expect(pkg.ApiLoader).toBeDefined();
    expect(pkg.CurlLoader).toBeDefined();
    expect(pkg.PostmanLoader).toBeDefined();
    expect(pkg.CritiqueProtocol).toBeDefined();
    expect(pkg.CritiqueSchemaRegistry).toBeDefined();
    expect(pkg.TrustRegistry).toBeDefined();
    expect(pkg.DisagreementResolver).toBeDefined();
    expect(pkg.CoordinationLoop).toBeDefined();
    expect(pkg.DecompositionAdvisor).toBeDefined();
    expect(pkg.CoordinationBenchmarkSuite).toBeDefined();
    expect(pkg.CoordinationRoleContract).toBeDefined();
    expect(pkg.CoordinationTrace).toBeDefined();
    expect(pkg.RoleAwareCoordinationPlanner).toBeDefined();
    expect(pkg.VerificationStrategySelector).toBeDefined();
    expect(pkg.MultiPassVerificationEngine).toBeDefined();
    expect(pkg.CoordinationQualityTracker).toBeDefined();
    expect(pkg.CoordinationDiagnostics).toBeDefined();
    expect(pkg.DelegationBudget).toBeDefined();
    expect(pkg.SharedContextScope).toBeDefined();
    expect(pkg.CoordinationSafetyGuard).toBeDefined();
    expect(pkg.Run).toBeDefined();
    expect(pkg.DistributedRunEnvelope).toBeDefined();
    expect(pkg.ExecutionIdentity).toBeDefined();
    expect(pkg.RunTreeInspector).toBeDefined();
    expect(pkg.IncidentDebugger).toBeDefined();
    expect(pkg.BranchQualityAnalyzer).toBeDefined();
    expect(pkg.DistributedRecoveryPlanner).toBeDefined();
    expect(pkg.DistributedRecoveryRunner).toBeDefined();
    expect(pkg.ToolPolicy).toBeDefined();
    expect(pkg.ProductionPolicyPack).toBeDefined();
    expect(pkg.ExtensionManifest).toBeDefined();
    expect(pkg.ToolSchemaArtifact).toBeDefined();
    expect(pkg.InteropArtifactRegistry).toBeDefined();
    expect(pkg.ConformanceKit).toBeDefined();
    expect(pkg.ArtifactCompatibilitySuite).toBeDefined();
    expect(pkg.InteropContractValidator).toBeDefined();
    expect(pkg.CertificationKit).toBeDefined();
    expect(pkg.DeploymentPatternCertificationKit).toBeDefined();
    expect(pkg.CompatibilitySummary).toBeDefined();
    expect(pkg.PolicyPack).toBeDefined();
    expect(pkg.PolicyDecisionReport).toBeDefined();
    expect(pkg.PolicyEvaluationRecord).toBeDefined();
    expect(pkg.PolicySimulator).toBeDefined();
    expect(pkg.PolicyScopeResolver).toBeDefined();
    expect(pkg.CoordinationPolicyGate).toBeDefined();
    expect(pkg.PolicyLifecycleManager).toBeDefined();
    expect(pkg.ApprovalEscalationPolicySuite).toBeDefined();
    expect(pkg.RecoveryPolicyGate).toBeDefined();
    expect(pkg.CompensationPolicyPlanner).toBeDefined();
    expect(pkg.StateBundle).toBeDefined();
    expect(pkg.StateDiff).toBeDefined();
    expect(pkg.StateBundleSerializer).toBeDefined();
    expect(pkg.StateContractRegistry).toBeDefined();
    expect(pkg.StateIntegrityChecker).toBeDefined();
    expect(pkg.StateConsistencyChecker).toBeDefined();
    expect(pkg.StateRestorePlanner).toBeDefined();
    expect(pkg.StateDurableRestoreSuite).toBeDefined();
    expect(pkg.StateIncidentReconstructor).toBeDefined();
    expect(pkg.EventBus).toBeDefined();
    expect(pkg.TraceSerializer).toBeDefined();
    expect(pkg.EvidenceGraph).toBeDefined();
    expect(pkg.EvalHarness).toBeDefined();
    expect(pkg.InvariantRegistry).toBeDefined();
    expect(pkg.AssuranceReport).toBeDefined();
    expect(pkg.AssuranceSuite).toBeDefined();
    expect(pkg.AssuranceGuardrail).toBeDefined();
    expect(pkg.AssuranceRecoveryPlanner).toBeDefined();
    expect(pkg.EvalReportArtifact).toBeDefined();
    expect(pkg.LearningLoop).toBeDefined();
    expect(pkg.PolicyTuningAdvisor).toBeDefined();
    expect(pkg.VerifierEnsemble).toBeDefined();
    expect(pkg.ConfidencePolicy).toBeDefined();
    expect(pkg.AdaptiveRetryPolicy).toBeDefined();
    expect(pkg.HistoricalRoutingAdvisor).toBeDefined();
    expect(pkg.CapabilityRouter).toBeDefined();
    expect(pkg.AdaptiveDecisionLedger).toBeDefined();
    expect(pkg.AdaptiveGovernanceGate).toBeDefined();
    expect(pkg.FleetRolloutPlan).toBeDefined();
    expect(pkg.FleetHealthMonitor).toBeDefined();
    expect(pkg.FleetCanaryEvaluator).toBeDefined();
    expect(pkg.FleetSafetyController).toBeDefined();
    expect(pkg.FleetImpactComparator).toBeDefined();
    expect(pkg.FleetRollbackAdvisor).toBeDefined();
    expect(pkg.RouteFleetDiagnostics).toBeDefined();
    expect(pkg.SecretResolver).toBeDefined();
    expect(pkg.SchemaNormalizer).toBeDefined();
    expect(pkg.ToolRecorder).toBeDefined();
    expect(pkg.ToolMockBuilder).toBeDefined();
    expect(pkg.ToolSandboxRunner).toBeDefined();
    expect(pkg.OperatorInterventionPlanner).toBeDefined();
    expect(pkg.OperatorSummary).toBeDefined();
    expect(pkg.OperatorTriageWorkflow).toBeDefined();
    expect(pkg.PromptArtifact).toBeDefined();
    expect(pkg.PromptRegistry).toBeDefined();
    expect(pkg.RunRecipe).toBeDefined();
    expect(pkg.WorkflowPreset).toBeDefined();
    expect(pkg.IncidentBundleExporter).toBeDefined();
    expect(pkg.CredentialDelegationKit).toBeDefined();
    expect(pkg.RoutePolicySimulator).toBeDefined();
    expect(pkg.MemoryProvenanceLedger).toBeDefined();
    expect(pkg.MemoryRetentionPolicy).toBeDefined();
    expect(pkg.MemoryAccessController).toBeDefined();
    expect(pkg.MemoryConflictResolver).toBeDefined();
    expect(pkg.MemoryAccessContractRegistry).toBeDefined();
    expect(pkg.MemoryAuditView).toBeDefined();
    expect(pkg.MemoryGovernanceBenchmarkSuite).toBeDefined();
    expect(pkg.MemoryGovernanceDiagnostics).toBeDefined();
    expect(pkg.MemoryGovernanceReviewWorkflow).toBeDefined();
    expect(pkg.AutonomyBudget).toBeDefined();
    expect(pkg.AutonomyBudgetLedger).toBeDefined();
    expect(pkg.UncertaintySupervisionPolicy).toBeDefined();
    expect(pkg.ApprovalDelegationContract).toBeDefined();
    expect(pkg.AutonomyEnvelope).toBeDefined();
    expect(pkg.AutonomyPolicyRegistry).toBeDefined();
    expect(pkg.InterventionPolicyRegistry).toBeDefined();
    expect(pkg.ApprovalDecisionCache).toBeDefined();
    expect(pkg.WorkflowSupervisionCheckpoint).toBeDefined();
    expect(pkg.ProgressiveAutonomyController).toBeDefined();
    expect(pkg.AutonomyBenchmarkSuite).toBeDefined();
    expect(pkg.AutonomyFleetSummary).toBeDefined();
    expect(pkg.AutonomyRolloutGuard).toBeDefined();
    expect(pkg.UnifiedExecutionGraph).toBeDefined();
    expect(pkg.EnterpriseAutonomyArchitecture).toBeDefined();
    expect(pkg.EnterpriseOperatingModel).toBeDefined();
    expect(pkg.AutonomyStackConfig).toBeDefined();
    expect(pkg.AutonomyStackComparator).toBeDefined();
    expect(pkg.AutonomyDriftGuard).toBeDefined();
    expect(pkg.OperationalScorecard).toBeDefined();
    expect(pkg.EnterpriseAutonomyBenchmarkSuite).toBeDefined();
    expect(pkg.GovernanceRecordLedger).toBeDefined();
    expect(pkg.AuditStitcher).toBeDefined();
    expect(pkg.GovernanceTimeline).toBeDefined();
    expect(pkg.OperatorDashboardSnapshot).toBeDefined();
    expect(pkg.OperatorControlLoop).toBeDefined();
    expect(pkg.AdaptationPolicyEnvelope).toBeDefined();
    expect(pkg.ImprovementEffectTracker).toBeDefined();
    expect(pkg.LearnedAdaptationArtifact).toBeDefined();
    expect(pkg.ImprovementProposalEngine).toBeDefined();
    expect(pkg.ImprovementActionPlanner).toBeDefined();
    expect(pkg.LearningBenchmarkSuite).toBeDefined();
    expect(pkg.AdaptationRegressionGuard).toBeDefined();
    expect(pkg.GovernedImprovementLoop).toBeDefined();
    expect(pkg.GovernanceHooks).toBeDefined();
    expect(pkg.WebhookGovernanceAdapter).toBeDefined();
    expect(pkg.FileAuditSink).toBeDefined();
    expect(pkg.WebhookEventSink).toBeDefined();
    expect(pkg.RuntimeEventRedactor).toBeDefined();
    expect(pkg.ExtensionHost).toBeDefined();
    expect(pkg.StorageBackendRegistry).toBeDefined();
    expect(pkg.ApprovalInbox).toBeDefined();
    expect(pkg.BackgroundJobScheduler).toBeDefined();
    expect(pkg.DelegationRuntime).toBeDefined();
    expect(pkg.PlanningRuntime).toBeDefined();
    expect(pkg.BaseRunStore).toBeDefined();
    expect(pkg.BaseJobStore).toBeDefined();
    expect(pkg.InMemoryRunStore).toBeDefined();
    expect(pkg.FileRunStore).toBeDefined();
    expect(pkg.InMemoryJobStore).toBeDefined();
    expect(pkg.FileJobStore).toBeDefined();
    expect(pkg.BaseEnvironmentAdapter).toBeDefined();
    expect(pkg.BrowserEnvironmentAdapter).toBeDefined();
    expect(pkg.ShellEnvironmentAdapter).toBeDefined();
    expect(pkg.ApiEnvironmentAdapter).toBeDefined();
    expect(pkg.QueueEnvironmentAdapter).toBeDefined();
    expect(pkg.FileEnvironmentAdapter).toBeDefined();
    expect(pkg.Workflow).toBeDefined();
    expect(pkg.WorkflowStep).toBeDefined();
    expect(pkg.ExecutionGraph).toBeDefined();
    expect(pkg.DelegationContract).toBeDefined();
    expect(pkg.AgentWorkflowStep).toBeDefined();
    expect(pkg.WorkflowRunner).toBeDefined();
    expect(pkg.RunInspector).toBeDefined();
    expect(pkg.TraceDiffer).toBeDefined();
    expect(pkg.TraceCorrelation).toBeDefined();
    expect(pkg.ConsoleDebugSink).toBeDefined();
    expect(pkg.InvalidToolCallError).toBeDefined();
    expect(pkg.RunPausedError).toBeDefined();
    expect(pkg.RunCancelledError).toBeDefined();
  });

  test('package publishes a TypeScript declaration surface', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const declarationPath = path.join(process.cwd(), packageJson.types);
    const declarationSource = fs.readFileSync(declarationPath, 'utf8');

    expect(packageJson.types).toBe('index.d.ts');
    expect(packageJson.files).toContain('index.d.ts');
    expect(fs.existsSync(declarationPath)).toBe(true);
    expect(declarationSource).toContain('export class Agent');
    expect(declarationSource).toContain('export class Run');
    expect(declarationSource).toContain('export class TraceSerializer');
    expect(declarationSource).toContain('export class StorageBackendRegistry');
    expect(declarationSource).toContain('export class AutonomyBudget');
    expect(declarationSource).toContain('export class AutonomyEnvelope');
    expect(declarationSource).toContain('export class AutonomyPolicyRegistry');
    expect(declarationSource).toContain('export class InterventionPolicyRegistry');
    expect(declarationSource).toContain('export class ApprovalDecisionCache');
    expect(declarationSource).toContain('export class WorkflowSupervisionCheckpoint');
    expect(declarationSource).toContain('export class ProgressiveAutonomyController');
    expect(declarationSource).toContain('export class AutonomyBenchmarkSuite');
    expect(declarationSource).toContain('export class AutonomyFleetSummary');
    expect(declarationSource).toContain('export class AutonomyRolloutGuard');
    expect(declarationSource).toContain('export class UnifiedExecutionGraph');
    expect(declarationSource).toContain('export class EnterpriseAutonomyArchitecture');
    expect(declarationSource).toContain('export class EnterpriseOperatingModel');
    expect(declarationSource).toContain('export class AutonomyStackConfig');
    expect(declarationSource).toContain('export class AutonomyStackComparator');
    expect(declarationSource).toContain('export class AutonomyDriftGuard');
    expect(declarationSource).toContain('export class OperationalScorecard');
    expect(declarationSource).toContain('export class EnterpriseAutonomyBenchmarkSuite');
    expect(declarationSource).toContain('export class DeploymentPatternCertificationKit');
    expect(declarationSource).toContain('export class DelegationBudget');
    expect(declarationSource).toContain('export class SharedContextScope');
    expect(declarationSource).toContain('export class CoordinationSafetyGuard');
  });

  test('AutonomyEnvelope combines budgets, supervision thresholds, and reusable delegation contracts', () => {
    const budget = new AutonomyBudget({
      spend: 5,
      retries: 2,
      toolCalls: 3,
      externalActions: 1,
      tokens: 1000,
    });
    const supervisionPolicy = new UncertaintySupervisionPolicy({
      reviewThreshold: 0.7,
      escalateThreshold: 0.5,
    });
    const delegation = new ApprovalDelegationContract({
      id: 'ops-delegation',
      approver: 'ops-lead',
      delegate: 'oncall-operator',
      scope: [{ action: 'send_status_update', environment: 'prod', tenant: 'acme' }],
    });
    const envelope = new AutonomyEnvelope({
      budget,
      supervisionPolicy,
      environment: 'prod',
      tenant: 'acme',
    });
    const ledger = new AutonomyBudgetLedger();

    const firstDecision = envelope.evaluate({
      usage: { toolCalls: 1, externalActions: 1, spend: 1.5, tokens: 250 },
      assessment: { confidence: 0.62 },
      riskClass: 'high',
    });
    ledger.record({
      runId: 'budgeted-run-1',
      action: firstDecision.action,
      snapshot: firstDecision.budget,
    });

    const secondDecision = envelope.evaluate({
      usage: { toolCalls: 3, spend: 4, tokens: 900 },
      assessment: { confidence: 0.9 },
      riskClass: 'medium',
    });
    ledger.record({
      runId: 'budgeted-run-1',
      action: secondDecision.action,
      snapshot: secondDecision.budget,
    });

    expect(firstDecision.action).toBe('review');
    expect(secondDecision.action).toBe('halt');
    expect(secondDecision.budget.exhausted).toBe(true);
    expect(secondDecision.budget.remaining.spend).toBe(-0.5);
    expect(delegation.appliesTo({ action: 'send_status_update', environment: 'prod', tenant: 'acme' })).toBe(true);
    expect(ledger.summarize()).toMatchObject({
      total: 2,
      exhausted: 1,
    });
  });

  test('Autonomy policy and intervention registries support supervised autonomy by tenant and environment', () => {
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
          dataHandling: ['redact_pii'],
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
          checklist: ['review_rationale'],
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

    expect(
      autonomyPolicies.evaluate({
        environment: 'prod',
        tenant: 'acme',
        jurisdiction: 'eu',
        riskClass: 'high',
        toolName: 'send_status_update',
      })
    ).toMatchObject({
      action: 'escalate',
      policy: expect.objectContaining({
        matchedPolicyIds: ['eu-prod-review'],
      }),
    });

    expect(
      autonomyPolicies.evaluate({
        environment: 'prod',
        tenant: 'acme',
        jurisdiction: 'eu',
        riskClass: 'high',
        toolName: 'bulk_export_contacts',
      })
    ).toMatchObject({
      action: 'deny',
    });

    expect(
      interventionPolicies.select({
        environment: 'prod',
        taskFamily: 'release_review',
        riskClass: 'high',
      })
    ).toMatchObject({
      recommendedAction: 'require_operator_review',
      matchedPolicyIds: ['release-highrisk-prod'],
    });

    expect(
      approvalCache.find({
        action: 'send_status_update',
        environment: 'prod',
        tenant: 'acme',
      })
    ).toMatchObject({
      id: 'approval-1',
      approver: 'ops-lead',
    });

    approvalCache.revoke('approval-1', {
      reason: 'policy_changed',
      revokedBy: 'ops-lead',
    });

    expect(approvalCache.summarize()).toMatchObject({
      total: 1,
      active: 0,
      revoked: 1,
    });
  });

  test('Workflow supervision checkpoints and progressive autonomy controls support review pauses and evidence-based envelope changes', async () => {
    const checkpoint = new WorkflowSupervisionCheckpoint({
      requireReviewBelowConfidence: 0.75,
      escalateBelowConfidence: 0.55,
    });
    const decision = checkpoint.evaluate({
      workflowId: 'supervised-release-workflow',
      stepId: 'draft_release_note',
      taskFamily: 'release_review',
      riskClass: 'high',
      confidence: 0.61,
      rationale: 'The release summary mentions a production config change without explicit rollback notes.',
      alternatives: ['Request operator review.', 'Regenerate with rollback instructions.'],
    });

    const baseEnvelope = new AutonomyEnvelope({
      budget: { spend: 4, toolCalls: 2, tokens: 800 },
      supervisionPolicy: { reviewThreshold: 0.7, escalateThreshold: 0.5 },
      environment: 'prod',
      tenant: 'acme',
    });
    const controller = new ProgressiveAutonomyController({
      minimumEvidenceScore: 0.8,
      widenIncrement: { spend: 2, toolCalls: 1, tokens: 400 },
      tightenIncrement: { spend: 1, toolCalls: 1, tokens: 200 },
    });

    const widened = controller.adjust(baseEnvelope, {
      evidenceScore: 0.91,
      environment: 'prod',
      tenant: 'acme',
      reason: 'three successful supervised runs',
    });
    const tightened = controller.adjust(baseEnvelope, {
      evidenceScore: 0.42,
      environment: 'prod',
      tenant: 'acme',
      reason: 'recent escalation and budget overrun',
    });

    expect(decision).toMatchObject({
      action: 'review',
      requiresPause: true,
      checkpoint: expect.objectContaining({
        workflowId: 'supervised-release-workflow',
        stepId: 'draft_release_note',
        confidence: 0.61,
      }),
    });
    expect(widened).toMatchObject({
      action: 'widen',
      summary: {
        limits: expect.objectContaining({
          spend: 6,
          toolCalls: 3,
          tokens: 1200,
        }),
      },
    });
    expect(tightened).toMatchObject({
      action: 'tighten',
      summary: {
        limits: expect.objectContaining({
          spend: 3,
          toolCalls: 1,
          tokens: 600,
        }),
      },
    });
  });

  test('Autonomy operations surfaces cover evaluation, fleet summaries, and rollout safeguards', async () => {
    const envelope = new AutonomyEnvelope({
      budget: { spend: 4, toolCalls: 2, tokens: 800 },
      supervisionPolicy: { reviewThreshold: 0.7, escalateThreshold: 0.5 },
      environment: 'prod',
      tenant: 'acme',
    });
    const approvalCache = new ApprovalDecisionCache({
      entries: [
        {
          id: 'approval-1',
          action: 'send_status_update',
          environment: 'prod',
          tenant: 'acme',
          decision: 'approved',
        },
      ],
    });

    const benchmarkReport = await new AutonomyBenchmarkSuite().run({
      envelope,
      approvalCache,
      approvalLatencyMs: 1200,
      escalation: {
        action: 'review',
        rationale: 'Confidence dipped after a tool retry.',
        confidence: 0.63,
      },
    });

    const ledger = new AutonomyBudgetLedger();
    ledger.record({
      runId: 'autonomy-run-1',
      action: 'review',
      snapshot: envelope.evaluate({
        usage: { spend: 1, toolCalls: 1, tokens: 200 },
        assessment: { confidence: 0.66 },
        riskClass: 'high',
      }).budget,
    });
    const monitor = new FleetHealthMonitor();
    monitor.record({
      environmentId: 'prod',
      tenantId: 'acme',
      runs: 12,
      pausedRuns: 2,
      failedRuns: 1,
      schedulerBacklog: 3,
      saturation: 0.68,
    });

    const fleetSummary = new AutonomyFleetSummary({
      monitor,
      budgetLedger: ledger,
    }).summarize({
      escalations: [
        { environment: 'prod', tenant: 'acme', taskFamily: 'release_review' },
        { environment: 'prod', tenant: 'acme', taskFamily: 'release_review' },
      ],
    });

    const adjustment = new ProgressiveAutonomyController({
      minimumEvidenceScore: 0.8,
    }).adjust(envelope, {
      evidenceScore: 0.91,
      environment: 'prod',
      tenant: 'acme',
      reason: 'attempted autonomy widening before enough evidence',
    });

    const guard = new AutonomyRolloutGuard().evaluate({
      adjustment,
      benchmarkReport,
      minimumEvidenceScore: 0.95,
    });

    expect(benchmarkReport).toMatchObject({
      total: 4,
      failed: 0,
    });
    expect(fleetSummary).toMatchObject({
      budgets: {
        total: 1,
      },
      escalationHotspots: {
        prod: 2,
      },
    });
    expect(guard).toMatchObject({
      action: 'block_rollout',
    });
  });

  test('UnifiedExecutionGraph stitches runtime, policy, memory, coordination, learning, and fleet signals', () => {
    const run = new Run({
      id: 'run-enterprise-1',
      input: 'Review the production release path and status update.',
    });
    run.setStatus('completed');
    run.addStep({
      id: 'run-enterprise-1:step:1',
      type: 'tool',
      status: 'completed',
      output: { delivered: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const graph = new UnifiedExecutionGraph().build({
      run,
      policyDecisions: [
        {
          id: 'policy:approval',
          action: 'require_approval',
          toolName: 'send_status_update',
        },
      ],
      memoryAudit: [
        {
          id: 'memory:write:1',
          type: 'memory_write',
          key: 'release_summary',
          layer: 'episodic',
        },
      ],
      coordination: {
        id: 'coordination:1',
        action: 'review',
      },
      learnedChanges: [
        {
          id: 'learning:1',
          summary: 'Increase release-review verification depth',
          action: 'adjust_verification',
        },
      ],
      fleet: {
        id: 'fleet:prod',
        action: 'allow_rollout',
        environment: 'prod',
      },
    });

    expect(graph.summarize()).toMatchObject({
      nodes: 7,
      edges: 6,
      nodeTypes: expect.arrayContaining([
        'run',
        'runtime_step',
        'policy_decision',
        'memory_event',
        'coordination',
        'learned_change',
        'fleet',
      ]),
    });
  });

  test('Enterprise autonomy architecture and operating model describe one supervised-autonomy operating pattern', () => {
    const architecture = new EnterpriseAutonomyArchitecture({
      services: [
        { id: 'api-service', role: 'request_ingress' },
        { id: 'worker-service', role: 'execution' },
        { id: 'control-plane', role: 'operator_surface' },
      ],
      storage: [
        { id: 'run-store', type: 'durable_runs' },
        { id: 'memory-store', type: 'governed_memory' },
      ],
      operators: [
        { id: 'ops-oncall', role: 'incident_response' },
      ],
      environments: [
        { id: 'prod', tenants: ['acme'] },
      ],
    }).build();

    const operatingModel = new EnterpriseOperatingModel().build({
      incident: {
        action: 'inspect_failed_run',
      },
      approvals: [{ id: 'approval-1' }],
      checkpoints: [{ id: 'checkpoint-1' }],
      recovery: {
        action: 'partial_replay',
      },
      rollback: {
        action: 'rollback_rollout',
      },
      fleet: {
        action: 'halt_rollout',
      },
    });

    expect(architecture).toMatchObject({
      summary: {
        services: 3,
        storageBackends: 2,
        operators: 1,
        environments: 1,
      },
    });
    expect(operatingModel).toMatchObject({
      summary: {
        hasIncident: true,
        hasRecovery: true,
        hasRollback: true,
      },
    });
    expect(operatingModel.phases.map(phase => phase.phase)).toEqual(
      expect.arrayContaining(['incident', 'approval', 'checkpoint', 'recovery', 'rollback', 'fleet'])
    );
  });

  test('Autonomy stack comparison and drift guard detect blocked config drift', () => {
    const baseline = new AutonomyStackConfig({
      id: 'prod-baseline',
      environment: 'prod',
      tenant: 'acme',
      routing: { primaryModel: 'code-model', fallbackModel: 'cheap-model' },
      policy: { approvalMode: 'required', maxRisk: 'medium' },
      memory: { retentionDays: 30, trustZone: 'private' },
      autonomy: { maxSpend: 5, reviewThreshold: 0.7 },
      fleet: { canaryPercent: 10 },
      operator: { reviewDashboard: 'v2' },
    });
    const candidate = new AutonomyStackConfig({
      id: 'prod-candidate',
      environment: 'prod',
      tenant: 'acme',
      routing: { primaryModel: 'code-model-v2', fallbackModel: 'cheap-model' },
      policy: { approvalMode: 'auto', maxRisk: 'high' },
      memory: { retentionDays: 30, trustZone: 'private' },
      autonomy: { maxSpend: 8, reviewThreshold: 0.6 },
      fleet: { canaryPercent: 25 },
      operator: { reviewDashboard: 'v2' },
    });

    const comparison = new AutonomyStackComparator().compare(baseline, candidate);
    const driftGuard = new AutonomyDriftGuard().evaluate(comparison, {
      blockedSections: ['policy'],
      maxChanges: 5,
    });

    expect(comparison.summary).toMatchObject({
      totalChanges: 6,
      sectionsChanged: expect.arrayContaining(['routing', 'policy', 'autonomy', 'fleet']),
    });
    expect(driftGuard).toMatchObject({
      action: 'block_deploy',
      reasons: expect.arrayContaining([expect.stringContaining('blocked section "policy"')]),
    });
  });

  test('OperationalScorecard summarizes reliability, governance, memory, routing, and operator load', () => {
    const scorecard = new OperationalScorecard().evaluate({
      runs: [
        { id: 'run-1', status: 'completed' },
        { id: 'run-2', status: 'failed' },
        { id: 'run-3', status: 'waiting_for_approval' },
      ],
      governance: {
        blocked: 1,
        rollbackRecommendations: 1,
      },
      memory: {
        flags: ['memory_access_blocked', 'memory_conflicts_detected'],
        summary: {
          benchmarkFailures: 1,
        },
      },
      routing: {
        degraded: 1,
        drifted: 2,
      },
      operator: {
        totals: { incidents: 1 },
        learning: { pendingReview: 1 },
      },
    });

    expect(scorecard).toMatchObject({
      reliability: { failedRuns: 1, pausedRuns: 1 },
      governance: { blocked: 1, rollbackRecommendations: 1 },
      memoryHygiene: { flags: 2, benchmarkFailures: 1 },
      routingQuality: { degraded: 1, drifted: 2 },
      operatorLoad: { openIncidents: 1, pendingReviews: 1 },
    });
    expect(typeof scorecard.overall).toBe('number');
  });

  test('EnterpriseAutonomyBenchmarkSuite covers long-lived execution, supervised autonomy, and rollback discipline', async () => {
    const report = await new EnterpriseAutonomyBenchmarkSuite().run({
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
      },
    });

    expect(report).toMatchObject({
      total: 3,
      failed: 0,
    });
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'enterprise-long-lived-objective', passed: true }),
        expect.objectContaining({ id: 'enterprise-supervised-autonomy', passed: true }),
        expect.objectContaining({ id: 'enterprise-rollback-discipline', passed: true }),
      ])
    );
  });

  test('CoordinationSafetyGuard detects loops, forbidden role overlap, delegation pressure, and shared-context scoping', () => {
    const safetyGuard = new CoordinationSafetyGuard({
      maxRepeatedActionCount: 2,
      delegationBudget: new DelegationBudget({
        maxTotalDelegations: 1,
        perActor: { 'multi-role-alpha': 1 },
      }),
      sharedContextScope: new SharedContextScope({
        roleScopes: {
          planner: ['ticketId', 'releaseWindow'],
          executor: ['ticketId'],
          verifier: ['ticketId'],
        },
      }),
    });

    const evaluation = safetyGuard.evaluate({
      history: [
        { resolution: { action: 'branch_and_retry' } },
        { resolution: { action: 'branch_and_retry' } },
        { resolution: { action: 'branch_and_retry' } },
      ],
      assignments: [
        { role: 'planner', actor: { id: 'planner-beta' } },
        { role: 'executor', actor: { id: 'multi-role-alpha' } },
        { role: 'verifier', actor: { id: 'multi-role-alpha' } },
      ],
      sharedContext: {
        ticketId: 'REL-204',
        releaseWindow: '2026-03-21T10:00:00Z',
        secretToken: 'top-secret',
      },
      requestedDelegations: [
        { actorId: 'multi-role-alpha', count: 2 },
      ],
    });

    expect(evaluation).toMatchObject({
      action: 'block',
      flags: expect.arrayContaining([
        'anti_loop_triggered',
        'anti_collusion_triggered',
        'delegation_budget_exhausted',
        'scoped_shared_context_enforced',
      ]),
    });
    expect(evaluation.filteredContext.executor).toMatchObject({
      redactedKeys: ['releaseWindow', 'secretToken'],
    });
  });

  test('Tool exposes unified schema and provider-specific representations', async () => {
    const tool = new Tool({
      name: 'calculate',
      description: 'Do math',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
      implementation: async ({ expression }) => ({ result: expression }),
    });

    expect(tool.toUnifiedSchema()).toMatchObject({
      name: 'calculate',
      description: 'Do math',
      metadata: expect.objectContaining({
        sideEffectLevel: 'none',
        executionPolicy: 'auto',
        verificationPolicy: 'auto',
      }),
    });
    expect(tool.toOpenAIFunction()).toEqual({
      name: 'calculate',
      description: 'Do math',
      parameters: tool.parameters,
    });
    expect(tool.toAnthropicTool()).toEqual({
      name: 'calculate',
      description: 'Do math',
      input_schema: tool.parameters,
    });
    await expect(tool.call({ expression: '1+1' })).resolves.toEqual({ result: '1+1' });
  });

  test('PolicyPack and PolicySimulator export and simulate portable policy artifacts', () => {
    const pack = new PolicyPack({
      id: 'demo-policy-pack',
      name: 'demo-policy',
      version: '1.0.0',
      rules: [
        {
          id: 'require-approval-writes',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
        },
      ],
    });
    const simulator = new PolicySimulator({ policyPack: pack });
    const run = new Run({
      toolCalls: [
        {
          name: 'send_status_update',
          arguments: { recipient: 'Paulo' },
          metadata: { sideEffectLevel: 'external_write' },
        },
      ],
      status: 'completed',
    });

    const report = simulator.simulateRun(run);

    expect(PolicyPack.fromJSON(pack.toJSON()).name).toBe('demo-policy');
    expect(report).toBeInstanceOf(PolicyDecisionReport);
    expect(report.summarize()).toMatchObject({
      total: 1,
      approvalsRequired: 1,
      ruleCounts: {
        'require-approval-writes': 1,
      },
    });
    expect(report.toJSON().decisions).toEqual([
      expect.objectContaining({
        toolName: 'send_status_update',
        action: 'require_approval',
        matchedRule: expect.objectContaining({
          id: 'require-approval-writes',
        }),
        policyPackId: 'demo-policy-pack',
        policyPackVersion: '1.0.0',
      }),
    ]);

    const evaluationRecord = simulator.createEvaluationRecord(
      {
        type: 'run',
        runId: run.id,
      },
      report
    );

    expect(evaluationRecord).toBeInstanceOf(PolicyEvaluationRecord);
    expect(PolicyEvaluationRecord.fromJSON(evaluationRecord.toJSON()).summarize()).toMatchObject({
      subject: {
        type: 'run',
        runId: run.id,
      },
      summary: expect.objectContaining({
        approvalsRequired: 1,
      }),
      explanations: [
        expect.objectContaining({
          ruleId: 'require-approval-writes',
          explanation: expect.stringContaining('require_approval because rule "require-approval-writes"'),
        }),
      ],
    });
    expect(report.explain()).toMatchObject({
      decisions: [
        expect.objectContaining({
          ruleId: 'require-approval-writes',
          explanation: expect.stringContaining('require_approval because rule "require-approval-writes"'),
        }),
      ],
    });
  });

  test('ExtensionManifest and ConformanceKit publish and validate interop declarations', () => {
    const extension = {
      name: 'interop-extension',
      version: '1.0.0',
      contributes: {
        eventSinks: [{ name: 'sink', async handleEvent() {} }],
        policyRules: [{ id: 'rule-1', toolNames: ['send_status_update'], action: 'require_approval' }],
      },
    };

    const manifest = ExtensionManifest.fromExtension(extension);
    const kit = new ConformanceKit();
    const extensionReport = kit.validateExtension(extension, { manifest });
    const storeReport = kit.validateStore(new InMemoryJobStore(), { type: 'job' });

    expect(ExtensionManifest.validate(manifest.toJSON())).toEqual({
      valid: true,
      errors: [],
    });
    expect(extensionReport).toMatchObject({
      valid: true,
      errors: [],
      summary: {
        manifestName: 'interop-extension',
        manifestKind: 'extension',
        registered: true,
      },
    });
    expect(storeReport).toEqual({
      valid: true,
      errors: [],
      summary: {
        type: 'job',
      },
    });
  });

  test('EvalReportArtifact and ArtifactCompatibilitySuite validate maintained interop artifacts', () => {
    const run = new Run({
      input: 'validate artifacts',
      status: 'completed',
      metadata: {
        lineage: {
          rootRunId: 'interop-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });
    run.addCheckpoint({
      id: `${run.id}:checkpoint:1`,
      label: 'run_completed',
      status: 'completed',
      snapshot: run.createCheckpointSnapshot(),
    });

    const suite = new ArtifactCompatibilitySuite();
    const report = suite.run({
      trace: TraceSerializer.exportRun(run),
      traceBundle: TraceSerializer.exportBundle([run]),
      policyPack: PolicyPack.fromToolPolicy(new ToolPolicy(), { name: 'interop-policy' }).toJSON(),
      policyEvaluation: new PolicyEvaluationRecord({
        subject: { type: 'run', runId: run.id },
        report: {
          summary: { total: 1 },
          explanations: [],
        },
      }).toJSON(),
      stateBundle: new StateBundle({ run }).toJSON(),
      evalReport: EvalReportArtifact.fromReport({
        total: 1,
        passed: 1,
        failed: 0,
        results: [{ id: 'interop-eval', passed: true, durationMs: 1, error: null }],
      }).toJSON(),
      manifest: ExtensionManifest.fromExtension({
        name: 'interop-manifest',
        contributes: { evalScenarios: [{ id: 'scenario-1', run: async () => 'ok', assert: output => output === 'ok' }] },
      }).toJSON(),
    });

    expect(report).toMatchObject({
      total: 7,
      passed: 7,
      failed: 0,
    });
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'trace', valid: true }),
        expect.objectContaining({ type: 'traceBundle', valid: true }),
        expect.objectContaining({ type: 'policyPack', valid: true }),
        expect.objectContaining({ type: 'policyEvaluation', valid: true }),
        expect.objectContaining({ type: 'stateBundle', valid: true }),
        expect.objectContaining({ type: 'evalReport', valid: true }),
        expect.objectContaining({ type: 'manifest', valid: true }),
      ])
    );
  });

  test('InteropContractValidator validates manifest and eval artifacts from files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interop-validator-'));
    const manifestPath = path.join(tempDir, 'manifest.json');
    const evalReportPath = path.join(tempDir, 'eval-report.json');

    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        ExtensionManifest.fromExtension({
          name: 'external-package',
          contributes: { evalScenarios: [{ id: 'external-scenario', run: async () => 'ok', assert: output => output === 'ok' }] },
        }).toJSON()
      )
    );
    fs.writeFileSync(
      evalReportPath,
      JSON.stringify(
        EvalReportArtifact.fromReport({
          total: 1,
          passed: 1,
          failed: 0,
          results: [{ id: 'external-check', passed: true, durationMs: 1, error: null }],
        }).toJSON()
      )
    );

    const validator = new InteropContractValidator();
    const report = validator.validateFiles([
      { filePath: manifestPath, type: 'manifest' },
      { filePath: evalReportPath, type: 'evalReport' },
    ]);

    expect(report).toMatchObject({
      total: 2,
      passed: 2,
      failed: 0,
    });
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'manifest', valid: true }),
        expect.objectContaining({ type: 'evalReport', valid: true }),
      ])
    );
  });

  test('CertificationKit and CompatibilitySummary build public certification rollups for adapters and stores', () => {
    const kit = new CertificationKit();
    const providerResult = kit.certifyProvider({
      getCapabilities: () => ({
        generateText: true,
        toolCalling: true,
      }),
      supports: capability => capability === 'generateText' || capability === 'toolCalling',
      generateText: async () => ({ message: 'ok' }),
    }, {
      name: 'reference-provider',
    });
    const storeResult = kit.certifyStore(new InMemoryJobStore(), {
      type: 'job',
      name: 'reference-job-store',
    });
    const summary = CompatibilitySummary.build([providerResult, storeResult]);

    expect(providerResult).toMatchObject({
      target: 'reference-provider',
      kind: 'provider_adapter',
      level: 'contract_verified',
      valid: true,
    });
    expect(storeResult).toMatchObject({
      target: 'reference-job-store',
      kind: 'job_store',
      level: 'contract_verified',
      valid: true,
    });
    expect(summary).toMatchObject({
      total: 2,
      valid: 2,
      invalid: 0,
      byLevel: {
        contract_verified: 2,
      },
    });
  });

  test('DeploymentPatternCertificationKit certifies maintained deployment patterns with operational checks', () => {
    const kit = new DeploymentPatternCertificationKit();
    const results = kit.certifyMany([
      {
        pattern: 'supervised_autonomy_stack',
        name: 'reference-supervised-stack',
        deployment: {
          services: ['runtime', 'policy', 'operator', 'assurance', 'fleet'],
          capabilities: ['approvalWorkflows', 'humanReview', 'rollback', 'memoryGovernance'],
          environmentScopes: ['staging', 'prod'],
          approvalOrganizations: ['ops'],
          stores: {
            run: new InMemoryRunStore(),
            job: new InMemoryJobStore(),
          },
          providers: [
            {
              name: 'reference-provider',
              adapter: {
                getCapabilities: () => ({ generateText: true }),
                supports: capability => capability === 'generateText',
                generateText: async () => ({ message: 'ok' }),
              },
            },
          ],
        },
      },
      {
        pattern: 'public_control_plane',
        name: 'reference-public-control-plane',
        deployment: {
          services: ['control_plane', 'operator', 'policy'],
          capabilities: ['auditExport', 'tenantIsolation', 'approvalWorkflows'],
          environmentScopes: ['prod'],
          approvalOrganizations: ['ops', 'compliance'],
          tenantBoundaries: ['tenant_id'],
          stores: {
            run: new InMemoryRunStore(),
          },
        },
      },
    ]);

    const summary = CompatibilitySummary.build(results);

    expect(results[0]).toMatchObject({
      target: 'reference-supervised-stack',
      kind: 'deployment_pattern',
      pattern: 'supervised_autonomy_stack',
      level: 'operationally_certified',
      valid: true,
    });
    expect(results[1]).toMatchObject({
      target: 'reference-public-control-plane',
      kind: 'deployment_pattern',
      pattern: 'public_control_plane',
      level: 'operationally_certified',
      valid: true,
    });
    expect(summary).toMatchObject({
      total: 2,
      valid: 2,
      invalid: 0,
      byLevel: {
        operationally_certified: 2,
      },
    });
  });

  test('ToolSchemaArtifact and InteropArtifactRegistry import and export maintained artifact families', () => {
    const registry = new InteropArtifactRegistry();
    const tool = new Tool({
      name: 'send_status_update',
      description: 'Send a status update.',
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
    });
    const run = new Run({
      id: 'interop-registry-run',
      input: 'send update',
      status: 'completed',
      output: 'ok',
    });
    run.addCheckpoint({
      id: 'interop-registry-run:checkpoint:1',
      label: 'run_completed',
      status: 'completed',
      snapshot: run.createCheckpointSnapshot(),
    });

    const toolArtifact = registry.export('tool', tool);
    const traceArtifact = registry.export('trace', run);
    const policyArtifact = registry.export(
      'policyPack',
      PolicyPack.fromToolPolicy(new ToolPolicy(), { name: 'interop-registry-policy' })
    );
    const evalArtifact = registry.export('evalReport', {
      total: 1,
      passed: 1,
      failed: 0,
    });
    const manifestArtifact = registry.export(
      'manifest',
      ExtensionManifest.fromExtension({
        name: 'interop-registry-extension',
        contributes: {
          policyRules: [{ id: 'interop-registry-rule' }],
        },
      })
    );

    const importedToolArtifact = registry.import('tool', toolArtifact);
    const importedTool = importedToolArtifact.toTool({
      implementation: async args => args,
    });
    const importedTrace = registry.import('trace', traceArtifact);
    const importedPolicyPack = registry.import('policyPack', policyArtifact);
    const importedEvalArtifact = registry.import('evalReport', evalArtifact);
    const importedManifest = registry.import('manifest', manifestArtifact);

    expect(toolArtifact.format).toBe('agnostic-agents-tool-schema');
    expect(importedToolArtifact).toBeInstanceOf(ToolSchemaArtifact);
    expect(importedTool.name).toBe('send_status_update');
    expect(importedTrace.id).toBe('interop-registry-run');
    expect(importedPolicyPack.name).toBe('interop-registry-policy');
    expect(importedEvalArtifact.summarize()).toMatchObject({
      total: 1,
      passed: 1,
      failed: 0,
    });
    expect(importedManifest.name).toBe('interop-registry-extension');
  });

  test('PolicyPack can diff versions of a policy artifact', () => {
    const baseline = new PolicyPack({
      id: 'policy-pack',
      name: 'ops-policy',
      version: '1.0.0',
      defaultAction: 'allow',
      rules: [
        { id: 'approval-write', sideEffectLevels: ['external_write'], action: 'require_approval' },
      ],
    });
    const updated = new PolicyPack({
      id: 'policy-pack',
      name: 'ops-policy',
      version: '1.1.0',
      defaultAction: 'allow',
      rules: [
        { id: 'approval-write', sideEffectLevels: ['external_write'], action: 'require_approval' },
        { id: 'deny-destructive', sideEffectLevels: ['destructive'], action: 'deny' },
      ],
      denyTools: ['drop_production_db'],
    });

    expect(baseline.diff(updated)).toMatchObject({
      left: { version: '1.0.0' },
      right: { version: '1.1.0' },
      denyToolsChanged: true,
      addedRules: [
        expect.objectContaining({
          id: 'deny-destructive',
        }),
      ],
    });
  });

  test('PolicyScopeResolver merges runtime, workflow, agent, and handoff scopes by precedence', () => {
    const resolver = new PolicyScopeResolver();
    const runtimePack = new PolicyPack({
      id: 'runtime-pack',
      name: 'runtime-pack',
      rules: [
        {
          id: 'runtime-require-approval',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
        },
      ],
      allowTools: ['send_status_update', 'generate_report'],
      denyTools: ['delete_records'],
      metadata: {
        scope: 'runtime',
      },
    });
    const workflowPack = new PolicyPack({
      id: 'workflow-pack',
      name: 'workflow-pack',
      rules: [
        {
          id: 'workflow-sensitive-tag',
          tags: ['sensitive'],
          action: 'require_approval',
        },
      ],
      allowTools: ['send_status_update'],
      metadata: {
        scope: 'workflow',
      },
    });
    const agentPack = new PolicyPack({
      id: 'agent-pack',
      name: 'agent-pack',
      rules: [
        {
          id: 'agent-deny-bulk-export',
          toolNames: ['bulk_export'],
          action: 'deny',
        },
      ],
      metadata: {
        scope: 'agent',
      },
    });
    const handoffPack = new PolicyPack({
      id: 'handoff-pack',
      name: 'handoff-pack',
      version: '2.0.0',
      rules: [
        {
          id: 'handoff-deny-send-status',
          toolNames: ['send_status_update'],
          action: 'deny',
        },
      ],
      metadata: {
        scope: 'handoff',
      },
    });

    const resolved = resolver.resolve({
      runtime: runtimePack,
      workflow: workflowPack,
      agent: agentPack,
      distributedHandoff: handoffPack,
    });

    expect(resolved.id).toBe('handoff-pack');
    expect(resolved.version).toBe('2.0.0');
    expect(resolved.metadata.appliedScopes).toEqual(['runtime', 'workflow', 'agent', 'handoff']);
    expect(resolved.allowTools).toEqual(['send_status_update']);
    expect(resolved.denyTools).toEqual(['delete_records']);
    expect(resolved.rules.map(rule => rule.id)).toEqual([
      'handoff-deny-send-status',
      'agent-deny-bulk-export',
      'workflow-sensitive-tag',
      'runtime-require-approval',
    ]);

    const decision = resolved.toToolPolicy().evaluate(
      {
        name: 'send_status_update',
        metadata: {
          sideEffectLevel: 'external_write',
        },
      },
      {}
    );

    expect(decision).toMatchObject({
      action: 'deny',
      ruleId: 'handoff-deny-send-status',
      source: 'rule',
    });
  });

  test('CoordinationPolicyGate composes runtime and coordination policy into a gating decision', () => {
    const gate = new CoordinationPolicyGate({
      scopes: {
        runtime: new PolicyPack({
          id: 'runtime-pack',
          name: 'runtime-pack',
          rules: [
            {
              id: 'require-review-for-branch-retry',
              toolNames: ['coordination:branch_and_retry'],
              action: 'require_approval',
            },
          ],
        }),
        agent: new PolicyPack({
          id: 'coordination-pack',
          name: 'coordination-pack',
          rules: [
            {
              id: 'deny-policy-retries',
              toolNames: ['coordination:branch_and_retry'],
              tags: ['policy'],
              action: 'deny',
            },
          ],
        }),
      },
    });

    const resolution = {
      action: 'branch_and_retry',
      disagreement: false,
      rankedCritiques: [
        {
          failureType: 'policy',
          severity: 'high',
        },
      ],
    };

    const evaluation = gate.evaluate(resolution, {
      candidate: {
        id: 'coordination-candidate-1',
      },
      review: {
        summary: {
          total: 1,
          highestSeverity: 'high',
        },
      },
      context: {
        taskFamily: 'release_review',
      },
    });

    expect(evaluation).toMatchObject({
      action: 'branch_and_retry',
      allowed: false,
      gatedAction: 'escalate',
      policyDecision: expect.objectContaining({
        action: 'deny',
        ruleId: 'deny-policy-retries',
      }),
    });

    expect(gate.createEvaluationRecord(resolution).summarize()).toMatchObject({
      summary: expect.objectContaining({
        denied: 1,
      }),
      explanations: [
        expect.objectContaining({
          ruleId: 'deny-policy-retries',
        }),
      ],
    });
  });

  test('PolicyLifecycleManager promotes drafts and rolls back to previous active versions', () => {
    const lifecycle = new PolicyLifecycleManager({
      active: new PolicyPack({
        id: 'ops-policy',
        name: 'ops-policy',
        version: '1.0.0',
        rules: [{ id: 'approval-write', sideEffectLevels: ['external_write'], action: 'require_approval' }],
      }),
    });

    lifecycle.setDraft(
      new PolicyPack({
        id: 'ops-policy',
        name: 'ops-policy',
        version: '1.1.0',
        rules: [
          { id: 'approval-write', sideEffectLevels: ['external_write'], action: 'require_approval' },
          { id: 'deny-destructive', sideEffectLevels: ['destructive'], action: 'deny' },
        ],
      })
    );

    const promotion = lifecycle.promote(undefined, {
      reason: 'Promote tested destructive-action guardrails.',
    });

    expect(promotion).toMatchObject({
      action: 'promote',
      active: expect.objectContaining({
        version: '1.1.0',
      }),
      previousActive: expect.objectContaining({
        version: '1.0.0',
      }),
    });

    const rollback = lifecycle.rollback({
      version: '1.0.0',
      reason: 'Restore the baseline after rollout review.',
    });

    expect(rollback).toMatchObject({
      action: 'rollback',
      active: expect.objectContaining({
        version: '1.0.0',
      }),
      rolledBackFrom: expect.objectContaining({
        version: '1.1.0',
      }),
    });

    expect(lifecycle.summarize()).toMatchObject({
      active: expect.objectContaining({
        version: '1.0.0',
      }),
      historyCount: 2,
    });
  });

  test('RecoveryPolicyGate applies policy-aware constraints to replay and branch recovery steps', () => {
    const gate = new RecoveryPolicyGate({
      policyPack: new PolicyPack({
        id: 'recovery-policy-pack',
        name: 'recovery-policy-pack',
        rules: [
          {
            id: 'require-review-for-branch-recovery',
            toolNames: ['recovery:branch_from_failure_checkpoint'],
            action: 'require_approval',
          },
          {
            id: 'allow-partial-replay',
            toolNames: ['recovery:partial_replay'],
            action: 'allow',
          },
        ],
      }),
    });

    const plan = {
      runId: 'recovery-run-1',
      incidentType: 'tool_failure',
      recommendedAction: 'branch_from_failure_checkpoint',
      steps: [
        {
          action: 'branch_from_failure_checkpoint',
          priority: 'high',
          requiresApproval: true,
        },
        {
          action: 'partial_replay',
          priority: 'medium',
          requiresApproval: false,
        },
      ],
    };

    const evaluation = gate.evaluatePlan(plan);

    expect(evaluation).toMatchObject({
      runId: 'recovery-run-1',
      summary: {
        total: 2,
        blocked: 1,
        allowed: 1,
      },
      recommendedAction: 'require_recovery_approval',
    });
    expect(evaluation.evaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          step: expect.objectContaining({ action: 'branch_from_failure_checkpoint' }),
          allowed: false,
          gatedAction: 'require_recovery_approval',
          policyDecision: expect.objectContaining({
            action: 'require_approval',
            ruleId: 'require-review-for-branch-recovery',
          }),
        }),
        expect.objectContaining({
          step: expect.objectContaining({ action: 'partial_replay' }),
          allowed: true,
          gatedAction: 'partial_replay',
          policyDecision: expect.objectContaining({
            action: 'allow',
            ruleId: 'allow-partial-replay',
          }),
        }),
      ])
    );

    expect(gate.createEvaluationRecord(plan).summarize()).toMatchObject({
      summary: expect.objectContaining({
        approvalsRequired: 1,
        allowed: 1,
      }),
    });
  });

  test('CompensationPolicyPlanner turns side-effecting entries into policy-aware compensation recommendations', () => {
    const planner = new CompensationPolicyPlanner({
      policyPack: new PolicyPack({
        id: 'compensation-policy-pack',
        name: 'compensation-policy-pack',
        rules: [
          {
            id: 'require-approval-for-external-write-compensation',
            sideEffectLevels: ['external_write'],
            action: 'require_approval',
          },
          {
            id: 'allow-internal-cleanup-compensation',
            sideEffectLevels: ['internal_write'],
            action: 'allow',
          },
        ],
      }),
    });

    const entries = [
      {
        toolName: 'send_status_update',
        stepId: 'notify-user',
        sideEffectLevel: 'external_write',
        compensationHandler: true,
      },
      {
        toolName: 'cache_temp_record',
        stepId: 'cache-temp',
        sideEffectLevel: 'internal_write',
        compensationHandler: true,
      },
    ];

    const plan = planner.plan(entries, {
      runId: 'compensation-run-1',
    });

    expect(plan).toMatchObject({
      summary: {
        total: 2,
        approvalsRequired: 1,
        autoCompensate: 1,
      },
      recommendedAction: 'approval_required',
    });
    expect(plan.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entry: expect.objectContaining({ stepId: 'notify-user' }),
          recommendedAction: 'approval_required',
          policyDecision: expect.objectContaining({
            action: 'require_approval',
            ruleId: 'require-approval-for-external-write-compensation',
          }),
        }),
        expect.objectContaining({
          entry: expect.objectContaining({ stepId: 'cache-temp' }),
          recommendedAction: 'auto_compensate',
          policyDecision: expect.objectContaining({
            action: 'allow',
            ruleId: 'allow-internal-cleanup-compensation',
          }),
        }),
      ])
    );

    expect(planner.createEvaluationRecord(entries, { runId: 'compensation-run-1' }).summarize()).toMatchObject({
      summary: expect.objectContaining({
        approvalsRequired: 1,
        allowed: 1,
      }),
    });
  });

  test('StateBundle and StateDiff export and compare portable state bundles', () => {
    const run = new Run({
      input: 'bundle state',
      status: 'completed',
      state: {
        assessment: { confidence: 0.91 },
      },
      messages: [
        { role: 'user', content: 'bundle state' },
      ],
      toolCalls: [
        { name: 'search_docs', arguments: { query: 'state' } },
      ],
    });
    run.addCheckpoint({
      id: `${run.id}:checkpoint:1`,
      label: 'run_completed',
      status: 'completed',
      snapshot: run.createCheckpointSnapshot(),
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'bundle-state',
        },
      },
      metadata: {
        purpose: 'state-bundle-test',
      },
    });

    const exported = bundle.toJSON();
    const restored = StateBundleSerializer.import(exported);
    const evolved = new StateBundle({
      run: new Run({
        ...run.toJSON(),
        status: 'failed',
        state: {
          ...run.state,
          recovery: { required: true },
        },
      }),
      memory: {
        working: {
          active_task: 'bundle-state',
        },
        semantic: {
          last_incident: 'state-drift',
        },
      },
    });

    expect(StateBundleSerializer.validate(exported)).toEqual({
      valid: true,
      errors: [],
    });
    expect(restored.summarize()).toMatchObject({
      runId: run.id,
      status: 'completed',
      checkpointCount: 1,
      memoryLayers: ['working'],
    });
    expect(StateDiff.diff(restored, evolved)).toMatchObject({
      statusChanged: true,
      stateKeysAdded: ['recovery'],
      memoryLayersAdded: ['semantic'],
    });
  });

  test('StateBundle carries memory governance payloads and StateConsistencyChecker validates them', async () => {
    const memory = new Memory({
      governance: {
        provenanceLedger: new MemoryProvenanceLedger(),
      },
    });
    await memory.setWorkingMemory('active_task', 'Bundle this state.', {
      metadata: { source: 'runtime' },
      context: { actor: 'runtime', trustZone: 'internal' },
    });

    const accessContracts = new MemoryAccessContractRegistry();
    const governedState = memory.exportGovernedState({ accessContracts });
    const run = new Run({
      input: 'Bundle this state.',
      status: 'completed',
    });

    const bundle = new StateBundle({
      run,
      memory: governedState.layers,
      memoryGovernance: governedState.governance,
      metadata: { jobs: [] },
    });

    const exported = bundle.toJSON();
    expect(exported.summary.memoryGovernanceEvents).toBeGreaterThan(0);
    expect(exported.summary.memoryContractSurfaces).toEqual(
      expect.arrayContaining(['runtime', 'workflow', 'coordination', 'learning', 'operator'])
    );

    const report = new StateConsistencyChecker().check(exported);
    expect(report.valid).toBe(true);
    expect(report.summary.memoryGovernanceEvents).toBeGreaterThan(0);
    expect(report.summary.memoryContractSurfaces).toEqual(
      expect.arrayContaining(['runtime', 'workflow', 'coordination', 'learning', 'operator'])
    );
  });

  test('StateContractRegistry and StateIntegrityChecker define and validate portable state contracts', () => {
    const registry = new StateContractRegistry();
    const checker = new StateIntegrityChecker({
      contractRegistry: registry,
    });
    const run = new Run({
      input: 'integrity-check',
      status: 'completed',
      state: {
        assessment: { confidence: 0.88 },
      },
      metrics: {
        childRuns: {
          count: 1,
          items: [],
        },
      },
      metadata: {
        lineage: {
          rootRunId: 'run-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'integrity-check',
        },
      },
    });

    const report = checker.check(bundle.toJSON());

    expect(registry.describe('state_bundle')).toMatchObject({
      authoritative: expect.arrayContaining(['run.id', 'run.state', 'memory']),
      derived: expect.arrayContaining(['summary.runId', 'summary.memoryLayers']),
    });
    expect(report).toMatchObject({
      valid: false,
      errors: ['run.metrics.childRuns.count does not match childRuns.items length.'],
      contract: expect.objectContaining({
        restorationCritical: expect.arrayContaining(['run.id', 'run.checkpoints']),
      }),
    });
  });

  test('StateConsistencyChecker validates coherence across run, memory, and job metadata', () => {
    const run = new Run({
      input: 'resume state reconciliation',
      status: 'paused',
      state: {
        recovery: { required: true },
        scheduler: { jobId: 'job-1' },
      },
      pendingPause: {
        stage: 'replay',
        jobId: 'job-1',
      },
      metadata: {
        jobId: 'job-1',
        lineage: {
          rootRunId: 'state-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'resume state reconciliation',
        },
      },
      metadata: {
        jobs: [
          {
            id: 'job-1',
            runId: run.id,
            status: 'scheduled',
            handler: 'resume_run',
          },
        ],
      },
    });

    const checker = new StateConsistencyChecker();
    const report = checker.check(bundle);

    expect(report).toMatchObject({
      valid: true,
      errors: [],
      summary: {
        runId: run.id,
        runStatus: 'paused',
        memoryLayers: ['working'],
        referencedJobIds: ['job-1'],
        resolvedJobIds: ['job-1'],
      },
    });
    expect(report.warnings).toEqual([
      'Portable state bundle includes memory layers but no memory governance audit trail.',
      'Run requires recovery but semantic memory does not record the last incident context.',
    ]);
  });

  test('StateRestorePlanner builds a cross-environment restore plan from a portable state bundle', () => {
    const run = new Run({
      input: 'restore me remotely',
      status: 'paused',
      pendingPause: {
        stage: 'replay',
        reason: 'Prepared for remote replay.',
      },
      metadata: {
        lineage: {
          rootRunId: 'restore-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });
    run.addCheckpoint({
      id: `${run.id}:checkpoint:1`,
      label: 'paused_replay',
      status: 'paused',
      snapshot: run.createCheckpointSnapshot(),
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'restore-me-remotely',
        },
      },
    });

    const planner = new StateRestorePlanner();
    const plan = planner.buildPlan(bundle, {
      sourceEnvironment: 'api-service',
      targetEnvironment: 'worker-service',
    });

    expect(plan).toMatchObject({
      readyToRestore: true,
      sourceEnvironment: 'api-service',
      targetEnvironment: 'worker-service',
    });
    expect(plan.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'validate_state_bundle', status: 'ready' }),
        expect.objectContaining({ action: 'restore_run_state', status: 'ready' }),
        expect.objectContaining({ action: 'restore_memory_layers', status: 'ready' }),
        expect.objectContaining({ action: 'resume_or_replay_from_restored_state', status: 'ready' }),
      ])
    );
  });

  test('StateDurableRestoreSuite builds process, queue, and service restore scenarios for long-running workflow state', () => {
    const run = new Run({
      input: 'restore long-running workflow',
      status: 'paused',
      state: {
        scheduler: { jobId: 'restore-job-1' },
      },
      steps: [
        {
          id: 'workflow-step-1',
          type: 'workflow_step',
          status: 'paused',
        },
      ],
      pendingPause: {
        stage: 'workflow_replay',
        reason: 'Prepared for durable workflow restore.',
        jobId: 'restore-job-1',
      },
      metadata: {
        jobId: 'restore-job-1',
        workflowId: 'workflow-restore-1',
        lineage: {
          rootRunId: 'restore-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });
    run.addCheckpoint({
      id: `${run.id}:checkpoint:1`,
      label: 'workflow_paused',
      status: 'paused',
      snapshot: run.createCheckpointSnapshot(),
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'restore long-running workflow',
        },
        semantic: {
          last_incident: 'worker-restart-during-workflow',
        },
      },
      metadata: {
        jobs: [
          {
            id: 'restore-job-1',
            runId: run.id,
            status: 'scheduled',
            handler: 'resume_workflow',
          },
        ],
      },
    });

    const suite = new StateDurableRestoreSuite();
    const report = suite.build(bundle, {
      sourceEnvironment: 'api-service',
    });

    expect(report).toMatchObject({
      sourceEnvironment: 'api-service',
      consistency: expect.objectContaining({
        valid: true,
      }),
    });
    expect(report.scenarios.map(scenario => scenario.targetEnvironment)).toEqual([
      'process-worker',
      'queue-worker',
      'service-runtime',
    ]);
    for (const scenario of report.scenarios) {
      expect(scenario.readyToRestore).toBe(true);
      expect(scenario.steps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'restore_run_state', status: 'ready' }),
          expect.objectContaining({ action: 'restore_memory_layers', status: 'ready' }),
          expect.objectContaining({ action: 'restore_workflow_progress', status: 'ready' }),
          expect.objectContaining({ action: 'restore_scheduler_jobs', status: 'ready' }),
          expect.objectContaining({ action: 'verify_scheduler_job_alignment', status: 'ready' }),
        ])
      );
    }
  });

  test('StateIncidentReconstructor rebuilds an offline incident report from a portable state bundle', () => {
    const run = new Run({
      input: 'reconstruct me offline',
      status: 'failed',
      steps: [
        {
          id: 'run-step-1',
          type: 'tool',
          status: 'failed',
        },
      ],
      errors: [
        {
          name: 'ToolExecutionError',
          message: 'send_status_update timed out',
        },
      ],
      pendingPause: {
        stage: 'replay',
        reason: 'Prepared for offline replay investigation.',
      },
      metrics: {
        childRuns: {
          count: 1,
          items: [],
        },
      },
      metadata: {
        lineage: {
          rootRunId: 'incident-root',
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });
    run.addCheckpoint({
      id: `${run.id}:checkpoint:1`,
      label: 'run_failed',
      status: 'failed',
      snapshot: run.createCheckpointSnapshot(),
    });

    const bundle = new StateBundle({
      run,
      memory: {
        working: {
          active_task: 'incident-reconstruction',
        },
        semantic: {
          last_incident: 'send-status-timeout',
        },
      },
    });

    const reconstructor = new StateIncidentReconstructor();
    const report = reconstructor.reconstruct(bundle);

    expect(report).toMatchObject({
      runId: run.id,
      status: 'failed',
      failure: expect.objectContaining({
        message: 'send_status_update timed out',
      }),
      lastCheckpoint: expect.objectContaining({
        label: 'run_failed',
      }),
      pendingPause: expect.objectContaining({
        stage: 'replay',
      }),
      memoryLayers: ['working', 'semantic'],
    });
    expect(report.failedSteps).toEqual([
      expect.objectContaining({
        id: 'run-step-1',
      }),
    ]);
    expect(report.integrity).toMatchObject({
      valid: false,
      errors: ['run.metrics.childRuns.count does not match childRuns.items length.'],
    });
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        'Resolve state-bundle integrity issues before attempting restore or replay.',
        expect.stringContaining('send_status_update timed out'),
        expect.stringContaining('run-step-1'),
        expect.stringContaining('working, semantic'),
      ])
    );
  });

  test('CritiqueProtocol and DisagreementResolver produce structured coordination outcomes', async () => {
    const protocol = new CritiqueProtocol({
      reviewers: [
        {
          id: 'critic-a',
          review: async candidate => ({
            criticId: 'critic-a',
            verdict: 'reject',
            failureType: 'reasoning',
            severity: 'high',
            confidence: 0.9,
            recommendedAction: 'branch_and_retry',
            rationale: `Reasoning chain in ${candidate.id} is incomplete.`,
          }),
        },
        {
          id: 'critic-b',
          review: async candidate => ({
            criticId: 'critic-b',
            verdict: 'accept',
            failureType: 'general',
            severity: 'low',
            confidence: 0.6,
            recommendedAction: 'accept',
            rationale: `${candidate.id} is acceptable.`,
          }),
        },
      ],
    });

    const trustRegistry = new TrustRegistry();
    trustRegistry.recordOutcome({
      actorId: 'critic-a',
      domain: 'reasoning',
      success: true,
      confidence: 0.95,
    });
    trustRegistry.recordOutcome({
      actorId: 'critic-a',
      domain: 'reasoning',
      success: true,
      confidence: 0.9,
    });
    trustRegistry.recordOutcome({
      actorId: 'critic-b',
      domain: 'reasoning',
      success: false,
      confidence: 0.4,
    });

    const review = await protocol.review({ id: 'candidate-1' });
    const resolver = new DisagreementResolver({ trustRegistry });
    const resolution = resolver.resolve(review.critiques, { domain: 'reasoning' });

    expect(review.summary).toEqual(
      expect.objectContaining({
        total: 2,
        disagreement: true,
      })
    );
    expect(resolution).toEqual(
      expect.objectContaining({
        action: 'escalate',
        disagreement: true,
      })
    );
    expect(resolution.rankedCritiques[0]).toEqual(
      expect.objectContaining({
        criticId: 'critic-a',
      })
    );
  });

  test('TrustRegistry and DisagreementResolver support task-family trust profiles and trust consensus', () => {
    const trustRegistry = new TrustRegistry({
      records: [
        {
          actorId: 'verifier-release',
          domain: 'release_review',
          taskFamily: 'release_review',
          role: 'verifier',
          success: true,
          confidence: 0.97,
          outcomeType: 'direct',
        },
        {
          actorId: 'critic-grounding',
          domain: 'release_review',
          taskFamily: 'release_review',
          role: 'critic',
          success: true,
          confidence: 0.92,
          outcomeType: 'recovery',
          recoverySucceeded: true,
        },
        {
          actorId: 'critic-style',
          domain: 'release_review',
          taskFamily: 'release_review',
          role: 'critic',
          success: false,
          confidence: 0.45,
          outcomeType: 'retry',
          retries: 2,
        },
      ],
    });

    const resolver = new DisagreementResolver({
      trustRegistry,
      strategy: 'trust_consensus',
      trustThreshold: 0.8,
      escalateOnDisagreement: false,
    });
    const resolution = resolver.resolve(
      [
        {
          criticId: 'verifier-release',
          verdict: 'accept',
          failureType: 'general',
          severity: 'low',
          confidence: 0.86,
          recommendedAction: 'accept',
          metadata: { role: 'verifier', taskFamily: 'release_review' },
        },
        {
          criticId: 'critic-grounding',
          verdict: 'reject',
          failureType: 'grounding',
          severity: 'high',
          confidence: 0.88,
          recommendedAction: 'branch_and_retry',
          metadata: { role: 'critic', taskFamily: 'release_review' },
        },
        {
          criticId: 'critic-style',
          verdict: 'revise',
          failureType: 'format',
          severity: 'low',
          confidence: 0.52,
          recommendedAction: 'revise',
          metadata: { role: 'critic', taskFamily: 'release_review' },
        },
      ],
      {
        domain: 'release_review',
        taskFamily: 'release_review',
      }
    );

    expect(trustRegistry.getScore('critic-grounding', {
      domain: 'release_review',
      taskFamily: 'release_review',
      role: 'critic',
    })).toBeGreaterThan(trustRegistry.getScore('critic-style', {
      domain: 'release_review',
      taskFamily: 'release_review',
      role: 'critic',
    }));
    expect(trustRegistry.getProfile('critic-grounding')).toEqual(
      expect.objectContaining({
        actorId: 'critic-grounding',
        byRole: [expect.objectContaining({ role: 'critic' })],
        byTaskFamily: [expect.objectContaining({ taskFamily: 'release_review' })],
      })
    );
    expect(resolution).toEqual(
      expect.objectContaining({
        strategy: 'trust_consensus',
        action: 'branch_and_retry',
      })
    );
    expect(resolution.summary.trustConsensus).toEqual(
      expect.objectContaining({
        threshold: 0.8,
      })
    );
  });

  test('CritiqueProtocol applies task-family critique schemas and taxonomies', async () => {
    const schemaRegistry = new CritiqueSchemaRegistry({
      schemas: {
        release_review: {
          taxonomy: {
            grounding: {
              severity: 'high',
              verdict: 'reject',
              recommendedAction: 'branch_and_retry',
              requiredEvidence: ['citations'],
            },
            policy: {
              severity: 'critical',
              verdict: 'escalate',
              recommendedAction: 'escalate',
              requiredEvidence: ['approval_record'],
            },
          },
        },
      },
    });

    const protocol = new CritiqueProtocol({
      schemaRegistry,
      reviewers: [
        {
          id: 'schema-aware-reviewer',
          review: async () => ({
            criticId: 'schema-aware-reviewer',
            failureType: 'grounding',
            rationale: 'The release note has unsupported claims.',
          }),
        },
      ],
    });

    const review = await protocol.review(
      { id: 'candidate-3', taskFamily: 'release_review' },
      { taskFamily: 'release_review' }
    );

    expect(review.critiques[0]).toEqual(
      expect.objectContaining({
        failureType: 'grounding',
        severity: 'high',
        verdict: 'reject',
        recommendedAction: 'branch_and_retry',
      })
    );
    expect(review.critiques[0].metadata).toEqual(
      expect.objectContaining({
        taskFamily: 'release_review',
        requiredEvidence: ['citations'],
      })
    );
  });

  test('CritiqueSchemaRegistry applies risk-class and artifact-type overlays', async () => {
    const schemaRegistry = new CritiqueSchemaRegistry({
      schemas: {
        release_review: {
          taxonomy: {
            grounding: {
              severity: 'high',
              verdict: 'reject',
              recommendedAction: 'branch_and_retry',
              requiredEvidence: ['citations'],
            },
          },
          riskClasses: {
            high: {
              taxonomy: {
                grounding: {
                  severity: 'critical',
                  recommendedAction: 'escalate',
                  requiredEvidence: ['incident_trace'],
                },
              },
            },
          },
          artifactTypes: {
            release_memo: {
              taxonomy: {
                grounding: {
                  requiredEvidence: ['operator_signoff'],
                },
              },
            },
          },
        },
      },
    });
    const protocol = new CritiqueProtocol({
      schemaRegistry,
      reviewers: [
        {
          id: 'overlay-reviewer',
          review: async () => ({
            criticId: 'overlay-reviewer',
            failureType: 'grounding',
            rationale: 'The release memo needs stronger evidence.',
          }),
        },
      ],
    });

    const review = await protocol.review(
      {
        id: 'candidate-overlay',
        taskFamily: 'release_review',
        riskClass: 'high',
        artifactType: 'release_memo',
      },
      {
        taskFamily: 'release_review',
        riskClass: 'high',
        artifactType: 'release_memo',
      }
    );

    expect(review.critiques[0]).toEqual(
      expect.objectContaining({
        severity: 'critical',
        recommendedAction: 'escalate',
      })
    );
    expect(review.critiques[0].metadata).toEqual(
      expect.objectContaining({
        taskFamily: 'release_review',
        riskClass: 'high',
        artifactType: 'release_memo',
        requiredEvidence: expect.arrayContaining(['citations', 'incident_trace', 'operator_signoff']),
      })
    );
  });

  test('CoordinationLoop executes a resolved action and records trust-weighted history', async () => {
    const trustRegistry = new TrustRegistry();
    const loop = new CoordinationLoop({
      trustRegistry,
      critiqueProtocol: new CritiqueProtocol({
        reviewers: [
          {
            id: 'critic-policy',
            review: async () => ({
              criticId: 'critic-policy',
              verdict: 'escalate',
              failureType: 'policy',
              severity: 'critical',
              confidence: 0.95,
              recommendedAction: 'escalate',
              rationale: 'Operator review is required.',
            }),
          },
        ],
      }),
      handlers: {
        escalate: async ({ candidate }) => ({
          ok: true,
          escalated: true,
          candidateId: candidate.id,
        }),
      },
    });

    const record = await loop.coordinate({ id: 'candidate-2' }, { domain: 'policy' });

    expect(record.resolution).toEqual(
      expect.objectContaining({
        action: 'escalate',
      })
    );
    expect(record.result).toEqual(
      expect.objectContaining({
        action: 'escalate',
        ok: true,
        output: expect.objectContaining({
          escalated: true,
          candidateId: 'candidate-2',
        }),
      })
    );
    expect(loop.listHistory()).toHaveLength(1);
    expect(trustRegistry.summarize()).toEqual(
      expect.objectContaining({
        totalRecords: 1,
      })
    );
  });

  test('DecompositionAdvisor recommends splitting or delegating based on task shape', () => {
    const capabilityRouter = new CapabilityRouter({
      candidates: [
        {
          id: 'writer-model',
          kind: 'model',
          capabilities: ['generateText'],
          profile: {
            taskTypes: ['writing'],
            trustZones: ['private'],
            certificationLevel: 'certified',
            reputationScore: 0.9,
          },
        },
        {
          id: 'analysis-sandbox',
          kind: 'simulator',
          capabilities: ['retrieval', 'simulation'],
          profile: {
            taskTypes: ['analysis'],
            trustZones: ['private'],
            supportsSimulation: true,
            certificationLevel: 'certified',
            reputationScore: 0.8,
          },
        },
      ],
    });
    const advisor = new DecompositionAdvisor({ capabilityRouter });

    const delegated = advisor.recommend(
      {
        id: 'task-1',
        task: 'Prepare a manager-ready incident summary',
        taskType: 'writing',
        complexity: 0.7,
        risk: 0.25,
        requiredCapabilities: ['generateText'],
      },
      {
        availableDelegates: [
          {
            id: 'writer',
            capabilities: ['generateText'],
            specializations: ['writing'],
            trustScore: 0.9,
          },
        ],
        routeCandidates: capabilityRouter.candidates,
      }
    );

    expect(delegated).toEqual(
      expect.objectContaining({
        action: 'delegate',
      })
    );
    expect(delegated.routeRecommendation.candidate).toEqual(expect.objectContaining({ id: 'writer-model' }));

    const split = advisor.recommend(
      {
        id: 'task-2',
        task: 'Investigate release health and prepare executive summary',
        taskType: 'analysis',
        complexity: 0.92,
        risk: 0.4,
        requiredCapabilities: ['generateText', 'retrieval'],
        suggestedSubtasks: [
          {
            task: 'Investigate release health',
            taskType: 'analysis',
            requiredCapabilities: ['retrieval'],
          },
          {
            task: 'Prepare executive summary',
            taskType: 'writing',
            requiredCapabilities: ['generateText'],
          },
        ],
      },
      {
        availableDelegates: [
          {
            id: 'researcher',
            capabilities: ['retrieval'],
            specializations: ['analysis'],
            trustScore: 0.88,
          },
          {
            id: 'writer',
            capabilities: ['generateText'],
            specializations: ['writing'],
            trustScore: 0.91,
          },
        ],
        routeCandidates: capabilityRouter.candidates,
      }
    );

    expect(split).toEqual(
      expect.objectContaining({
        action: 'split_and_delegate',
      })
    );
    expect(split.suggestedPlan).toHaveLength(2);
    expect(split.suggestedPlan[0].delegate).toEqual(expect.objectContaining({ id: 'researcher' }));
    expect(split.suggestedPlan[1].delegate).toEqual(expect.objectContaining({ id: 'writer' }));
    expect(split.suggestedPlan[0].routeRecommendation.candidate).toEqual(
      expect.objectContaining({ id: 'analysis-sandbox' })
    );
  });

  test('CoordinationBenchmarkSuite builds and runs maintained coordination scenarios', async () => {
    const schemaRegistry = new CritiqueSchemaRegistry({
      schemas: {
        release_review: {
          taxonomy: {
            policy: {
              severity: 'critical',
              verdict: 'escalate',
              recommendedAction: 'escalate',
            },
          },
        },
      },
    });
    const trustRegistry = new TrustRegistry();
    const critiqueProtocol = new CritiqueProtocol({
      schemaRegistry,
      reviewers: [
        {
          id: 'policy-reviewer',
          review: async () => ({
            criticId: 'policy-reviewer',
            failureType: 'policy',
            confidence: 0.94,
            rationale: 'Approval is required.',
          }),
        },
      ],
    });
    const disagreementResolver = new DisagreementResolver({ trustRegistry });
    const coordinationLoop = new CoordinationLoop({
      critiqueProtocol,
      trustRegistry,
      disagreementResolver,
      handlers: {
        escalate: async ({ candidate }) => ({ ok: true, escalated: true, candidateId: candidate.id }),
      },
    });
    const decompositionAdvisor = new DecompositionAdvisor();
    const suite = new CoordinationBenchmarkSuite({
      critiqueProtocol,
      disagreementResolver,
      coordinationLoop,
      decompositionAdvisor,
    });

    const report = await suite.run({
      candidate: { id: 'candidate-4', taskFamily: 'release_review' },
      reviewContext: { taskFamily: 'release_review' },
      expectedResolutionAction: 'escalate',
      decompositionTask: {
        id: 'task-3',
        task: 'Investigate release health and prepare executive summary',
        taskType: 'analysis',
        complexity: 0.91,
        risk: 0.41,
        requiredCapabilities: ['generateText', 'retrieval'],
        suggestedSubtasks: [
          {
            task: 'Investigate release health',
            taskType: 'analysis',
            requiredCapabilities: ['retrieval'],
          },
          {
            task: 'Prepare executive summary',
            taskType: 'writing',
            requiredCapabilities: ['generateText'],
          },
        ],
      },
      decompositionOptions: {
        availableDelegates: [
          {
            id: 'researcher',
            capabilities: ['retrieval'],
            specializations: ['analysis'],
            trustScore: 0.88,
          },
          {
            id: 'writer',
            capabilities: ['generateText'],
            specializations: ['writing'],
            trustScore: 0.91,
          },
        ],
      },
      expectedDecompositionAction: 'split_and_delegate',
    });

    expect(report.total).toBe(4);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'coordination-critique-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-resolution-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-loop-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-decomposition-benchmark', passed: true }),
      ])
    );
  });

  test('RoleAwareCoordinationPlanner assigns public coordination roles and emits a trace', () => {
    const trustRegistry = new TrustRegistry({
      records: [
        { actorId: 'planner-alpha', domain: 'release_review', success: true, confidence: 0.95 },
        { actorId: 'executor-beta', domain: 'release_review', success: true, confidence: 0.88 },
        { actorId: 'verifier-gamma', domain: 'release_review', success: true, confidence: 0.97 },
        { actorId: 'critic-delta', domain: 'release_review', success: true, confidence: 0.91 },
        { actorId: 'aggregator-epsilon', domain: 'release_review', success: true, confidence: 0.9 },
      ],
    });
    const capabilityRouter = new CapabilityRouter({
      candidates: [
        {
          id: 'verification-sandbox',
          kind: 'simulator',
          capabilities: ['verification', 'critique'],
          profile: {
            taskTypes: ['release_review'],
            trustZones: ['private'],
            supportsSimulation: true,
            certificationLevel: 'certified',
            reputationScore: 0.84,
          },
        },
      ],
    });
    const planner = new RoleAwareCoordinationPlanner({ trustRegistry, capabilityRouter });
    const task = {
      id: 'release-review-task',
      taskType: 'release_review',
      complexity: 0.88,
      risk: 0.82,
      suggestedSubtasks: [
        {
          task: 'Inspect release evidence',
          taskType: 'analysis',
          requiredCapabilities: ['retrieval'],
        },
        {
          task: 'Draft release recommendation',
          taskType: 'writing',
          requiredCapabilities: ['generateText'],
        },
      ],
    };
    const actors = [
      {
        id: 'planner-alpha',
        roles: ['planner'],
        capabilities: ['planning', 'retrieval'],
        specializations: ['analysis'],
        trustScore: 0.92,
      },
      {
        id: 'executor-beta',
        roles: ['executor'],
        capabilities: ['execution', 'generateText'],
        specializations: ['writing'],
        trustScore: 0.87,
      },
      {
        id: 'verifier-gamma',
        roles: ['verifier'],
        capabilities: ['verification', 'retrieval'],
        specializations: ['review'],
        trustScore: 0.95,
      },
      {
        id: 'critic-delta',
        roles: ['critic'],
        capabilities: ['critique', 'verification'],
        specializations: ['review'],
        trustScore: 0.9,
      },
      {
        id: 'aggregator-epsilon',
        roles: ['aggregator'],
        capabilities: ['synthesis', 'generateText'],
        specializations: ['synthesis'],
        trustScore: 0.89,
      },
    ];

    const plan = planner.plan(task, {
      actors,
      context: { domain: 'release_review', trustZone: 'private', routeCandidates: capabilityRouter.candidates },
    });

    expect(plan.strategy).toBe('role_routed_split_execution');
    expect(plan.roleContracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'planner' }),
        expect.objectContaining({ role: 'executor' }),
        expect.objectContaining({ role: 'verifier' }),
        expect.objectContaining({ role: 'critic' }),
        expect.objectContaining({ role: 'aggregator' }),
      ])
    );
    expect(plan.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'planner', actor: expect.objectContaining({ id: 'planner-alpha' }) }),
        expect.objectContaining({ role: 'executor', actor: expect.objectContaining({ id: 'executor-beta' }) }),
        expect.objectContaining({ role: 'verifier', actor: expect.objectContaining({ id: 'verifier-gamma' }) }),
        expect.objectContaining({ role: 'critic', actor: expect.objectContaining({ id: 'critic-delta' }) }),
        expect.objectContaining({ role: 'aggregator', actor: expect.objectContaining({ id: 'aggregator-epsilon' }) }),
      ])
    );
    expect(CoordinationRoleContract.fromJSON(plan.roleContracts[0])).toBeInstanceOf(CoordinationRoleContract);
    expect(plan.trace).toEqual(
      expect.objectContaining({
        traceType: 'role_aware_coordination',
        strategy: 'role_routed_split_execution',
      })
    );
    expect(CoordinationTrace.render(plan.trace)).toContain('planner: planner-alpha');
    expect(plan.routeRecommendations.execution.candidate).toEqual(
      expect.objectContaining({ id: 'executor-beta' })
    );
    expect(plan.routeRecommendations.verification.candidate).toEqual(
      expect.objectContaining({ id: 'verification-sandbox' })
    );
  });

  test('VerificationStrategySelector chooses adversarial verification for high-risk disagreement-prone tasks', () => {
    const trustRegistry = new TrustRegistry({
      records: [
        {
          actorId: 'verifier-release',
          domain: 'release_review',
          taskFamily: 'release_review',
          role: 'verifier',
          success: true,
          confidence: 0.58,
        },
      ],
    });
    const capabilityRouter = new CapabilityRouter({
      candidates: [
        {
          id: 'adversarial-sandbox',
          kind: 'simulator',
          capabilities: ['verification', 'critique'],
          profile: {
            taskTypes: ['release_review'],
            trustZones: ['private'],
            supportsSimulation: true,
            certificationLevel: 'certified',
            reputationScore: 0.83,
          },
        },
      ],
    });
    const selector = new VerificationStrategySelector({ trustRegistry, capabilityRouter });

    const selection = selector.select(
      {
        id: 'task-verification-1',
        taskFamily: 'release_review',
        risk: 0.86,
      },
      {
        domain: 'release_review',
        taskFamily: 'release_review',
        history: {
          disagreementRate: 0.42,
          evidenceConflicts: 1,
        },
        verifierActorIds: ['verifier-release'],
        trustZone: 'private',
        verificationCandidates: capabilityRouter.candidates,
      }
    );

    expect(selection).toEqual(
      expect.objectContaining({
        strategy: 'adversarial_cross_check',
        phases: [
          expect.objectContaining({ role: 'verifier' }),
          expect.objectContaining({ role: 'critic' }),
          expect.objectContaining({ role: 'aggregator' }),
        ],
        routeRecommendation: expect.objectContaining({
          candidate: expect.objectContaining({ id: 'adversarial-sandbox' }),
        }),
      })
    );
  });

  test('MultiPassVerificationEngine runs verifier, critic, and aggregator phases for high-risk coordination', async () => {
    const selector = new VerificationStrategySelector({
      trustRegistry: new TrustRegistry({
        records: [
          {
            actorId: 'verifier-release',
            domain: 'release_review',
            taskFamily: 'release_review',
            role: 'verifier',
            success: true,
            confidence: 0.93,
          },
        ],
      }),
    });
    const engine = new MultiPassVerificationEngine({
      selector,
      reviewers: [
        {
          id: 'verifier-release',
          role: 'verifier',
          review: async () => ({
            verdict: 'accept',
            confidence: 0.84,
            rationale: 'Primary verification passed.',
          }),
        },
        {
          id: 'critic-adversary',
          role: 'critic',
          review: async () => ({
            verdict: 'reject',
            confidence: 0.87,
            rationale: 'Adversarial review found grounding conflicts.',
          }),
        },
        {
          id: 'aggregator-final',
          role: 'aggregator',
          review: async () => ({
            verdict: 'escalate',
            confidence: 0.9,
            rationale: 'Conflicting verification phases require escalation.',
          }),
        },
      ],
    });

    const result = await engine.verify(
      { id: 'candidate-verification-1' },
      {
        task: {
          id: 'release-review-verification',
          taskFamily: 'release_review',
          risk: 0.86,
        },
        context: {
          domain: 'release_review',
          taskFamily: 'release_review',
          history: {
            disagreementRate: 0.42,
            evidenceConflicts: 1,
          },
          verifierActorIds: ['verifier-release'],
        },
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        strategy: 'adversarial_cross_check',
        action: 'escalate',
        summary: expect.objectContaining({
          phasesRun: 3,
          disagreement: true,
          action: 'escalate',
        }),
      })
    );
    expect(result.verificationTrace).toEqual(
      expect.objectContaining({
        traceType: 'coordination_verification',
        strategy: 'adversarial_cross_check',
      })
    );
  });

  test('CoordinationQualityTracker separates verifier quality from executor quality', () => {
    const tracker = new CoordinationQualityTracker();

    tracker.record({
      actorId: 'executor-beta',
      role: 'executor',
      domain: 'release_review',
      taskFamily: 'release_review',
      success: true,
      confidence: 0.81,
    });
    tracker.record({
      actorId: 'executor-beta',
      role: 'executor',
      domain: 'release_review',
      taskFamily: 'release_review',
      success: false,
      confidence: 0.42,
      retries: 2,
    });
    tracker.record({
      actorId: 'verifier-gamma',
      role: 'verifier',
      domain: 'release_review',
      taskFamily: 'release_review',
      success: true,
      confidence: 0.94,
    });
    tracker.record({
      actorId: 'verifier-gamma',
      role: 'verifier',
      domain: 'release_review',
      taskFamily: 'release_review',
      success: true,
      confidence: 0.91,
      recoverySucceeded: true,
    });

    const verifierScore = tracker.getQualityScore('verifier-gamma', {
      qualityType: 'verification',
    });
    const executorScore = tracker.getQualityScore('executor-beta', {
      qualityType: 'execution',
    });

    expect(verifierScore).toBeGreaterThan(executorScore);
    expect(tracker.summarize()).toEqual(
      expect.objectContaining({
        verifierQuality: [expect.objectContaining({ actorId: 'verifier-gamma' })],
        executorQuality: [expect.objectContaining({ actorId: 'executor-beta' })],
      })
    );
    expect(tracker.getProfile('verifier-gamma')).toEqual(
      expect.objectContaining({
        actorId: 'verifier-gamma',
        quality: [expect.objectContaining({ qualityType: 'verification' })],
      })
    );
  });

  test('CoordinationBenchmarkSuite supports deeper disagreement, recovery, role-routing, and failure scenarios', async () => {
    const trustRegistry = new TrustRegistry({
      records: [
        { actorId: 'policy-reviewer', domain: 'policy', taskFamily: 'release_review', role: 'critic', success: true, confidence: 0.96 },
      ],
    });
    const critiqueProtocol = new CritiqueProtocol({
      schemaRegistry: new CritiqueSchemaRegistry({
        schemas: {
          release_review: {
            taxonomy: {
              policy: {
                severity: 'critical',
                verdict: 'escalate',
                recommendedAction: 'escalate',
              },
            },
          },
        },
      }),
      reviewers: [
        {
          id: 'policy-reviewer',
          review: async () => ({
            criticId: 'policy-reviewer',
            failureType: 'policy',
            confidence: 0.94,
            rationale: 'Approval is required.',
          }),
        },
      ],
    });
    const disagreementResolver = new DisagreementResolver({ trustRegistry });
    const coordinationLoop = new CoordinationLoop({
      critiqueProtocol,
      trustRegistry,
      disagreementResolver,
      handlers: {
        escalate: async ({ candidate }) => ({ ok: true, escalated: true, candidateId: candidate.id }),
      },
    });
    const suite = new CoordinationBenchmarkSuite({
      critiqueProtocol,
      disagreementResolver,
      coordinationLoop,
      decompositionAdvisor: new DecompositionAdvisor(),
      roleAwareCoordinationPlanner: new RoleAwareCoordinationPlanner({ trustRegistry }),
    });

    const report = await suite.run({
      candidate: { id: 'candidate-benchmark-1', taskFamily: 'release_review' },
      reviewContext: { taskFamily: 'release_review', domain: 'policy' },
      expectedResolutionAction: 'escalate',
      disagreementCritiques: [
        {
          criticId: 'policy-reviewer',
          verdict: 'escalate',
          failureType: 'policy',
          severity: 'critical',
          confidence: 0.94,
          recommendedAction: 'escalate',
        },
        {
          criticId: 'style-reviewer',
          verdict: 'revise',
          failureType: 'format',
          severity: 'low',
          confidence: 0.42,
          recommendedAction: 'revise',
        },
      ],
      expectedDisagreementAction: 'escalate',
      recoveryCandidate: { id: 'candidate-recovery-1', taskFamily: 'release_review' },
      recoveryContext: { taskFamily: 'release_review', domain: 'policy' },
      expectedRecoveryAction: 'escalate',
      roleTask: {
        id: 'role-task-1',
        taskType: 'release_review',
        complexity: 0.88,
        risk: 0.82,
        suggestedSubtasks: [
          { task: 'Inspect release evidence', taskType: 'analysis', requiredCapabilities: ['retrieval'] },
          { task: 'Draft release recommendation', taskType: 'writing', requiredCapabilities: ['generateText'] },
        ],
      },
      roleActors: [
        { id: 'planner-alpha', roles: ['planner'], capabilities: ['planning', 'retrieval'], specializations: ['analysis'], trustScore: 0.92 },
        { id: 'executor-beta', roles: ['executor'], capabilities: ['execution', 'generateText'], specializations: ['writing'], trustScore: 0.87 },
        { id: 'verifier-gamma', roles: ['verifier'], capabilities: ['verification', 'retrieval'], specializations: ['review'], trustScore: 0.95 },
        { id: 'critic-delta', roles: ['critic'], capabilities: ['critique', 'verification'], specializations: ['review'], trustScore: 0.9 },
        { id: 'aggregator-epsilon', roles: ['aggregator'], capabilities: ['synthesis', 'generateText'], specializations: ['synthesis'], trustScore: 0.89 },
      ],
      roleContext: { domain: 'release_review' },
      expectedRoleStrategy: 'role_routed_split_execution',
      failureDecompositionTask: {
        id: 'failure-task-1',
        task: 'Execute risky production change without a verifier',
        taskType: 'operations',
        complexity: 0.93,
        risk: 0.95,
        requiredCapabilities: ['shell'],
      },
      failureDecompositionOptions: { availableDelegates: [] },
      expectedFailureDecompositionAction: 'escalate',
      trustSensitiveCritiques: [
        {
          criticId: 'policy-reviewer',
          verdict: 'escalate',
          failureType: 'policy',
          severity: 'critical',
          confidence: 0.94,
          recommendedAction: 'escalate',
          metadata: { role: 'critic', taskFamily: 'release_review' },
        },
        {
          criticId: 'style-reviewer',
          verdict: 'accept',
          failureType: 'general',
          severity: 'low',
          confidence: 0.35,
          recommendedAction: 'accept',
          metadata: { role: 'critic', taskFamily: 'release_review' },
        },
      ],
      expectedTrustAction: 'escalate',
    });

    expect(report.total).toBe(8);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'coordination-disagreement-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-recovery-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-role-routing-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-failure-decomposition-benchmark', passed: true }),
        expect.objectContaining({ id: 'coordination-trust-assumption-benchmark', passed: true }),
      ])
    );
  });

  test('CoordinationDiagnostics builds operator-facing summaries', () => {
    const diagnostics = new CoordinationDiagnostics();
    const qualityTracker = new CoordinationQualityTracker();
    qualityTracker.record({
      actorId: 'verifier-gamma',
      role: 'verifier',
      domain: 'release_review',
      taskFamily: 'release_review',
      success: false,
      confidence: 0.58,
    });

    const report = diagnostics.summarize({
      review: {
        summary: {
          total: 2,
          disagreement: true,
        },
      },
      resolution: {
        action: 'escalate',
        disagreement: true,
      },
      plan: {
        strategy: 'escalate_missing_roles',
        gaps: ['aggregator'],
      },
      verification: {
        action: 'escalate',
        summary: {
          disagreement: true,
          action: 'escalate',
        },
      },
      quality: qualityTracker.summarize(),
    });

    expect(report).toEqual(
      expect.objectContaining({
        flags: expect.arrayContaining([
          'reviewer_disagreement',
          'operator_escalation',
          'missing_roles',
          'verification_escalation',
          'verification_disagreement',
          'low_verifier_quality',
        ]),
        recommendations: expect.arrayContaining([
          expect.stringContaining('automatic execution'),
          expect.stringContaining('missing planner/executor/verifier/critic/aggregator roles'),
        ]),
        summary: expect.objectContaining({
          disagreement: true,
          resolutionAction: 'escalate',
          roleStrategy: 'escalate_missing_roles',
        }),
      })
    );
  });

  test('Run tracks state and serializes cleanly', () => {
    const run = new Run({ input: 'hello' });
    run.setStatus('running');
    run.addMessage({ role: 'user', content: 'hello' });
    run.addStep({ id: 'step-1', type: 'model', status: 'completed' });
    run.addCheckpoint({ id: 'cp-1', label: 'checkpoint' });
    run.addEvent({ type: 'run_started' });
    run.pendingPause = { reason: 'pause' };
    run.recordUsage({ prompt: 10, completion: 5, total: 15 });
    run.recordCost(0.12);
    run.recordTiming('modelMs', 42);
    run.setStatus('completed');

    const restored = Run.fromJSON(run.toJSON());
    expect(restored.id).toBe(run.id);
    expect(restored.status).toBe('completed');
    expect(restored.messages).toHaveLength(1);
    expect(restored.steps).toHaveLength(1);
    expect(restored.checkpoints).toHaveLength(1);
    expect(restored.events).toHaveLength(1);
    expect(restored.pendingPause).toEqual({ reason: 'pause' });
    expect(restored.metrics.tokenUsage.total).toBe(15);
    expect(restored.metrics.cost).toBe(0.12);
    expect(pkg.RunInspector.summarize(restored).lineage).toEqual(
      expect.objectContaining({
        rootRunId: run.id,
        childRunIds: [],
      })
    );
  });

  test('Run aggregates child-run metrics once', () => {
    const parent = new Run({ input: 'parent' });
    const child = new Run({ input: 'child' });
    child.recordUsage({ prompt: 3, completion: 2, total: 5 });
    child.recordCost(0.25);
    child.recordTiming('modelMs', 42);

    parent.aggregateChildRun(child, { scope: 'unit' });
    parent.aggregateChildRun(child, { scope: 'unit' });

    expect(parent.metrics.childRuns.count).toBe(1);
    expect(parent.metrics.tokenUsage.total).toBe(5);
    expect(parent.metrics.cost).toBe(0.25);
    expect(parent.metrics.timings.modelMs).toBe(42);
  });

  test('DistributedRunEnvelope creates and validates distributed handoff payloads', () => {
    const run = new Run({ id: 'run-123', input: 'handoff me' });
    const envelope = DistributedRunEnvelope.create(run, {
      runtimeKind: 'agent',
      action: 'branch',
      checkpointId: 'run-123:checkpoint:2',
      metadata: { region: 'eu-west-1' },
    });

    expect(DistributedRunEnvelope.validate(envelope)).toEqual({
      valid: true,
      errors: [],
    });
    expect(DistributedRunEnvelope.parse(envelope)).toEqual(envelope);
    expect(envelope).toEqual(
      expect.objectContaining({
        format: 'agnostic-agents-distributed-run-envelope',
        runtimeKind: 'agent',
        action: 'branch',
        runId: 'run-123',
        checkpointId: 'run-123:checkpoint:2',
        metadata: expect.objectContaining({
          region: 'eu-west-1',
          sourceRunId: 'run-123',
        }),
      })
    );
  });

  test('TraceCorrelation derives correlation ids from runs and envelopes', () => {
    const run = new Run({
      id: 'child-run',
      metadata: {
        lineage: {
          rootRunId: 'root-run',
          parentRunId: 'parent-run',
          branchOriginRunId: null,
          branchCheckpointId: null,
        },
      },
    });
    const envelope = DistributedRunEnvelope.create(run, {
      runtimeKind: 'agent',
      action: 'replay',
      checkpointId: 'child-run:checkpoint:2',
    });

    expect(TraceCorrelation.fromRun(run)).toEqual(
      expect.objectContaining({
        traceId: 'root-run',
        spanId: 'child-run',
        parentSpanId: 'parent-run',
      })
    );
    expect(TraceCorrelation.fromEnvelope(envelope)).toEqual(
      expect.objectContaining({
        traceId: 'root-run',
        spanId: 'child-run',
        checkpointId: 'child-run:checkpoint:2',
        runtimeKind: 'agent',
        action: 'replay',
      })
    );
    expect(
      TraceCorrelation.annotateMetadata(
        { queue: 'worker-a' },
        { traceId: 'root-run', spanId: 'child-run' }
      )
    ).toEqual({
      queue: 'worker-a',
      correlation: {
        traceId: 'root-run',
        spanId: 'child-run',
      },
    });
  });

  test('RunInspector summarizes aggregated child-run metrics', () => {
    const parent = new Run({ input: 'parent' });
    const childA = new Run({ input: 'a' });
    const childB = new Run({ input: 'b' });
    childA.recordUsage({ prompt: 3, completion: 2, total: 5 });
    childA.recordCost(0.1);
    childA.recordTiming('modelMs', 10);
    childB.recordUsage({ prompt: 4, completion: 1, total: 5 });
    childB.recordCost(0.2);
    childB.recordTiming('modelMs', 20);

    parent.aggregateChildRun(childA);
    parent.aggregateChildRun(childB);

    expect(pkg.RunInspector.summarize(parent).childRunAggregate).toEqual(
      expect.objectContaining({
        count: 2,
        tokenUsage: { prompt: 7, completion: 3, total: 10 },
        cost: 0.30000000000000004,
        timings: expect.objectContaining({ modelMs: 30 }),
      })
    );
  });

  test('ExecutionIdentity normalizes and annotates metadata', () => {
    expect(
      ExecutionIdentity.normalize({
        actorId: 'operator-1',
        serviceId: 'api-service',
        tenantId: 'tenant-1',
        scopes: ['runs:write', 'runs:write', 'approvals:resolve'],
      })
    ).toEqual({
      actorId: 'operator-1',
      serviceId: 'api-service',
      tenantId: 'tenant-1',
      sessionId: null,
      scopes: ['runs:write', 'approvals:resolve'],
    });
    expect(
      ExecutionIdentity.annotateMetadata(
        { queue: 'runtime-job-queue' },
        { actorId: 'operator-1', serviceId: 'api-service' }
      )
    ).toEqual({
      queue: 'runtime-job-queue',
      executionIdentity: {
        actorId: 'operator-1',
        serviceId: 'api-service',
        tenantId: null,
        sessionId: null,
        scopes: [],
      },
    });
  });

  test('Run can branch from a checkpoint snapshot', () => {
    const run = new Run({ input: 'branch-me' });
    run.setStatus('running');
    run.addMessage({ role: 'user', content: 'branch-me' });
    run.addCheckpoint({
      id: 'cp-1',
      label: 'before_tool',
      snapshot: run.createCheckpointSnapshot(),
      status: run.status,
    });
    run.setStatus('completed');

    const branch = run.branchFromCheckpoint('cp-1');
    expect(branch.id).not.toBe(run.id);
    expect(branch.status).toBe('paused');
    expect(branch.messages).toEqual(run.messages);
    expect(branch.metadata.lineage).toEqual(
      expect.objectContaining({
        rootRunId: run.id,
        branchOriginRunId: run.id,
        branchCheckpointId: 'cp-1',
      })
    );
  });

  test('TraceSerializer exports and imports stable run traces', () => {
    const run = new Run({ input: 'trace-me' });
    run.setStatus('completed');
    run.output = 'done';

    const trace = TraceSerializer.exportRun(run, { label: 'unit-test' });
    expect(trace).toEqual(
      expect.objectContaining({
        schemaVersion: '1.1',
        format: 'agnostic-agents-run-trace',
        traceType: 'run',
        metadata: { label: 'unit-test' },
      })
    );
    expect(TraceSerializer.validateTrace(trace)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });

    const imported = TraceSerializer.importRun(trace);
    expect(imported).toBeInstanceOf(Run);
    expect(imported.id).toBe(run.id);
    expect(imported.output).toBe('done');
  });

  test('TraceSerializer can export a partial run from a checkpoint', () => {
    const run = new Run({ input: 'partial-trace' });
    run.setStatus('running');
    run.addMessage({ role: 'user', content: 'hello' });
    run.addCheckpoint({
      id: 'cp-1',
      label: 'snapshot',
      snapshot: run.createCheckpointSnapshot(),
      status: run.status,
    });

    const trace = TraceSerializer.exportPartialRun(run, { checkpointId: 'cp-1' });
    expect(trace.metadata).toEqual(
      expect.objectContaining({
        mode: 'partial',
        sourceRunId: run.id,
        checkpointId: 'cp-1',
      })
    );
    expect(trace.traceType).toBe('partial');
    expect(trace.run.metadata.lineage).toEqual(
      expect.objectContaining({
        branchOriginRunId: run.id,
        branchCheckpointId: 'cp-1',
      })
    );
  });

  test('TraceSerializer exports and imports portable trace bundles', () => {
    const first = new Run({ input: 'first' });
    first.setStatus('completed');
    const second = new Run({ input: 'second' });
    second.setStatus('failed');

    const bundle = TraceSerializer.exportBundle([first, second], { source: 'external-tool' });
    expect(bundle).toEqual(
      expect.objectContaining({
        schemaVersion: '1.1',
        format: 'agnostic-agents-trace-bundle',
        traceType: 'bundle',
        metadata: { source: 'external-tool' },
        index: [
          expect.objectContaining({ runId: first.id, status: 'completed' }),
          expect.objectContaining({ runId: second.id, status: 'failed' }),
        ],
      })
    );
    expect(TraceSerializer.validateTrace(bundle, { allowBundle: true })).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });

    const imported = TraceSerializer.importBundle(bundle);
    expect(imported).toHaveLength(2);
    expect(imported[0]).toBeInstanceOf(Run);
    expect(imported[0].id).toBe(first.id);
    expect(imported[1].id).toBe(second.id);
  });

  test('TraceSerializer describes and validates its portable schema', () => {
    expect(TraceSerializer.describeSchema()).toEqual(
      expect.objectContaining({
        schemaVersion: '1.1',
        runFormat: 'agnostic-agents-run-trace',
        bundleFormat: 'agnostic-agents-trace-bundle',
      })
    );

    expect(TraceSerializer.validateTrace({ format: 'bad' })).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining(['schemaVersion is required.', 'Unsupported trace format.']),
      })
    );
  });

  test('TraceDiffer reports divergence between runs', () => {
    const left = new Run({ input: 'left' });
    left.setStatus('completed');
    left.output = 'left-output';
    left.addEvent({ type: 'run_started' });
    left.addEvent({ type: 'run_completed' });

    const right = new Run({ input: 'right' });
    right.setStatus('failed');
    right.output = 'right-output';
    right.addEvent({ type: 'run_started' });
    right.addEvent({ type: 'run_failed' });
    right.addStep({ id: 'step-1', type: 'model', status: 'failed' });

    expect(TraceDiffer.diff(left, right)).toEqual(
      expect.objectContaining({
        statusChanged: true,
        outputChanged: true,
        eventTypesAdded: ['run_failed'],
        eventTypesRemoved: ['run_completed'],
        firstDivergingEventIndex: 1,
      })
    );
  });

  test('EvidenceGraph collects nodes and edges', () => {
    const graph = new EvidenceGraph();
    graph.addNode({ id: 'q1', type: 'query', label: 'What happened?' });
    graph.addNode({ id: 'r1', type: 'retrieval', label: 'Source text' });
    graph.addEdge({ from: 'q1', to: 'r1', type: 'supports' });

    expect(graph.summarize()).toEqual({
      nodes: 2,
      edges: 1,
      conflicts: 0,
      nodeTypes: ['query', 'retrieval'],
    });
  });

  test('EvidenceGraph detects simple negation conflicts', () => {
    const graph = new EvidenceGraph();
    graph.addNode({ id: 'a', type: 'claim', label: 'The deployment is ready.' });
    graph.addNode({ id: 'b', type: 'claim', label: 'The deployment is not ready.' });

    expect(graph.detectConflicts()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          left: 'a',
          right: 'b',
          type: 'negation_conflict',
        }),
        expect.objectContaining({
          left: 'a',
          right: 'b',
          type: 'subject_predicate_conflict',
        }),
      ])
    );
  });

  test('EvalHarness runs scenarios and reports pass/fail totals', async () => {
    const learningLoop = new LearningLoop();
    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'ok',
          run: async () => 'hello',
          assert: result => result === 'hello',
        },
        {
          id: 'fail',
          run: async () => 'bad',
          assert: result => result === 'hello',
        },
      ],
    });

    await expect(harness.run({ learningLoop })).resolves.toEqual(
      expect.objectContaining({
        total: 2,
        passed: 1,
        failed: 1,
      })
    );
    expect(learningLoop.summarize()).toEqual(
      expect.objectContaining({
        evaluations: 1,
        failedEvaluations: 1,
      })
    );
  });

  test('InvariantRegistry and AssuranceSuite produce explicit assurance verdicts', async () => {
    const registry = new InvariantRegistry();
    registry.register({
      id: 'policy-scope-stable',
      surface: 'policy',
      description: 'Policy scope must stay explicit.',
      check: async context => ({
        passed: context.policyScopeExplicit === true,
        reason: context.policyScopeExplicit === true ? null : 'Policy scope was not explicit.',
      }),
    });
    registry.register({
      id: 'learning-bounded',
      surface: 'learning',
      severity: 'critical',
      description: 'Learning changes must stay bounded.',
      check: async context => context.learningBounded === true,
    });

    const suite = new AssuranceSuite({
      invariants: registry,
      scenarios: [
        {
          id: 'assurance-scenario-pass',
          run: async () => ({ ok: true }),
          assert: async output => output.ok === true,
        },
      ],
    });

    const report = await suite.run({
      policyScopeExplicit: true,
      learningBounded: false,
    });

    expect(report).toBeInstanceOf(AssuranceReport);
    expect(report.summarize()).toEqual(
      expect.objectContaining({
        failedInvariants: 1,
        failedScenarios: 0,
        verdict: 'block',
      })
    );
    expect(report.explain()).toEqual(
      expect.objectContaining({
        operatorSummary: expect.stringContaining('block rollout'),
        violations: expect.arrayContaining([
          expect.objectContaining({
            type: 'invariant',
            id: 'learning-bounded',
          }),
        ]),
      })
    );
    expect(new AssuranceGuardrail().evaluate(report)).toEqual(
      expect.objectContaining({
        action: 'block_rollout',
      })
    );
    expect(new AssuranceRecoveryPlanner().plan(report)).toEqual(
      expect.objectContaining({
        action: 'rollback_or_quarantine',
        affectedSurfaces: expect.arrayContaining(['learning']),
      })
    );
  });

  test('run stores persist and reload runs', async () => {
    const run = new Run({ input: 'persist me' });
    run.setStatus('completed');

    const memoryStore = new InMemoryRunStore();
    await memoryStore.saveRun(run);
    await expect(memoryStore.getRun(run.id)).resolves.toMatchObject({ id: run.id });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-store-'));
    const fileStore = new FileRunStore({ directory: tmpDir });
    await fileStore.saveRun(run);
    await expect(fileStore.getRun(run.id)).resolves.toMatchObject({ id: run.id });
    await expect(fileStore.listRuns()).resolves.toEqual([
      expect.objectContaining({ id: run.id }),
    ]);
    expect(memoryStore).toBeInstanceOf(BaseRunStore);
    expect(fileStore).toBeInstanceOf(BaseRunStore);
  });

  test('job and layer stores implement stable backend interfaces', async () => {
    const jobStore = new InMemoryJobStore();
    const layerStore = new InMemoryLayerStore();

    await jobStore.saveJob({ id: 'job-1', handler: 'ping' });
    await layerStore.set('key', { value: 'v' });

    expect(jobStore).toBeInstanceOf(BaseJobStore);
    expect(layerStore).toBeInstanceOf(BaseLayerStore);
    await expect(jobStore.getJob('job-1')).resolves.toEqual(expect.objectContaining({ id: 'job-1' }));
    await expect(layerStore.get('key')).resolves.toEqual({ value: 'v' });
  });

  test('StorageBackendRegistry registers and returns validated backends', () => {
    const runStore = new InMemoryRunStore();
    const jobStore = new InMemoryJobStore();
    const layerStore = new InMemoryLayerStore();
    const registry = new StorageBackendRegistry();

    registry.registerRunStore('memory', runStore);
    registry.registerJobStore('jobs', jobStore);
    registry.registerLayerStore('layer', layerStore);

    expect(registry.getRunStore('memory')).toBe(runStore);
    expect(registry.getJobStore('jobs')).toBe(jobStore);
    expect(registry.getLayerStore('layer')).toBe(layerStore);
    expect(registry.list()).toEqual({
      runStores: ['memory'],
      jobStores: ['jobs'],
      layerStores: ['layer'],
    });
  });

  test('storage-backed runtime components fail fast on invalid backends', () => {
    expect(() => new BackgroundJobScheduler({ store: {} })).toThrow('BackgroundJobScheduler store must implement saveJob().');
    expect(() => new IncidentDebugger({ runStore: {} })).toThrow('IncidentDebugger runStore must implement saveRun().');
    expect(() => new Memory({ stores: { working: {} } })).toThrow('Memory working store must implement get().');
  });

  test('RunTreeInspector builds and renders a parent-child run tree', async () => {
    const store = new InMemoryRunStore();
    const parent = new Run({ input: 'parent', metadata: { lineage: { rootRunId: 'root-1' } } });
    const child = new Run({
      input: 'child',
      metadata: { lineage: { rootRunId: parent.id, parentRunId: parent.id } },
    });
    const grandchild = new Run({
      input: 'grandchild',
      metadata: { lineage: { rootRunId: parent.id, parentRunId: child.id } },
    });

    await store.saveRun(parent);
    await store.saveRun(child);
    await store.saveRun(grandchild);

    const tree = await RunTreeInspector.build(store, { rootRunId: parent.id });
    expect(tree.id).toBe(parent.id);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.subtreeMetrics).toEqual(
      expect.objectContaining({
        runCount: 3,
      })
    );

    const rendered = RunTreeInspector.render(tree);
    expect(rendered).toContain(parent.id);
    expect(rendered).toContain(child.id);
    expect(rendered).toContain(grandchild.id);
  });

  test('RunTreeInspector works with FileRunStore-backed runs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-tree-'));
    const store = new FileRunStore({ directory: tmpDir });
    const root = new Run({ input: 'root' });
    const child = new Run({
      input: 'child',
      metadata: { lineage: { rootRunId: root.id, parentRunId: root.id } },
    });

    await store.saveRun(root);
    await store.saveRun(child);

    const roots = await RunTreeInspector.build(store);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe(root.id);
    expect(roots[0].children[0].id).toBe(child.id);
  });

  test('IncidentDebugger builds an incident report with lineage and diff context', async () => {
    const store = new InMemoryRunStore();
    const root = new Run({ input: 'root' });
    root.setStatus('completed');

    const failed = new Run({
      input: 'child',
      metadata: { lineage: { rootRunId: root.id, parentRunId: root.id } },
    });
    failed.addStep({
      id: 'step-1',
      type: 'model',
      status: 'failed',
      output: null,
    });
    failed.addError({ name: 'Error', message: 'boom' });
    failed.addCheckpoint({
      id: 'cp-1',
      label: 'before_failure',
      status: 'failed',
      snapshot: failed.createCheckpointSnapshot(),
    });
    failed.setStatus('failed');

    await store.saveRun(root);
    await store.saveRun(failed);

    const debuggerInstance = new IncidentDebugger({ runStore: store });
    const report = await debuggerInstance.createReport(failed.id, { compareToRunId: root.id });

    expect(report).toEqual(
      expect.objectContaining({
        runId: failed.id,
        rootRunId: root.id,
        status: 'failed',
        aggregatedMetrics: expect.objectContaining({
          runCount: 2,
        }),
        failure: expect.objectContaining({ message: 'boom' }),
        failedSteps: [expect.objectContaining({ id: 'step-1' })],
        comparison: expect.objectContaining({
          leftRunId: root.id,
          rightRunId: failed.id,
          statusChanged: true,
        }),
      })
    );
    expect(report.renderedRunTree).toContain(root.id);
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Inspect the last error'),
        expect.stringContaining('partial replay or branching'),
      ])
    );
  });

  test('BranchQualityAnalyzer ranks replay and branch outcomes by observed quality', async () => {
    const baseline = new Run({
      input: 'baseline',
      output: null,
      status: 'failed',
      errors: [{ name: 'Error', message: 'tool failure' }],
      state: {
        assessment: {
          confidence: 0.35,
          evidenceConflicts: 1,
          verification: { action: 'require_approval' },
        },
      },
    });
    baseline.addStep({ id: 'step-1', type: 'tool', status: 'failed' });

    const improved = new Run({
      input: 'improved',
      output: 'ok',
      status: 'completed',
      state: {
        assessment: {
          confidence: 0.92,
          evidenceConflicts: 0,
          verification: { action: 'allow' },
        },
      },
      metadata: {
        lineage: {
          rootRunId: baseline.id,
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: baseline.id,
          branchCheckpointId: 'cp-1',
        },
      },
    });
    improved.addStep({ id: 'step-1', type: 'tool', status: 'completed', output: 'ok' });

    const analyzer = new BranchQualityAnalyzer();
    const report = analyzer.compare(baseline, [improved]);

    expect(report.bestRunId).toBe(improved.id);
    expect(report.rankedRuns[0]).toEqual(
      expect.objectContaining({
        runId: improved.id,
        status: 'completed',
      })
    );
    expect(report.comparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runId: improved.id,
          diff: expect.objectContaining({
            statusChanged: true,
            firstDivergingStepIndex: 0,
          }),
        }),
      ])
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`Prefer run "${improved.id}" over baseline`),
      ])
    );
  });

  test('BranchQualityAnalyzer can analyze a stored root family', async () => {
    const runStore = new InMemoryRunStore();
    const root = new Run({ input: 'root', output: null, status: 'failed' });
    await runStore.saveRun(root);

    const replay = new Run({
      input: 'replay',
      output: 'stable',
      status: 'completed',
      state: {
        assessment: {
          confidence: 0.88,
          evidenceConflicts: 0,
          verification: { action: 'allow' },
        },
      },
      metadata: {
        lineage: {
          rootRunId: root.id,
          parentRunId: null,
          childRunIds: [],
          branchOriginRunId: root.id,
          branchCheckpointId: 'root:checkpoint:1',
        },
      },
    });
    await runStore.saveRun(replay);

    const analyzer = new BranchQualityAnalyzer({ runStore });
    const report = await analyzer.analyzeFamily(root.id);

    expect(report.bestRunId).toBe(replay.id);
    expect(report.baselineRunId).toBe(root.id);
  });

  test('DistributedRecoveryPlanner builds a structured recovery plan from incident state', async () => {
    const store = new InMemoryRunStore();
    const root = new Run({ input: 'root' });
    root.setStatus('completed');

    const failed = new Run({
      input: 'child',
      metadata: { lineage: { rootRunId: root.id, parentRunId: root.id } },
    });
    failed.addStep({
      id: 'step-1',
      type: 'tool',
      status: 'failed',
      output: null,
    });
    failed.addError({ name: 'Error', message: 'queue timeout' });
    failed.addCheckpoint({
      id: 'cp-1',
      label: 'before_failure',
      status: 'failed',
      snapshot: failed.createCheckpointSnapshot(),
    });
    failed.setStatus('failed');

    await store.saveRun(root);
    await store.saveRun(failed);

    const planner = new DistributedRecoveryPlanner({ runStore: store });
    const plan = await planner.createPlan(failed.id, { compareToRunId: root.id });

    expect(plan).toEqual(
      expect.objectContaining({
        runId: failed.id,
        status: 'failed',
        recommendedAction: 'branch_from_failure_checkpoint',
        incidentType: 'queue_worker_failure',
        recoveryPolicy: expect.objectContaining({
          requiresApprovalForBranch: true,
          prefersCompareFirst: true,
        }),
        correlation: {
          traceId: root.id,
          spanId: failed.id,
          parentSpanId: root.id,
        },
      })
    );
    expect(plan.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'branch_from_failure_checkpoint',
          payload: expect.objectContaining({
            failedStepId: 'step-1',
            checkpointId: 'cp-1',
          }),
        }),
        expect.objectContaining({
          action: 'compare_to_known_good',
        }),
      ])
    );
  });

  test('DistributedRecoveryRunner executes a recovery plan against an agent runtime', async () => {
    const runStore = new InMemoryRunStore();
    const adapter = {
      getCapabilities: () => ({ generateText: true, toolCalling: false }),
      generateText: async messages => ({
        message: `recovered:${messages[messages.length - 1].content}`,
      }),
    };
    const agent = new pkg.Agent(adapter, { runStore });

    const sourceRun = await agent.run('recover this distributed run');
    const checkpointId = sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id;
    const replayRun = await agent.replayRun(sourceRun.id, { checkpointId });
    replayRun.setStatus('failed');
    replayRun.addStep({
      id: `${replayRun.id}:step:failed`,
      type: 'tool',
      status: 'failed',
      output: null,
    });
    replayRun.addError({ name: 'QueueWorkerError', message: 'simulated failure' });
    await runStore.saveRun(replayRun);

    const planner = new DistributedRecoveryPlanner({ runStore });
    const plan = await planner.createPlan(replayRun.id, { compareToRunId: sourceRun.id });
    const runner = new DistributedRecoveryRunner({
      runStore,
      agentRuntime: agent,
      approvalDecider: async () => ({ approved: true, reason: 'approved in test' }),
    });
    const execution = await runner.executePlan(plan);

    expect(execution).toEqual(
      expect.objectContaining({
        executedAction: 'branch_from_failure_checkpoint',
        result: expect.objectContaining({
          status: 'completed',
          output: expect.stringContaining('recovered:recover this distributed run'),
        }),
      })
    );
  });

  test('DistributedRecoveryPlanner chooses workflow-specific recovery actions for workflow failures', async () => {
    const store = new InMemoryRunStore();
    const root = new Run({ input: 'workflow root' });
    root.setStatus('completed');

    const failed = new Run({
      input: 'workflow child',
      metadata: {
        workflowId: 'workflow-1',
        lineage: { rootRunId: root.id, parentRunId: root.id },
      },
    });
    failed.addStep({
      id: 'workflow-step-1',
      type: 'workflow_step',
      status: 'failed',
      output: null,
    });
    failed.addError({ name: 'WorkflowExecutionError', message: 'child branch failed' });
    failed.addCheckpoint({
      id: 'workflow-cp-1',
      label: 'workflow_failed',
      status: 'failed',
      snapshot: failed.createCheckpointSnapshot(),
    });
    failed.setStatus('failed');

    await store.saveRun(root);
    await store.saveRun(failed);

    const planner = new DistributedRecoveryPlanner({ runStore: store });
    const plan = await planner.createPlan(failed.id);

    expect(plan).toEqual(
      expect.objectContaining({
        incidentType: 'workflow_child_failure',
        recoveryPolicy: expect.objectContaining({
          prefersWorkflowScopedRecovery: true,
          requiresApprovalForBranch: true,
        }),
        recommendedAction: 'workflow_branch_from_failure_checkpoint',
      })
    );
  });

  test('DistributedRecoveryRunner waits for approval on high-impact recovery actions by default', async () => {
    const runStore = new InMemoryRunStore();
    const adapter = {
      getCapabilities: () => ({ generateText: true, toolCalling: false }),
      generateText: async messages => ({
        message: `recovered:${messages[messages.length - 1].content}`,
      }),
    };
    const agent = new pkg.Agent(adapter, { runStore });

    const sourceRun = await agent.run('recover with approval');
    const checkpointId = sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id;
    const replayRun = await agent.replayRun(sourceRun.id, { checkpointId });
    replayRun.setStatus('failed');
    replayRun.addStep({
      id: `${replayRun.id}:step:failed`,
      type: 'tool',
      status: 'failed',
      output: null,
    });
    replayRun.addError({ name: 'QueueWorkerError', message: 'queue timeout' });
    await runStore.saveRun(replayRun);

    const plan = await new DistributedRecoveryPlanner({ runStore }).createPlan(replayRun.id);
    const execution = await new DistributedRecoveryRunner({
      runStore,
      agentRuntime: agent,
    }).executePlan(plan);

    expect(execution).toEqual(
      expect.objectContaining({
        executedAction: 'waiting_for_recovery_approval',
        pendingApproval: expect.objectContaining({
          action: 'branch_from_failure_checkpoint',
          runId: replayRun.id,
        }),
      })
    );
  });

  test('ToolPolicy honors explicit approval requirements', async () => {
    const policy = new ToolPolicy();
    const tool = new Tool({
      name: 'send_email',
      parameters: { type: 'object', properties: {} },
      metadata: { executionPolicy: 'require_approval' },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(tool, {})).toEqual({
      action: 'require_approval',
      reason: 'Tool requires explicit approval.',
      source: 'metadata',
    });
  });

  test('ToolPolicy supports declarative authorization rules', () => {
    const policy = new ToolPolicy({
      rules: [
        {
          id: 'deny-delete',
          toolNames: ['delete_records'],
          action: 'deny',
          reason: 'Deletes are blocked in this environment.',
        },
        {
          id: 'approve-external',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
          reason: 'External writes require approval.',
        },
      ],
    });

    const deleteTool = new Tool({
      name: 'delete_records',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const notifyTool = new Tool({
      name: 'notify_user',
      parameters: { type: 'object', properties: {} },
      metadata: { sideEffectLevel: 'external_write' },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(deleteTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'deny',
        ruleId: 'deny-delete',
        source: 'rule',
      })
    );
    expect(policy.evaluate(notifyTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        ruleId: 'approve-external',
        source: 'rule',
      })
    );
  });

  test('ToolPolicy can accept dynamic policy rules at runtime', () => {
    const policy = new ToolPolicy();
    policy.addRule({
      id: 'dynamic-approval',
      sideEffectLevels: ['external_write'],
      action: 'require_approval',
      reason: 'Runtime-added policy requires approval.',
    });

    const tool = new Tool({
      name: 'notify_user',
      parameters: { type: 'object', properties: {} },
      metadata: { sideEffectLevel: 'external_write' },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(tool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        ruleId: 'dynamic-approval',
        source: 'rule',
      })
    );
  });

  test('ToolPolicy supports allowlists and denylists', () => {
    const policy = new ToolPolicy({
      allowTools: ['safe_tool'],
      denyTools: ['blocked_tool'],
    });

    const safeTool = new Tool({
      name: 'safe_tool',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const blockedTool = new Tool({
      name: 'blocked_tool',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const unknownTool = new Tool({
      name: 'unknown_tool',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(blockedTool, {}, {})).toEqual({
      action: 'deny',
      reason: 'Tool "blocked_tool" is blocked by policy.',
      source: 'denylist',
    });
    expect(policy.evaluate(unknownTool, {}, {})).toEqual({
      action: 'deny',
      reason: 'Tool "unknown_tool" is not in the policy allowlist.',
      source: 'allowlist',
    });
    expect(policy.evaluate(safeTool, {}, {})).toEqual({
      action: 'allow',
      reason: null,
      source: 'default',
    });
  });

  test('ProductionPolicyPack contributes policy rules and governance hooks through ExtensionHost', async () => {
    const pack = new ProductionPolicyPack({
      environment: 'production',
      denyToolNames: ['delete_records'],
      protectedToolNames: ['send_status_update'],
      requireApprovalTags: ['pii'],
    });
    const host = new ExtensionHost({
      extensions: [pack.toExtension()],
    });
    const policy = host.extendToolPolicy();
    const hooks = host.extendGovernanceHooks();

    const destructiveTool = new Tool({
      name: 'delete_records',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const protectedTool = new Tool({
      name: 'send_status_update',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const piiTool = new Tool({
      name: 'sync_profile',
      parameters: { type: 'object', properties: {} },
      metadata: { tags: ['pii'] },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(destructiveTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'deny',
        ruleId: 'production-deny-tools',
      })
    );
    expect(policy.evaluate(protectedTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        ruleId: 'production-protected-tools',
      })
    );
    expect(policy.evaluate(piiTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        ruleId: 'production-approval-tags',
      })
    );

    await hooks.dispatch(
      'approval_requested',
      {
        runId: 'run-9',
        toolName: 'send_status_update',
      },
      {
        run: { id: 'run-9' },
      }
    );

    expect(pack.listGovernanceEvents()).toEqual([
      expect.objectContaining({
        type: 'approval_requested',
        runId: 'run-9',
        toolName: 'send_status_update',
        environment: 'production',
      }),
    ]);
  });

  test('FileAuditSink logs risky side-effecting runtime events', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-agents-audit-'));
    const filePath = path.join(tempDir, 'audit.log');
    const sink = new FileAuditSink({ filePath });
    const run = new Run({ input: 'audit me' });
    run.addToolCall({
      name: 'send_status_update',
      metadata: { sideEffectLevel: 'external_write' },
    });

    await sink.handleEvent({ type: 'run_completed', payload: { output: 'done' } }, run);
    await sink.handleEvent({ type: 'model_response', payload: { output: 'ignored' } }, run);

    const lines = fs
      .readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));

    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual(
      expect.objectContaining({
        eventType: 'run_completed',
        runId: run.id,
        status: run.status,
        payload: { output: 'done' },
      })
    );
  });

  test('FileAuditSink supports pii-safe audit logging', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-agents-audit-safe-'));
    const filePath = path.join(tempDir, 'audit.log');
    const sink = new FileAuditSink({ filePath, piiSafe: true });
    const run = new Run({ input: 'audit me safely' });
    run.addToolCall({
      name: 'send_status_update',
      metadata: { sideEffectLevel: 'external_write' },
    });

    await sink.handleEvent(
      {
        type: 'tool_completed',
        payload: {
          metadata: { sideEffectLevel: 'external_write' },
          arguments: {
            email: 'paulo@example.com',
            authToken: 'super-secret-token',
          },
        },
      },
      run
    );

    const [entry] = fs
      .readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));

    expect(entry.payload.arguments).toEqual({
      email: '[REDACTED]',
      authToken: '[REDACTED]',
    });
  });

  test('EventBus dispatches events to function and object sinks', async () => {
    const seen = [];
    const eventBus = new EventBus({
      sinks: [
        async event => {
          seen.push(`fn:${event.type}`);
        },
        {
          handleEvent: async event => {
            seen.push(`obj:${event.type}`);
          },
        },
      ],
    });

    await eventBus.emit({ type: 'run_started' }, {});
    expect(seen).toEqual(['fn:run_started', 'obj:run_started']);
  });

  test('ConsoleDebugSink can redact sensitive fields in pii-safe mode', async () => {
    const logger = { debug: jest.fn() };
    const sink = new pkg.ConsoleDebugSink({ logger, piiSafe: true });

    await sink.handleEvent({
      type: 'approval_requested',
      payload: {
        headers: { Authorization: 'Bearer secret' },
        authToken: 'sensitive-token',
      },
    });

    expect(logger.debug).toHaveBeenCalledWith(
      '[agnostic-agents]',
      JSON.stringify({
        type: 'approval_requested',
        payload: {
          headers: { Authorization: '[REDACTED]' },
          authToken: '[REDACTED]',
        },
      })
    );
  });

  test('RuntimeEventRedactor redacts nested sensitive values', () => {
    const redactor = new RuntimeEventRedactor();

    expect(
      redactor.redact({
        token: 'abc',
        nested: {
          email: 'user@example.com',
          headers: {
            Authorization: 'Bearer abc',
          },
        },
      })
    ).toEqual({
      token: '[REDACTED]',
      nested: {
        email: '[REDACTED]',
        headers: {
          Authorization: '[REDACTED]',
        },
      },
    });
  });

  test('FallbackRouter falls through providers and exposes merged capabilities', async () => {
    const events = [];
    const providerA = {
      getCapabilities: () => ({ generateText: true, toolCalling: false }),
      generateText: jest.fn().mockRejectedValue(new Error('primary failed')),
    };
    const providerB = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'ok from fallback' }),
    };

    const router = new FallbackRouter({
      providers: [providerA, providerB],
      onFallback: async info => events.push(info.to === providerB ? 'fallback' : 'other'),
    });

    await expect(router.generateText([{ role: 'user', content: 'hello' }])).resolves.toEqual(
      expect.objectContaining({
        message: 'ok from fallback',
        routing: expect.any(Object),
      })
    );
    expect(router.getCapabilities()).toEqual(
      expect.objectContaining({ generateText: true, toolCalling: true })
    );
    expect(events).toEqual(['fallback']);
  });

  test('FallbackRouter can route by cost, risk, and task hints before fallback', async () => {
    const cheapProvider = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'cheap route' }),
    };
    const safeProvider = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'safe route' }),
    };

    const router = new FallbackRouter({
      providers: [
        {
          provider: cheapProvider,
          profile: { costTier: 'low', riskTier: 'medium', taskTypes: ['summarization'] },
        },
        {
          provider: safeProvider,
          profile: { costTier: 'high', riskTier: 'high', taskTypes: ['verification'] },
        },
      ],
    });

    const cheapResult = await router.generateText([{ role: 'user', content: 'summarize' }], {
      route: { hints: { cost: 'low', taskType: 'summarization' } },
    });
    expect(cheapResult).toEqual(
      expect.objectContaining({
        message: 'cheap route',
        routing: expect.objectContaining({
          selectedProfile: expect.objectContaining({ costTier: 'low' }),
        }),
      })
    );

    const safeResult = await router.generateText([{ role: 'user', content: 'verify' }], {
      route: { hints: { risk: 'high', taskType: 'verification' } },
    });
    expect(safeResult).toEqual(
      expect.objectContaining({
        message: 'safe route',
        routing: expect.objectContaining({
          selectedProfile: expect.objectContaining({ riskTier: 'high' }),
        }),
      })
    );

    expect(cheapProvider.generateText).toHaveBeenCalledTimes(1);
    expect(safeProvider.generateText).toHaveBeenCalledTimes(1);
  });

  test('FallbackRouter can route using historical provider outcomes', async () => {
    const cheapProvider = {
      name: 'cheap-provider',
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'cheap route' }),
    };
    const reliableProvider = {
      name: 'reliable-provider',
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'reliable route' }),
    };

    const advisor = new HistoricalRoutingAdvisor({
      outcomes: [
        { providerLabel: 'cheap', success: false, methodName: 'generateText', taskType: 'support' },
        { providerLabel: 'reliable', success: true, methodName: 'generateText', taskType: 'support', confidence: 0.9 },
      ],
    });

    const router = new FallbackRouter({
      providers: [
        {
          provider: cheapProvider,
          profile: { labels: ['cheap'], costTier: 'low', riskTier: 'medium', taskTypes: ['support'] },
        },
        {
          provider: reliableProvider,
          profile: { labels: ['reliable'], costTier: 'medium', riskTier: 'high', taskTypes: ['support'] },
        },
      ],
      routingAdvisor: advisor,
    });

    const result = await router.generateText([{ role: 'user', content: 'help' }], {
      route: { taskType: 'support' },
    });

    expect(result).toEqual(expect.objectContaining({ message: 'reliable route' }));
    expect(reliableProvider.generateText).toHaveBeenCalledTimes(1);
    expect(cheapProvider.generateText).not.toHaveBeenCalled();
  });

  test('CapabilityRouter ranks model, simulator, and human candidates with explanations', () => {
    const advisor = new HistoricalRoutingAdvisor({
      outcomes: [
        { providerLabel: 'code-model', success: true, methodName: 'generateText', taskType: 'coding', confidence: 0.9 },
        { providerLabel: 'human-review', success: true, methodName: 'generateText', taskType: 'release_review', confidence: 0.95 },
        { providerLabel: 'cheap-extractor', success: false, methodName: 'generateText', taskType: 'coding' },
      ],
    });
    const router = new CapabilityRouter({
      routingAdvisor: advisor,
      candidates: [
        {
          id: 'code-model',
          kind: 'model',
          capabilities: ['generateText', 'toolCalling', 'code_generation'],
          profile: {
            taskTypes: ['coding'],
            trustZones: ['private'],
            costTier: 'medium',
            riskTier: 'high',
            certificationLevel: 'certified',
            reputationScore: 0.88,
          },
        },
        {
          id: 'sandbox-worker',
          kind: 'simulator',
          capabilities: ['simulation'],
          profile: {
            taskTypes: ['risky_execution'],
            trustZones: ['sandbox_only'],
            supportsSimulation: true,
            certificationLevel: 'certified',
            reputationScore: 0.75,
          },
        },
        {
          id: 'human-review',
          kind: 'human',
          capabilities: ['approval', 'release_signoff'],
          profile: {
            taskTypes: ['release_review'],
            trustZones: ['private'],
            certificationLevel: 'trusted',
            reputationScore: 0.95,
          },
        },
      ],
    });

    const codingDecision = router.select({
      taskType: 'coding',
      requiredCapabilities: ['generateText'],
      preferredCapabilities: ['code_generation'],
      preferredKinds: ['model'],
      trustZone: 'private',
      route: { hints: { risk: 'high', cost: 'medium' } },
    });
    const riskyDecision = router.select({
      taskType: 'risky_execution',
      requiredCapabilities: ['simulation'],
      preferredKinds: ['simulator'],
      trustZone: 'sandbox_only',
      requiresSimulation: true,
    });

    expect(codingDecision.candidate).toEqual(
      expect.objectContaining({
        id: 'code-model',
        kind: 'model',
        eligible: true,
      })
    );
    expect(codingDecision.explanation).toContain('Selected "code-model"');
    expect(riskyDecision.candidate).toEqual(
      expect.objectContaining({
        id: 'sandbox-worker',
        kind: 'simulator',
        eligible: true,
      })
    );
    expect(riskyDecision.rejectedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'code-model',
          eligible: false,
        }),
      ])
    );
  });

  test('Workflow validates step definitions and dependencies', () => {
    const step = new WorkflowStep({
      id: 'collect',
      run: async () => 'ok',
    });

    expect(new Workflow({ id: 'wf', steps: [step] }).steps).toHaveLength(1);
    expect(
      () =>
        new Workflow({
          id: 'broken',
          steps: [{ id: 'a', dependsOn: ['missing'], run: async () => null }],
        })
    ).toThrow('depends on unknown step');
  });

  test('DelegationContract validates required inputs and serializes cleanly', () => {
    const contract = new DelegationContract({
      id: 'delegate',
      requiredInputs: ['prompt'],
      requiredCapabilities: ['toolCalling'],
    });

    expect(contract.toJSON()).toEqual(
      expect.objectContaining({
        id: 'delegate',
        requiredInputs: ['prompt'],
        requiredCapabilities: ['toolCalling'],
      })
    );

    expect(() => contract.validateInput({})).toThrow('missing required input "prompt"');
    expect(() =>
      contract.validateCapabilities({
        adapter: { getCapabilities: () => ({ toolCalling: false }) },
      })
    ).toThrow('requires capability "toolCalling"');
  });

  test('ApprovalInbox stores and resolves approval requests', async () => {
    const inbox = new ApprovalInbox();
    await inbox.add({ runId: 'run-1', toolName: 'send_email' });
    await expect(inbox.get('run-1')).resolves.toEqual(
      expect.objectContaining({ toolName: 'send_email' })
    );
    await inbox.resolve('run-1');
    await expect(inbox.get('run-1')).resolves.toBeNull();
  });

  test('BackgroundJobScheduler executes due jobs and records results', async () => {
    const scheduler = new BackgroundJobScheduler();
    await scheduler.schedule({
      id: 'job-1',
      runAt: '2020-01-01T00:00:00.000Z',
      run: async () => 'done',
    });

    const results = await scheduler.runDueJobs(new Date('2020-01-01T00:00:01.000Z'));
    expect(results).toEqual([
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
        result: 'done',
      }),
    ]);
  });

  test('BackgroundJobScheduler persists recurring jobs through a file store', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-store-'));
    const store = new FileJobStore({ directory: tmpDir });
    const scheduler = new BackgroundJobScheduler({
      store,
      handlers: {
        ping: async payload => ({ echoed: payload.value }),
      },
    });

    await scheduler.schedule({
      id: 'job-2',
      handler: 'ping',
      payload: { value: 'pong' },
      runAt: '2020-01-01T00:00:00.000Z',
      intervalMs: 1000,
      maxRuns: 2,
    });

    const firstRun = await scheduler.runDueJobs(new Date('2020-01-01T00:00:00.500Z'));
    expect(firstRun[0]).toEqual(
      expect.objectContaining({
        id: 'job-2',
        status: 'scheduled',
        runCount: 1,
        result: { echoed: 'pong' },
      })
    );

    const rehydrated = new BackgroundJobScheduler({
      store,
      handlers: {
        ping: async payload => ({ echoed: payload.value }),
      },
    });
    const secondRun = await rehydrated.runDueJobs(new Date('2020-01-01T00:00:02.000Z'));
    expect(secondRun[0]).toEqual(
      expect.objectContaining({
        id: 'job-2',
        status: 'completed',
        runCount: 2,
      })
    );
  });

  test('BaseEnvironmentAdapter and specializations expose runtime environment contracts', async () => {
    const adapter = new BaseEnvironmentAdapter({
      kind: 'custom',
      actions: ['write'],
      metadata: { scope: 'unit' },
      execute: async (_action, payload) => payload.value,
    });

    await expect(adapter.execute('write', { value: 'ok' })).resolves.toBe('ok');
    expect(adapter.describe()).toEqual({
      kind: 'custom',
      actions: ['write'],
      metadata: { scope: 'unit' },
    });
    expect(new BrowserEnvironmentAdapter().kind).toBe('browser');
    expect(new ShellEnvironmentAdapter().kind).toBe('shell');
    expect(new ApiEnvironmentAdapter().kind).toBe('api');
    expect(new QueueEnvironmentAdapter().kind).toBe('queue');
    expect(new FileEnvironmentAdapter().kind).toBe('file');
  });

  test('DelegationRuntime delegates child runs under explicit lineage', async () => {
    const runtime = new DelegationRuntime();
    const parentRun = new Run({ input: 'parent' });
    const agent = {
      adapter: { getCapabilities: () => ({ toolCalling: true }) },
      run: jest.fn(async (_prompt, config) =>
        new Run({
          input: 'child',
          output: 'delegated',
          status: 'completed',
          metadata: config.metadata,
        })
      ),
    };

    const result = await runtime.delegate({
      parentRun,
      agent,
      prompt: 'Do work',
      contract: {
        id: 'contract-1',
        requiredInputs: ['prompt'],
        requiredCapabilities: ['toolCalling'],
      },
      metadata: { assignee: 'delegate' },
    });

    expect(result.childRun.output).toBe('delegated');
    expect(parentRun.metadata.lineage.childRunIds).toContain(result.childRun.id);
    expect(parentRun.metrics.childRuns.count).toBe(1);
    expect(parentRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['delegation_runtime_started', 'delegation_runtime_completed'])
    );
  });

  test('PlanningRuntime supports planning, verification, and recovery phases', async () => {
    const runtime = new PlanningRuntime({
      planner: async ({ input }) => [{ id: 'step-1', task: input }],
      executor: async ({ plan }) => ({ completed: plan.length, valid: false }),
      verifier: async ({ result }) => ({ status: result.valid ? 'passed' : 'recover' }),
      recovery: async ({ plan }) => ({ plan: [...plan, { id: 'step-2', task: 'retry' }] }),
    });

    const run = await runtime.run('draft update');
    expect(run.status).toBe('completed');
    expect(run.output.plan).toHaveLength(2);
    expect(run.output.recoveries).toHaveLength(1);
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['plan_created', 'plan_verified', 'plan_recovered', 'planning_completed'])
    );
  });

  test('PlanningRuntime revises the plan after execution failure', async () => {
    let firstAttempt = true;
    const runtime = new PlanningRuntime({
      planner: async () => [{ id: 'initial' }],
      executor: async ({ plan }) => {
        if (firstAttempt) {
          firstAttempt = false;
          throw new Error(`failed:${plan[0].id}`);
        }
        return { ok: true, planLength: plan.length };
      },
      recovery: async ({ error }) => ({
        reason: error.message,
        plan: [{ id: 'revised' }, { id: 'stabilize' }],
      }),
    });

    const run = await runtime.run('recover me');
    expect(run.status).toBe('completed');
    expect(run.output.plan).toHaveLength(2);
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['plan_execution_failed', 'plan_recovered', 'planning_completed'])
    );
  });

  test('LearningLoop builds recommendations from runs and evals', () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(
      new Run({
        input: 'bad run',
        status: 'failed',
        errors: [{ message: 'boom' }],
        pendingApproval: { toolName: 'send_status_update' },
        state: {
          selfVerification: { action: 'require_approval' },
          assessment: { confidence: 0.45, evidenceConflicts: 1 },
        },
      })
    );
    learningLoop.recordEvaluation({
      total: 1,
      passed: 0,
      failed: 1,
      results: [
        {
          id: 'eval-1',
          passed: false,
          category: 'tooling',
          error: 'status tool timed out',
          feedback: [{ category: 'integration', message: 'remote control plane timed out' }],
        },
      ],
    });

    expect(learningLoop.buildRecommendations()).toEqual(
      expect.arrayContaining([
        'Investigate failed runs and add replay-based regression coverage.',
        'Tighten prompts, tool contracts, or policies for scenarios failing the eval harness.',
        'Review verifier denials and require approval or stronger routing for risky actions.',
      ])
    );
    expect(learningLoop.summarize()).toEqual(
      expect.objectContaining({
        failedRuns: 1,
        approvalBlocks: 1,
        lowConfidenceRuns: 1,
        evidenceConflictRuns: 1,
        feedbackItems: 2,
        feedbackByCategory: expect.objectContaining({
          tooling: 1,
          integration: 1,
        }),
      })
    );
    expect(learningLoop.buildAdaptiveRecommendations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'eval-failures',
          category: 'evaluation',
          priority: 'high',
        }),
        expect.objectContaining({
          id: 'governance-pressure',
          category: 'governance',
          priority: 'high',
        }),
        expect.objectContaining({
          id: 'grounding-quality',
          category: 'routing',
        }),
        expect.objectContaining({
          id: 'tooling-stability',
          category: 'operations',
        }),
      ])
    );
  });

  test('PolicyTuningAdvisor turns replay and eval signals into policy suggestions', () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(
      new Run({
        input: 'risky run',
        status: 'failed',
        pendingApproval: { toolName: 'send_status_update' },
        state: {
          selfVerification: { action: 'require_approval' },
          assessment: {
            confidence: 0.41,
            evidenceConflicts: 1,
          },
        },
      })
    );
    const evaluationReport = learningLoop.recordEvaluation({
      total: 1,
      passed: 0,
      failed: 1,
      results: [{ id: 'eval-risky-path', passed: false, category: 'evaluation', error: 'policy mismatch' }],
    });

    const advisor = new PolicyTuningAdvisor({ learningLoop });
    const suggestions = advisor.buildSuggestions({
      evaluationReport,
      branchAnalysis: {
        baselineRunId: 'run-baseline',
        bestRunId: 'run-branch',
        comparisons: [{ runId: 'run-branch', diff: { firstDivergingStepIndex: 2 } }],
      },
    });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tighten-side-effect-policy',
          category: 'tool_policy',
          priority: 'high',
        }),
        expect.objectContaining({
          id: 'strengthen-reviewer-composition',
          category: 'verifier_policy',
        }),
        expect.objectContaining({
          id: 'promote-healthier-branch-baseline',
          category: 'routing_policy',
        }),
        expect.objectContaining({
          id: 'convert-failing-evals-into-policy-tests',
          category: 'evaluation_policy',
        }),
      ])
    );
  });

  test('VerifierEnsemble uses the most restrictive reviewer outcome by default', async () => {
    const ensemble = new VerifierEnsemble({
      reviewers: [
        async () => ({ action: 'allow', reason: 'looks fine' }),
        async () => ({ action: 'require_approval', reason: 'side effect needs approval' }),
      ],
    });

    await expect(ensemble.verify({ name: 'send_email' }, { query: 'status' })).resolves.toEqual(
      expect.objectContaining({
        action: 'require_approval',
        source: 'verifier_ensemble',
        strategy: 'most_restrictive',
      })
    );
  });

  test('VerifierEnsemble can escalate reviewer disagreement', async () => {
    const ensemble = new VerifierEnsemble({
      strategy: 'escalate_on_disagreement',
      reviewers: [
        async () => ({ action: 'allow', reason: 'safe enough' }),
        async () => ({ action: 'require_approval', reason: 'review manually' }),
      ],
    });

    await expect(ensemble.verify({ name: 'send_email' }, { query: 'status' })).resolves.toEqual(
      expect.objectContaining({
        action: 'require_approval',
        source: 'verifier_ensemble',
        strategy: 'escalate_on_disagreement',
      })
    );
  });

  test('ConfidencePolicy escalates low-confidence risky tools and pauses weak final runs', () => {
    const policy = new ConfidencePolicy({
      toolApprovalThreshold: 0.6,
      runPauseThreshold: 0.7,
    });

    expect(
      policy.evaluateTool(
        { name: 'send_email', metadata: { sideEffectLevel: 'external_write' } },
        { score: 0.4 }
      )
    ).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        source: 'confidence_policy',
      })
    );

    expect(
      policy.evaluateRun(
        { id: 'run-1' },
        { confidence: 0.55 }
      )
    ).toEqual(
      expect.objectContaining({
        action: 'pause',
        source: 'confidence_policy',
      })
    );
  });

  test('AdaptiveRetryPolicy escalates risky retries when prior failures exist', async () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(new Run({ input: 'failed', status: 'failed', errors: [{ message: 'boom' }] }));

    const policy = new AdaptiveRetryPolicy({
      learningLoop,
      escalateAfterAttempt: 0,
    });
    const retryManager = new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 });
    const fn = jest.fn().mockRejectedValue(new Error('tool failure'));
    const escalated = [];

    await expect(
      retryManager.executeWithPolicy(
        fn,
        {
          policy,
          context: {
            operation: 'tool_execution',
            sideEffectLevel: 'external_write',
          },
          onEscalate: async (error, details) => {
            escalated.push({ message: error.message, decision: details.decision });
            return 'escalated';
          },
        }
      )
    ).resolves.toBe('escalated');

    expect(escalated).toEqual([
      expect.objectContaining({
        message: 'tool failure',
        decision: expect.objectContaining({
          action: 'escalate',
        }),
      }),
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('AdaptiveDecisionLedger records adaptive choices with replay and rollback metadata', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-agents-adaptive-'));
    const filePath = path.join(tempDir, 'adaptive.log');
    const ledger = new AdaptiveDecisionLedger({ filePath });

    const suggestion = await ledger.recordSuggestion(
      {
        id: 'suggest-1',
        category: 'routing_policy',
        suggestion: 'Prefer the healthier replay branch as the routing baseline.',
        evidence: { bestRunId: 'run-2' },
      },
      {
        replay: { baselineRunId: 'run-1', bestRunId: 'run-2' },
        rollback: { action: 'restore_baseline', runId: 'run-1' },
      }
    );

    const decision = await ledger.recordDecision(
      {
        id: 'decision-1',
        category: 'verifier_policy',
        summary: 'Applied stricter verifier ensemble for low-confidence paths.',
        evidence: { lowConfidenceRuns: 2 },
      },
      {
        applied: true,
        approved: true,
        replay: { policy: 'verifier_ensemble_v2' },
        rollback: { action: 'restore_policy', policy: 'verifier_ensemble_v1' },
      }
    );

    expect(ledger.summarize()).toEqual(
      expect.objectContaining({
        total: 2,
        suggestions: 1,
        decisions: 1,
        applied: 1,
        approved: 1,
        replayable: 2,
        rollbackReady: 2,
      })
    );
    expect(ledger.exportReplay(suggestion.id)).toEqual(
      expect.objectContaining({
        entryId: 'suggest-1',
        replay: expect.objectContaining({ bestRunId: 'run-2' }),
      })
    );
    expect(ledger.buildRollbackPlan(decision.id)).toEqual(
      expect.objectContaining({
        entryId: 'decision-1',
        rollback: expect.objectContaining({ action: 'restore_policy' }),
      })
    );

    const persisted = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    expect(persisted).toHaveLength(2);
  });

  test('AdaptiveGovernanceGate routes material adaptive changes through approval and resolution', async () => {
    const events = [];
    const ledger = new AdaptiveDecisionLedger();
    const approvalInbox = new ApprovalInbox();
    const gate = new AdaptiveGovernanceGate({
      ledger,
      approvalInbox,
      governanceHooks: new GovernanceHooks({
        onEvent: async type => {
          events.push(type);
        },
      }),
    });

    const reviewed = await gate.reviewSuggestion(
      {
        id: 'routing-shift-1',
        category: 'routing_policy',
        priority: 'high',
        suggestion: 'Promote the healthier replay branch as the routing baseline.',
        evidence: { bestRunId: 'run-2' },
      },
      {
        replay: { baselineRunId: 'run-1', bestRunId: 'run-2' },
        rollback: { action: 'restore_baseline', runId: 'run-1' },
      }
    );

    expect(reviewed).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        request: expect.objectContaining({
          adaptiveEntryId: 'routing-shift-1',
          type: 'adaptive_change',
        }),
      })
    );
    expect(await approvalInbox.get('routing-shift-1')).toEqual(
      expect.objectContaining({
        adaptiveEntryId: 'routing-shift-1',
      })
    );

    const resolved = await gate.resolveReview('routing-shift-1', {
      approved: true,
      applied: true,
      reason: 'Operator approved routing change.',
    });

    expect(resolved).toEqual(
      expect.objectContaining({
        approved: true,
        applied: true,
        adaptiveEntryId: 'routing-shift-1',
      })
    );
    expect(ledger.summarize()).toEqual(
      expect.objectContaining({
        total: 2,
        approved: 1,
        applied: 1,
      })
    );
    expect(events).toEqual(['adaptive_review_requested', 'adaptive_review_resolved']);
  });

  test('AdaptiveGovernanceGate allows non-material advisory suggestions without approval', async () => {
    const events = [];
    const gate = new AdaptiveGovernanceGate({
      ledger: new AdaptiveDecisionLedger(),
      approvalInbox: new ApprovalInbox(),
      governanceHooks: new GovernanceHooks({
        onEvent: async type => {
          events.push(type);
        },
      }),
      materialCategories: ['tool_policy'],
      materialPriorities: ['high'],
    });

    const reviewed = await gate.reviewSuggestion({
      id: 'note-1',
      category: 'policy_hygiene',
      priority: 'low',
      suggestion: 'Keep the current policy baseline until more evals land.',
    });

    expect(reviewed).toEqual(
      expect.objectContaining({
        action: 'allow',
        request: null,
      })
    );
    expect(events).toEqual(['adaptive_review_allowed']);
  });

  test('ImprovementProposalEngine and LearnedAdaptationArtifact turn evidence into portable change proposals', () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(
      new Run({
        input: 'risky release summary',
        status: 'failed',
        pendingApproval: { toolName: 'send_status_update' },
        state: {
          assessment: {
            confidence: 0.41,
            evidenceConflicts: 1,
          },
          selfVerification: {
            action: 'require_approval',
          },
        },
      })
    );
    learningLoop.recordEvaluation({
      total: 1,
      passed: 0,
      failed: 1,
      results: [
        {
          id: 'routing-regression',
          passed: false,
          category: 'routing',
          error: 'retrieval grounding failed',
        },
      ],
    });

    const engine = new ImprovementProposalEngine({ learningLoop });
    const proposals = engine.buildProposals({
      branchComparison: { rootRunId: 'run-root-1', strongestBranchId: 'run-branch-2' },
      incident: { runId: 'incident-run-1', type: 'grounding_failure' },
    });
    const artifact = new LearnedAdaptationArtifact({
      proposal: proposals[0],
      metadata: { source: 'test' },
    });

    expect(proposals.length).toBeGreaterThan(1);
    expect(artifact.toJSON()).toEqual(
      expect.objectContaining({
        format: 'agnostic-agents-learned-adaptation',
        proposal: expect.objectContaining({
          changeType: expect.any(String),
          targetSurface: expect.any(String),
        }),
      })
    );
    expect(LearnedAdaptationArtifact.fromJSON(artifact.toJSON()).summarize()).toEqual(
      expect.objectContaining({
        id: artifact.proposal.id,
      })
    );
  });

  test('Fleet rollout classes summarize staged rollout and halt on unhealthy canaries', () => {
    const plan = new FleetRolloutPlan({
      target: {
        id: 'policy-pack:v14',
        type: 'policy_pack',
        version: '14.0.0-canary',
      },
      stages: [
        {
          percentage: 10,
          scope: 'environment',
          environmentIds: ['staging'],
        },
        {
          percentage: 50,
          scope: 'tenant',
          tenantIds: ['tenant-a', 'tenant-b'],
        },
      ],
      rollbackTriggers: [
        {
          metric: 'adaptiveRegressions',
          operator: '>',
          threshold: 0,
        },
      ],
    });
    const monitor = new FleetHealthMonitor();
    monitor.record({
      environmentId: 'staging',
      tenantId: 'tenant-a',
      runs: 24,
      failedRuns: 1,
      adaptiveRegressions: 1,
      saturation: 0.62,
    });
    const evaluator = new FleetCanaryEvaluator({ monitor });
    const decision = evaluator.evaluate(plan);

    expect(plan.toJSON()).toEqual(
      expect.objectContaining({
        target: expect.objectContaining({
          type: 'policy_pack',
        }),
      })
    );
    expect(monitor.summarize()).toEqual(
      expect.objectContaining({
        snapshots: 1,
        adaptiveRegressions: 1,
        environments: 1,
      })
    );
    expect(decision).toEqual(
      expect.objectContaining({
        action: 'halt_and_rollback',
        triggered: expect.arrayContaining([
          expect.objectContaining({
            metric: 'adaptiveRegressions',
          }),
        ]),
      })
    );
  });

  test('FleetSafetyController enforces concurrency, backlog, risk-budget, and rollout boundaries', () => {
    const monitor = new FleetHealthMonitor();
    monitor.record({
      environmentId: 'prod-eu',
      tenantId: 'tenant-a',
      runs: 120,
      failedRuns: 3,
      adaptiveRegressions: 2,
      schedulerBacklog: 18,
      saturation: 0.94,
    });

    const controller = new FleetSafetyController({
      monitor,
      maxConcurrentRuns: 100,
      maxSchedulerBacklog: 10,
      maxAdaptiveRegressions: 0,
      maxSaturation: 0.85,
      allowedEnvironmentIds: ['staging', 'prod-eu'],
      allowedTenantIds: ['tenant-a'],
    });

    const decision = controller.evaluate(null, {
      environmentId: 'prod-eu',
      tenantId: 'tenant-a',
    });

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'halt',
        reasons: expect.arrayContaining([
          expect.stringContaining('concurrency budget'),
          expect.stringContaining('backlog budget'),
          expect.stringContaining('risk budget'),
          expect.stringContaining('safety threshold'),
        ]),
      })
    );
  });

  test('FleetImpactComparator compares rollout state before and after adaptive changes', () => {
    const before = new FleetHealthMonitor();
    before.record({
      environmentId: 'staging',
      runs: 20,
      failedRuns: 2,
      adaptiveRegressions: 1,
      schedulerBacklog: 3,
      saturation: 0.71,
    });
    const after = new FleetHealthMonitor();
    after.record({
      environmentId: 'staging',
      runs: 24,
      failedRuns: 1,
      adaptiveRegressions: 0,
      schedulerBacklog: 1,
      saturation: 0.62,
    });

    const comparator = new FleetImpactComparator({ before, after });
    const comparison = comparator.compare();

    expect(comparison).toEqual(
      expect.objectContaining({
        delta: expect.objectContaining({
          runs: 4,
          failedRuns: -1,
          adaptiveRegressions: -1,
          schedulerBacklog: -2,
        }),
        impact: expect.objectContaining({
          improved: true,
          regressed: false,
        }),
      })
    );
  });

  test('FleetRollbackAdvisor recommends rollback on broader fleet regressions', () => {
    const plan = new FleetRolloutPlan({
      target: {
        id: 'learning-pack:v14-canary',
        type: 'learned_change_bundle',
        version: '14.0.0-canary',
      },
      stages: [{ percentage: 10, scope: 'environment' }],
    });
    const before = new FleetHealthMonitor();
    before.record({
      environmentId: 'staging',
      runs: 20,
      failedRuns: 1,
      adaptiveRegressions: 0,
      schedulerBacklog: 1,
      saturation: 0.55,
    });
    const after = new FleetHealthMonitor();
    after.record({
      environmentId: 'staging',
      runs: 24,
      failedRuns: 4,
      adaptiveRegressions: 2,
      schedulerBacklog: 5,
      saturation: 0.81,
    });

    const comparator = new FleetImpactComparator({ before, after });
    const controller = new FleetSafetyController({
      monitor: after,
      maxConcurrentRuns: 30,
      maxSchedulerBacklog: 3,
      maxAdaptiveRegressions: 0,
      maxSaturation: 0.75,
    });
    const advisor = new FleetRollbackAdvisor({ comparator });
    const advice = advisor.advise({
      plan,
      comparison: comparator.compare(),
      safetyDecision: controller.evaluate(),
    });

    expect(advice).toEqual(
      expect.objectContaining({
        action: 'rollback_recommended',
        reasons: expect.arrayContaining([
          expect.stringContaining('regressed key health signals'),
          expect.stringContaining('Failed runs increased'),
          expect.stringContaining('Adaptive regressions increased'),
          expect.stringContaining('Fleet safety controller halted'),
        ]),
        rollback: expect.objectContaining({
          targetId: 'learning-pack:v14-canary',
        }),
      })
    );
  });

  test('RouteFleetDiagnostics summarizes degraded, saturated, and drifting routes across fleet snapshots', () => {
    const monitor = new FleetHealthMonitor();
    monitor.record({
      environmentId: 'prod-eu',
      tenantId: 'tenant-a',
      runs: 120,
      saturation: 0.74,
      routeMetrics: [
        {
          routeId: 'coding-route',
          selectedCount: 42,
          degraded: true,
          saturation: 0.86,
          driftScore: 0.61,
          fallbackRate: 0.22,
        },
        {
          routeId: 'verification-route',
          selectedCount: 18,
          degraded: false,
          saturation: 0.43,
          driftScore: 0.12,
          fallbackRate: 0.05,
        },
      ],
    });
    monitor.record({
      environmentId: 'prod-us',
      tenantId: 'tenant-b',
      runs: 95,
      saturation: 0.69,
      routeMetrics: [
        {
          routeId: 'coding-route',
          selectedCount: 31,
          degraded: false,
          saturation: 0.71,
          driftScore: 0.28,
          fallbackRate: 0.09,
        },
      ],
    });

    const diagnostics = new RouteFleetDiagnostics({ monitor }).analyze();

    expect(diagnostics).toEqual(
      expect.objectContaining({
        totalRoutes: 2,
        degradedRoutes: 1,
        highDriftRoutes: 1,
        saturatedRoutes: 1,
        routes: expect.arrayContaining([
          expect.objectContaining({
            routeId: 'coding-route',
            selectedCount: 73,
            degradedCount: 1,
            maxSaturation: 0.86,
            maxDriftScore: 0.61,
          }),
        ]),
      })
    );
    expect(diagnostics.alerts.join(' ')).toContain('coding-route');
  });

  test('OperatorInterventionPlanner recommends mixed runtime, assurance, and rollback actions', () => {
    const planner = new OperatorInterventionPlanner();
    const decision = planner.plan({
      incident: { recommendedAction: 'branch_from_failure_checkpoint' },
      assurance: { verdict: 'block' },
      rollout: { action: 'halt' },
      rollback: { action: 'rollback_recommended' },
    });

    expect(decision.actions).toEqual(
      expect.arrayContaining([
        'branch_from_failure_checkpoint',
        'quarantine_candidate',
        'halt_rollout',
        'rollback_rollout',
      ])
    );
    expect(decision.recommendedAction).toBe('branch_from_failure_checkpoint');
  });

  test('OperatorInterventionPlanner accepts summarized runs and assurance artifacts', () => {
    const planner = new OperatorInterventionPlanner();
    const assurance = new AssuranceReport({
      invariants: [{ id: 'inv-1', passed: false, surface: 'rollout', severity: 'high' }],
    }).toJSON();
    const runSummary = {
      id: 'run-1',
      status: 'waiting_for_approval',
      input: 'input',
      output: null,
      events: 3,
      steps: [],
      checkpoints: [],
      metrics: {},
      childRunAggregate: { count: 0, tokenUsage: { prompt: 0, completion: 0, total: 0 }, cost: 0, timings: {} },
      lineage: null,
      assessment: null,
      evidence: null,
      pendingApproval: { id: 'approval-1' },
      pendingPause: null,
      errors: [],
    };

    const decision = planner.plan({
      run: runSummary,
      assurance,
    });

    expect(decision.run).toBe(runSummary);
    expect(decision.actions).toEqual(
      expect.arrayContaining(['limit_automatic_execution', 'quarantine_candidate'])
    );
  });

  test('OperatorSummary builds operator-centered highlights', () => {
    const summary = new OperatorSummary().summarize({
      runs: [{ status: 'failed' }, { status: 'completed' }],
      incidents: [{ id: 'incident-1' }],
      rollouts: [{ action: 'rollback_recommended' }],
      learnedChanges: [{ id: 'change-1', status: 'pending_review' }],
      assuranceReports: [{ verdict: 'block' }],
    });

    expect(summary.totals.runs).toBe(2);
    expect(summary.assurance.blocked).toBe(1);
    expect(summary.rollouts.rollbackRecommendations).toBe(1);
    expect(summary.highlights.join(' ')).toContain('waiting for operator review');
  });

  test('OperatorSummary counts blocked assurance from AssuranceReport artifacts', () => {
    const assurance = new AssuranceReport({
      invariants: [{ id: 'inv-1', passed: false, surface: 'coordination', severity: 'high' }],
    }).toJSON();

    const summary = new OperatorSummary().summarize({
      assuranceReports: [assurance],
    });

    expect(summary.assurance.blocked).toBe(1);
    expect(summary.highlights.join(' ')).toContain('blocking rollout');
  });

  test('OperatorTriageWorkflow builds summary, intervention, and checklist output', () => {
    const triage = new OperatorTriageWorkflow().run({
      runs: [{ status: 'failed' }],
      incidents: [{ id: 'incident-1' }],
      rollouts: [{ action: 'rollback_recommended' }],
      learnedChanges: [{ id: 'change-1', status: 'pending_review' }],
      assuranceReports: [{ verdict: 'block' }],
      primaryIncident: { recommendedAction: 'branch_from_failure_checkpoint' },
      primaryAssurance: { verdict: 'block' },
      primaryRollout: { action: 'halt' },
      primaryRollback: { action: 'rollback_recommended' },
      context: { scope: 'cross-runtime-triage' },
    });

    expect(triage.operatorSummary.totals.incidents).toBe(1);
    expect(triage.intervention.actions).toEqual(
      expect.arrayContaining(['branch_from_failure_checkpoint', 'quarantine_candidate'])
    );
    expect(triage.checklist).toHaveLength(3);
    expect(triage.context.scope).toBe('cross-runtime-triage');
  });

  test('GovernanceRecordLedger records and summarizes long-horizon governance entries', () => {
    const ledger = new GovernanceRecordLedger();

    ledger.record({ surface: 'policy', action: 'promote', correlationId: 'change-1' });
    ledger.record({ surface: 'learning', action: 'approve_change', correlationId: 'change-1' });
    ledger.record({ surface: 'rollback', action: 'rollback_rollout', correlationId: 'change-1' });

    expect(ledger.list({ correlationId: 'change-1' })).toHaveLength(3);
    expect(ledger.summarize()).toMatchObject({
      total: 3,
      bySurface: expect.objectContaining({ policy: 1, learning: 1, rollback: 1 }),
    });
  });

  test('AuditStitcher stitches replay, rollout, and rollback events into one chain', () => {
    const ledger = new GovernanceRecordLedger({
      records: [
        { id: '1', timestamp: '2026-01-01T00:00:00.000Z', surface: 'replay', action: 'partial_replay', correlationId: 'change-1' },
        { id: '2', timestamp: '2026-01-01T00:01:00.000Z', surface: 'rollout', action: 'start_canary', correlationId: 'change-1' },
        { id: '3', timestamp: '2026-01-01T00:02:00.000Z', surface: 'rollback', action: 'rollback_rollout', correlationId: 'change-1' },
      ],
    });

    const stitched = new AuditStitcher({ ledger }).stitch({ correlationId: 'change-1' });

    expect(stitched.records).toHaveLength(3);
    expect(stitched.surfaces).toEqual(expect.arrayContaining(['replay', 'rollout', 'rollback']));
    expect(stitched.links).toHaveLength(2);
  });

  test('GovernanceTimeline builds operator-facing change timelines', () => {
    const ledger = new GovernanceRecordLedger({
      records: [
        {
          id: '1',
          timestamp: '2026-01-01T00:00:00.000Z',
          surface: 'policy',
          action: 'promote',
          correlationId: 'change-1',
          summary: 'Promoted the runtime policy pack.',
          status: 'completed',
        },
        {
          id: '2',
          timestamp: '2026-01-01T00:02:00.000Z',
          surface: 'rollback',
          action: 'rollback_rollout',
          correlationId: 'change-1',
          summary: 'Rolled back the canary.',
          status: 'completed',
        },
      ],
    });

    const timeline = new GovernanceTimeline({ ledger }).build({ correlationId: 'change-1' });

    expect(timeline.entries).toHaveLength(2);
    expect(new GovernanceTimeline({ ledger }).render(timeline)).toContain('policy:promote');
    expect(new GovernanceTimeline({ ledger }).render(timeline)).toContain('rollback:rollback_rollout');
  });

  test('OperatorDashboardSnapshot builds dashboard panels and governance timeline', () => {
    const dashboard = new OperatorDashboardSnapshot({
      timeline: new GovernanceTimeline({
        ledger: new GovernanceRecordLedger({
          records: [
            {
              id: '1',
              timestamp: '2026-01-01T00:00:00.000Z',
              surface: 'rollout',
              action: 'start_canary',
              correlationId: 'dashboard-1',
            },
          ],
        }),
      }),
    }).build({
      runs: [{ status: 'failed' }],
      incidents: [{ id: 'incident-1' }],
      governance: { correlationId: 'dashboard-1' },
    });

    expect(dashboard.panels.runs).toBe(1);
    expect(dashboard.governanceTimeline.entries).toHaveLength(1);
  });

  test('OperatorControlLoop composes dashboard and triage output', () => {
    const loop = new OperatorControlLoop().run({
      runs: [{ status: 'failed' }],
      incidents: [{ id: 'incident-1' }],
      rollouts: [{ action: 'rollback_recommended' }],
      learnedChanges: [{ id: 'change-1', status: 'pending_review' }],
      assuranceReports: [{ verdict: 'block' }],
      primaryIncident: { recommendedAction: 'branch_from_failure_checkpoint' },
      primaryAssurance: { verdict: 'block' },
      primaryRollback: { action: 'rollback_recommended' },
      governance: { correlationId: 'dashboard-1' },
    });

    expect(loop.dashboard.summary.totals.incidents).toBe(1);
    expect(loop.triage.intervention.actions).toEqual(
      expect.arrayContaining(['branch_from_failure_checkpoint', 'quarantine_candidate'])
    );
    expect(loop.nextActions).toEqual(
      expect.arrayContaining(['review_dashboard', 'confirm_intervention', 'record_governance_decision'])
    );
  });

  test('ImprovementActionPlanner turns proposals into concrete plans and compares learned artifacts', () => {
    const planner = new ImprovementActionPlanner();
    const left = new LearnedAdaptationArtifact({
      proposal: {
        id: 'proposal-left',
        category: 'evaluation',
        changeType: 'routing_adjustment',
        targetSurface: 'routing',
        recommendedChange: {
          summary: 'Tighten retrieval thresholds.',
          actions: ['Tighten retrieval thresholds.', 'Raise verifier bar for uncertain runs.'],
        },
        rollback: {
          action: 'restore_prior_configuration',
          reason: 'undo',
        },
      },
    });
    const right = new LearnedAdaptationArtifact({
      proposal: {
        id: 'proposal-right',
        category: 'incident',
        changeType: 'incident_driven_adjustment',
        targetSurface: 'policy',
        recommendedChange: {
          summary: 'Tighten approval policy.',
          actions: ['Require approval for the failing path.'],
        },
        rollback: {
          action: 'restore_prior_incident_policy',
          reason: 'undo incident change',
        },
      },
    });

    const plan = planner.buildPlan(left);
    const comparison = planner.compareArtifacts(left, right);

    expect(plan).toEqual(
      expect.objectContaining({
        proposalId: 'proposal-left',
        actionTarget: 'routing_policy',
        steps: expect.arrayContaining([
          expect.objectContaining({ type: 'review' }),
          expect.objectContaining({ type: 'apply' }),
        ]),
        rollback: expect.objectContaining({
          action: 'restore_prior_configuration',
        }),
      })
    );
    expect(comparison).toEqual(
      expect.objectContaining({
        changed: true,
        diff: expect.objectContaining({
          recommendationChanged: true,
        }),
      })
    );
  });

  test('GovernedImprovementLoop routes learned proposals through adaptive governance review', async () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(
      new Run({
        input: 'risky release summary',
        status: 'failed',
        pendingApproval: { toolName: 'send_status_update' },
        state: {
          assessment: {
            confidence: 0.41,
            evidenceConflicts: 1,
          },
          selfVerification: {
            action: 'require_approval',
          },
        },
      })
    );
    learningLoop.recordEvaluation({
      total: 1,
      passed: 0,
      failed: 1,
      results: [
        {
          id: 'routing-regression',
          passed: false,
          category: 'routing',
          error: 'retrieval grounding failed',
        },
      ],
    });

    const loop = new GovernedImprovementLoop({
      proposalEngine: new ImprovementProposalEngine({ learningLoop }),
      ledger: new AdaptiveDecisionLedger(),
      governanceGate: {
        approvalInbox: new ApprovalInbox(),
      },
    });

    const review = await loop.review();

    expect(review).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        reviews: expect.arrayContaining([
          expect.objectContaining({
            artifact: expect.objectContaining({
              format: 'agnostic-agents-learned-adaptation',
            }),
            review: expect.objectContaining({
              action: expect.stringMatching(/allow|require_approval/),
            }),
          }),
        ]),
        ledger: expect.objectContaining({
          total: expect.any(Number),
        }),
      })
    );
  });

  test('AdaptationPolicyEnvelope bounds learned changes and ImprovementEffectTracker measures outcomes', async () => {
    const envelope = new AdaptationPolicyEnvelope({
      allowedTargetSurfaces: ['routing'],
      deniedChangeTypes: ['policy_adjustment'],
      maxPriority: 'high',
    });
    const loop = new GovernedImprovementLoop({
      proposalEngine: {
        buildProposals: () => [
          {
            id: 'routing-ok',
            category: 'evaluation',
            priority: 'high',
            changeType: 'routing_adjustment',
            targetSurface: 'routing',
            rationale: 'Safe routing change',
            evidence: {},
            recommendedChange: { summary: 'Adjust route', actions: ['adjust route'] },
            rollback: { action: 'restore_prior_configuration', reason: 'undo' },
          },
          {
            id: 'policy-denied',
            category: 'governance',
            priority: 'high',
            changeType: 'policy_adjustment',
            targetSurface: 'policy',
            rationale: 'Unsafe direct policy change',
            evidence: {},
            recommendedChange: { summary: 'Adjust policy', actions: ['adjust policy'] },
            rollback: { action: 'restore_prior_configuration', reason: 'undo' },
          },
        ],
      },
      adaptationEnvelope: envelope,
      governanceGate: {
        approvalInbox: new ApprovalInbox(),
      },
    });

    const review = await loop.review();
    const denied = review.reviews.find(item => item.artifact.proposal.id === 'policy-denied');
    const allowed = review.reviews.find(item => item.artifact.proposal.id === 'routing-ok');
    const effect = loop.recordOutcome({
      proposalId: 'routing-ok',
      baseline: { averageConfidence: 0.45, failedEvaluations: 2 },
      outcome: { averageConfidence: 0.73, failedEvaluations: 0 },
      summary: 'Routing stabilized after approval.',
    });

    expect(denied.review.action).toBe('deny');
    expect(denied.review.decision.reason).toContain('not listed in the approved adaptation envelope');
    expect(allowed.review.envelope.action).toBe('require_approval');
    expect(effect.delta).toEqual(
      expect.objectContaining({
        improved: true,
        regressed: false,
      })
    );
    expect(loop.summarizeEffects()).toEqual(
      expect.objectContaining({
        total: 1,
        improved: 1,
      })
    );
    expect(new ImprovementEffectTracker().explain(effect)).toEqual(
      expect.objectContaining({
        proposalId: 'routing-ok',
        improved: true,
      })
    );
    expect(loop.buildActionPlans()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionTarget: expect.any(String),
          steps: expect.any(Array),
        }),
      ])
    );
  });

  test('LearningBenchmarkSuite and AdaptationRegressionGuard measure improvement outcomes safely', async () => {
    const effectTracker = new ImprovementEffectTracker();
    effectTracker.record({
      proposalId: 'safe-improvement',
      baseline: { averageConfidence: 0.42, failedEvaluations: 2 },
      outcome: { averageConfidence: 0.71, failedEvaluations: 0 },
      summary: 'Improved retrieval and reduced failures.',
    });
    effectTracker.record({
      proposalId: 'risky-improvement',
      baseline: { averageConfidence: 0.68, failedEvaluations: 0 },
      outcome: { averageConfidence: 0.52, failedEvaluations: 1 },
      summary: 'Regression after overly aggressive routing change.',
    });

    const suite = new LearningBenchmarkSuite({
      effectTracker,
      scenarios: [
        {
          id: 'at-least-one-improvement',
          run: async () => effectTracker.summarize(),
          assert: async summary => summary.improved >= 1,
        },
      ],
    });
    const report = await suite.run();
    const guard = new AdaptationRegressionGuard({
      effectTracker,
      maxRegressions: 0,
      minConfidenceDelta: -0.05,
      maxFailureDelta: 0,
    });
    const decision = guard.evaluate();

    expect(report).toEqual(
      expect.objectContaining({
        total: 3,
        failed: 0,
      })
    );
    expect(decision).toEqual(
      expect.objectContaining({
        action: 'halt_adaptation',
        regressions: expect.arrayContaining([
          expect.objectContaining({
            proposalId: 'risky-improvement',
          }),
        ]),
      })
    );
  });

  test('GovernanceHooks dispatches named governance events', async () => {
    const seen = [];
    const hooks = new GovernanceHooks({
      onApprovalRequested: async payload => {
        seen.push(`approval:${payload.runId}`);
      },
      onEvent: async type => {
        seen.push(`event:${type}`);
      },
    });

    await hooks.dispatch('approval_requested', { runId: 'run-1' }, {});
    expect(seen).toEqual(['approval:run-1', 'event:approval_requested']);
  });

  test('WebhookGovernanceAdapter forwards governance events through its transport', async () => {
    const requests = [];
    const adapter = new WebhookGovernanceAdapter({
      endpoint: 'https://control-plane.example/governance',
      transport: async request => {
        requests.push(request);
        return { ok: true };
      },
      headers: { 'x-control-plane': 'demo' },
    });

    const hooks = new GovernanceHooks(adapter.asHooks());
    await hooks.dispatch('approval_requested', { runId: 'run-1' }, { actor: 'agent-service' });

    expect(requests).toEqual([
      expect.objectContaining({
        url: 'https://control-plane.example/governance',
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-control-plane': 'demo',
        }),
        body: {
          type: 'approval_requested',
          payload: { runId: 'run-1' },
          context: { actor: 'agent-service' },
        },
      }),
    ]);
  });

  test('WebhookEventSink forwards selected runtime events', async () => {
    const requests = [];
    const sink = new WebhookEventSink({
      endpoint: 'https://control-plane.example/events',
      eventTypes: ['run_completed'],
      transport: async request => {
        requests.push(request);
        return { ok: true };
      },
    });
    const run = new Run({ id: 'run-1', input: 'done' });
    run.setStatus('completed');

    await sink.handleEvent({ type: 'model_response', payload: { ok: true } }, run);
    await sink.handleEvent({ type: 'run_completed', payload: { output: 'done' } }, run);

    expect(requests).toEqual([
      expect.objectContaining({
        url: 'https://control-plane.example/events',
        body: {
          event: { type: 'run_completed', payload: { output: 'done' } },
          run: {
            id: 'run-1',
            status: 'completed',
            metadata: run.metadata,
          },
        },
      }),
    ]);
  });

  test('ExtensionHost aggregates contributions and extends runtime surfaces', async () => {
    const sinkEvents = [];
    const governanceEvents = [];
    const host = new ExtensionHost({
      extensions: [
        {
          name: 'audit-pack',
          contributes: {
            eventSinks: [
              {
                handleEvent: async event => {
                  sinkEvents.push(event.type);
                },
              },
            ],
            governanceHooks: [
              async type => {
                governanceEvents.push(type);
              },
            ],
            policyRules: [
              {
                id: 'block-delete',
                toolNames: ['delete_records'],
                action: 'deny',
                reason: 'blocked',
              },
            ],
            evalScenarios: [{ id: 'scenario-1' }],
          },
        },
      ],
    });

    const eventBus = host.extendEventBus();
    await eventBus.emit({ type: 'run_started' }, null);

    const hooks = host.extendGovernanceHooks();
    await hooks.dispatch('approval_requested', { runId: 'run-1' }, {});

    const policy = host.extendToolPolicy();
    const tool = new Tool({
      name: 'delete_records',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });

    expect(host.listExtensions()).toEqual([
      expect.objectContaining({ name: 'audit-pack' }),
    ]);
    expect(host.getEvalScenarios()).toEqual([{ id: 'scenario-1' }]);
    expect(policy.evaluate(tool, {})).toEqual(
      expect.objectContaining({
        action: 'deny',
        ruleId: 'block-delete',
      })
    );
    expect(sinkEvents).toEqual(['run_started']);
    expect(governanceEvents).toEqual(['approval_requested']);
  });

  test('ExecutionGraph builds dependency edges from workflows', () => {
    const workflow = new Workflow({
      id: 'graph-flow',
      steps: [
        { id: 'a', run: async () => 'a' },
        { id: 'b', dependsOn: ['a'], run: async () => 'b' },
      ],
    });

    const graph = workflow.toExecutionGraph();
    expect(graph).toBeInstanceOf(ExecutionGraph);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'a', to: 'b', type: 'depends_on' }),
      ])
    );
  });

  test('WorkflowRunner can be constructed from plain workflow config', () => {
    const runner = new WorkflowRunner({
      workflow: {
        id: 'sample',
        steps: [{ id: 'first', run: async () => 'done' }],
      },
    });

    expect(runner.workflow.id).toBe('sample');
    expect(runner.workflow.steps[0].id).toBe('first');
  });

  test('AgentWorkflowStep requires an agent', () => {
    expect(
      () =>
        new AgentWorkflowStep({
          id: 'missing-agent',
          prompt: 'hello',
        })
    ).toThrow('requires an agent');
  });

  test('ToolValidator rejects malformed schemas', () => {
    const validator = new ToolValidator();
    const malformedTool = {
      name: 'broken',
      parameters: {
        type: 'not-a-real-json-schema-type',
      },
    };

    expect(() => validator.validate(malformedTool, {})).toThrow();
  });

  test('Memory supports layered memory, semantic lookup, and clearing', async () => {
    const adapter = {
      embedChunks: jest.fn()
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }]),
    };
    const vectorStore = {
      upsert: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        matches: [{ id: 'fact-1', metadata: { fact: 'Lisbon is sunny', source: 'weather-db' }, score: 0.99 }],
      }),
      deleteAll: jest.fn().mockResolvedValue(undefined),
    };

    const memory = new Memory({ adapter, vectorStore });
    memory.storeConversation('hello', 'world');
    memory.setEntity('City', 'Lisbon');
    memory.setWorkingMemory('active_task', 'review roadmap');
    memory.setPolicy('approval_required', 'delete_customer_data');

    expect(memory.getContext()).toContain('User: hello');
    expect(memory.getEntity('city')).toBe('Lisbon');
    expect(memory.getProfile('city')).toBe('Lisbon');
    expect(memory.getWorkingMemory('active_task')).toBe('review roadmap');
    expect(memory.getPolicy('approval_required')).toBe('delete_customer_data');
    expect(memory.listWorkingMemory()).toEqual([
      expect.objectContaining({ key: 'active_task', value: 'review roadmap' }),
    ]);
    expect(memory.listPolicies()).toEqual([
      expect.objectContaining({ key: 'approval_required', value: 'delete_customer_data' }),
    ]);

    await memory.storeSemanticMemory('Lisbon is sunny');
    await expect(memory.searchSemanticMemory('weather')).resolves.toBe('Lisbon is sunny');
    await expect(memory.searchSemanticMemoryWithProvenance('weather')).resolves.toEqual([
      expect.objectContaining({
        id: 'fact-1',
        fact: 'Lisbon is sunny',
        metadata: expect.objectContaining({ source: 'weather-db' }),
      }),
    ]);
    await expect(memory.searchAll('weather')).resolves.toEqual([{ fact: 'Lisbon is sunny', score: 0.99 }]);
    await memory.clearAll();
    expect(memory.conversation).toEqual([]);
    expect(memory.entities).toEqual({});
    expect(memory.listWorkingMemory()).toEqual([]);
    expect(memory.listPolicies()).toEqual([]);
    expect(vectorStore.deleteAll).toHaveBeenCalled();
  });

  test('Memory governance records provenance, blocks reads by trust zone, resolves conflicts, and enforces retention', async () => {
    const memory = new Memory({
      governance: {
        provenanceLedger: new MemoryProvenanceLedger(),
        retentionPolicy: new MemoryRetentionPolicy({
          layerRules: {
            working: { maxAgeMs: 5 },
          },
        }),
        accessController: new MemoryAccessController({
          rules: [
            {
              action: 'read',
              layer: 'policy',
              trustZone: 'public',
              effect: 'deny',
              reason: 'policy_memory_is_private',
            },
          ],
        }),
        conflictResolver: new MemoryConflictResolver({
          trustScores: {
            trusted_system: 0.9,
            import: 0.2,
          },
        }),
      },
    });

    await memory.setWorkingMemory('current_task', 'prepare release', {
      metadata: { source: 'trusted_system' },
      context: { actor: 'runtime', trustZone: 'internal' },
    });
    await memory.setPolicy('rollout_policy', 'require approval', {
      metadata: { source: 'trusted_system' },
      context: { actor: 'governance', trustZone: 'internal' },
    });
    await memory.setProfile('owner', 'Paulo', {
      metadata: { source: 'trusted_system' },
      context: { actor: 'sync', trustZone: 'internal' },
    });
    await memory.setProfile('owner', 'Unknown', {
      metadata: { source: 'import' },
      context: { actor: 'importer', trustZone: 'internal' },
    });

    expect(memory.getProfile('owner')).toBe('Paulo');
    expect(
      memory.getPolicy('rollout_policy', { actor: 'dashboard', trustZone: 'public' })
    ).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 10));
    memory.enforceRetention();
    expect(memory.getWorkingMemory('current_task')).toBeNull();

    const audit = memory.getMemoryAudit();
    expect(audit.some(entry => entry.type === 'write')).toBe(true);
    expect(audit.some(entry => entry.type === 'read_blocked')).toBe(true);
    expect(audit.some(entry => entry.type === 'conflict_detected')).toBe(true);
    expect(audit.some(entry => entry.type === 'retention')).toBe(true);
  });

  test('Memory audit, benchmark, diagnostics, and review workflow summarize governed memory behavior', async () => {
    const memory = new Memory({
      governance: {
        provenanceLedger: new MemoryProvenanceLedger(),
        accessController: new MemoryAccessController({
          rules: [
            { action: 'read', layer: 'policy', trustZone: 'public', effect: 'deny', reason: 'private_policy' },
          ],
        }),
      },
    });

    await memory.setWorkingMemory('active_task', 'review memory', {
      metadata: { source: 'runtime' },
      context: { actor: 'runtime', trustZone: 'internal' },
    });
    await memory.setPolicy('rollout_policy', 'require approval', {
      metadata: { source: 'governance' },
      context: { actor: 'governance', trustZone: 'internal' },
    });
    memory.getPolicy('rollout_policy', { actor: 'dashboard', trustZone: 'public' });

    const accessContracts = new MemoryAccessContractRegistry();
    const stateBundle = new StateBundle({
      memory: memory.exportGovernedState({ accessContracts }).layers,
      memoryGovernance: memory.exportGovernedState({ accessContracts }).governance,
    }).toJSON();
    const audit = memory.getMemoryAudit();

    const auditSummary = new MemoryAuditView().build({ audit });
    expect(auditSummary.blocked).toBe(1);

    const benchmarkReport = await new MemoryGovernanceBenchmarkSuite().run({
      audit,
      stateBundle,
    });
    expect(benchmarkReport.failed).toBe(0);

    const diagnostics = new MemoryGovernanceDiagnostics().summarize({
      auditView: auditSummary,
      benchmarkReport,
      stateSummary: stateBundle.summary,
    });
    expect(diagnostics.flags).toEqual(expect.arrayContaining(['memory_access_blocked']));

    const review = new MemoryGovernanceReviewWorkflow().run({
      audit,
      benchmarkReport,
      stateSummary: stateBundle.summary,
    });
    expect(review.checklist).toHaveLength(5);
    expect(review.diagnostics.flags).toEqual(expect.arrayContaining(['memory_access_blocked']));
  });

  test('Memory supports backend hydration and compaction policies', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-store-'));
    const workingStore = new FileLayerStore({ filePath: path.join(tmpDir, 'working.json') });
    const profileStore = new InMemoryLayerStore();
    const policyStore = new InMemoryLayerStore();

    const memory = new Memory({
      stores: {
        working: workingStore,
        profile: profileStore,
        policy: policyStore,
      },
      policies: {
        conversationLimit: 1,
        workingLimit: 1,
      },
    });

    memory.storeConversation('u1', 'a1');
    memory.storeConversation('u2', 'a2');
    await memory.setWorkingMemory('task1', 'first');
    await memory.setWorkingMemory('task2', 'second');
    await memory.setProfile('role', 'manager');

    expect(memory.conversation).toHaveLength(1);
    expect(memory.getWorkingMemory('task1')).toBeNull();
    expect(memory.getWorkingMemory('task2')).toBe('second');

    const hydrated = await new Memory({
      stores: {
        working: workingStore,
        profile: profileStore,
        policy: policyStore,
      },
    }).hydrate();

    expect(hydrated.getWorkingMemory('task2')).toBe('second');
  });

  test('RetryManager retries until success', async () => {
    const retryManager = new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 });
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');

    await expect(retryManager.execute(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('RAG indexes, searches, queries, and deletes using the local store', async () => {
    const adapter = {
      embedChunks: jest.fn().mockResolvedValue([{ embedding: [1, 0, 0] }]),
      generateText: jest.fn().mockResolvedValue({ message: 'grounded answer' }),
    };
    const retriever = new VectorStoreRetriever({
      adapter,
      vectorStore: new LocalVectorStore(),
      topK: 5,
    });

    const rag = new RAG({
      adapter,
      vectorStore: retriever.vectorStore,
      retriever,
      chunkSize: 50,
      chunkOverlap: 10,
    });

    const insertedIds = await rag.index(['Lisbon is the capital of Portugal.']);
    expect(insertedIds).toHaveLength(1);

    const searchResults = await rag.search('Lisbon');
    expect(searchResults[0]).toContain('Lisbon');

    const provenance = await rag.searchWithProvenance('Lisbon');
    expect(provenance).toEqual(
      expect.objectContaining({
        query: 'Lisbon',
        matches: expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Lisbon'),
            score: expect.any(Number),
          }),
        ]),
      })
    );
    expect(provenance.matches[0]).toEqual(
      expect.objectContaining({
        normalizedScore: expect.any(Number),
      })
    );

    const reranked = await rag.searchWithProvenance('Lisbon', { rerank: 'lexical' });
    expect(reranked.matches[0]).toEqual(
      expect.objectContaining({
        rerankScore: expect.any(Number),
      })
    );

    const answer = await rag.query('What is Lisbon?');
    expect(answer).toEqual(
      expect.objectContaining({ message: 'grounded answer' })
    );
    expect(answer.retrieval).toEqual(
      expect.objectContaining({
        query: 'What is Lisbon?',
        matches: expect.any(Array),
      })
    );

    await expect(rag.delete({ ids: insertedIds })).resolves.toBeUndefined();
  });

  test('RAG chunking supports paragraph strategy and overlap', async () => {
    const rag = new RAG({
      adapter: { embedChunks: jest.fn() },
      retriever: { search: jest.fn() },
      chunkSize: 20,
      chunkOverlap: 5,
      chunkStrategy: 'paragraph',
    });

    const chunks = await rag.chunk('First paragraph.\n\nSecond paragraph is longer.', 20, {
      strategy: 'paragraph',
      overlap: 5,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain('First paragraph');
  });

  test('MCPClient delegates list/execute and converts discovered tools', async () => {
    const client = new MCPClient({ endpoint: 'ws://example.com' });
    client._send = jest.fn()
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } })
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } });

    await expect(client.listTools()).resolves.toHaveLength(1);
    await expect(client.execute('weather.search', { city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });

    const tools = await client.toTools();
    expect(tools[0].name).toBe('weather_search');
    await expect(tools[0].call({ city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });
  });

  test('OpenAPILoader builds tools from a JSON OpenAPI spec', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-loader-'));
    const specPath = path.join(tmpDir, 'spec.json');

    fs.writeFileSync(specPath, JSON.stringify({
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/weather/{city}': {
          get: {
            summary: 'Get weather',
            parameters: [
              { name: 'city', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { forecast: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const { tools } = OpenAPILoader.load(specPath, { serviceName: 'weather' });
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toContain('weather');
  });

  test('OpenAPILoader preserves path and header params without leaking path into query', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-loader-'));
    const specPath = path.join(tmpDir, 'spec.json');
    const axios = require('axios');
    const axiosSpy = jest.spyOn(axios, 'request').mockResolvedValue({
      status: 200,
      data: { ok: true },
    });

    fs.writeFileSync(specPath, JSON.stringify({
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/weather/{city}': {
          get: {
            summary: 'Get weather',
            parameters: [
              { name: 'city', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'unit', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'X-Trace-Id', in: 'header', required: false, schema: { type: 'string' } },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { forecast: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const { tools } = OpenAPILoader.load(specPath, { serviceName: 'weather' });
    await tools[0].call({ city: 'Lisbon', unit: 'metric', 'X-Trace-Id': 'trace-1' });

    expect(axiosSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/weather/Lisbon?unit=metric',
        headers: expect.objectContaining({ 'X-Trace-Id': 'trace-1' }),
      })
    );
    axiosSpy.mockRestore();
  });

  test('ApiLoader builds executable tools and routes params to fetch', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ forecast: 'sunny' }),
      text: async () => '',
    });

    const { tools } = ApiLoader.load({
      serviceName: 'weather',
      authToken: 'secret',
      apiSpec: {
        baseUrl: 'https://api.example.com',
        endpoints: {
          getWeather: {
            path: '/weather/{city}',
            method: 'GET',
            queryParams: {
              unit: { type: 'string' },
            },
            pathParams: {
              city: { type: 'string', required: true },
            },
            requiresAuth: true,
          },
        },
      },
    });

    const result = await tools[0].call({ city: 'Lisbon', unit: 'metric' });
    expect(result).toEqual({ status: 200, data: { forecast: 'sunny' } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/weather/Lisbon?unit=metric',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      })
    );
  });

  test('CurlLoader converts a curl command into an executable API tool', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ accepted: true }),
      text: async () => '',
    });

    const { tools } = CurlLoader.load(
      `curl -X POST 'https://api.example.com/messages?channel=ops' -H 'Authorization: Bearer token-123' -H 'X-Trace-Id: trace-9' -d '{"message":"hello"}'`,
      { serviceName: 'imported' }
    );

    const result = await tools[0].call({
      channel: 'ops',
      'X-Trace-Id': 'trace-9',
      message: 'hello',
    });

    expect(result).toEqual({ status: 200, data: { accepted: true } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/messages?channel=ops',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'X-Trace-Id': 'trace-9',
        }),
      })
    );
  });

  test('PostmanLoader converts a collection item into executable API tools', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ created: true }),
      text: async () => '',
    });

    const { tools } = PostmanLoader.load({
      variable: [{ key: 'baseUrl', value: 'https://api.example.com' }],
      item: [
        {
          name: 'CreateMessage',
          request: {
            method: 'POST',
            url: { raw: '{{baseUrl}}/messages?channel=ops' },
            body: {
              mode: 'raw',
              raw: JSON.stringify({ message: 'hello' }),
            },
          },
        },
      ],
    }, { serviceName: 'postman' });

    const result = await tools[0].call({ channel: 'ops', message: 'hello' });
    expect(result).toEqual({ status: 200, data: { created: true } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/messages?channel=ops',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('SecretResolver and SchemaNormalizer normalize runtime-facing config', () => {
    const resolver = new SecretResolver({
      env: { API_TOKEN: 'token-123' },
    });

    expect(
      resolver.resolve({ authorization: 'Bearer ${API_TOKEN}' })
    ).toEqual({ authorization: 'Bearer token-123' });

    expect(
      SchemaNormalizer.normalizeToolSchema({
        properties: {
          message: {},
        },
      })
    ).toEqual({
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '',
        },
      },
      required: [],
      description: '',
    });
  });

  test('ToolRecorder, ToolMockBuilder, and ToolSandboxRunner support replayable tool workflows', async () => {
    const baseTool = new Tool({
      name: 'send_update',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      implementation: async ({ message }) => ({ delivered: true, message }),
    });

    const recorder = new ToolRecorder();
    const recorded = recorder.wrap(baseTool);
    expect(await recorded.call({ message: 'hello' })).toEqual({ delivered: true, message: 'hello' });

    const mock = ToolMockBuilder.build({
      toolName: 'send_update',
      records: recorder.export().records,
    });
    expect(await mock.call({ message: 'hello' })).toEqual({ delivered: true, message: 'hello' });

    const sandbox = new ToolSandboxRunner({
      simulator: async (_tool, args) => ({ preview: true, args }),
    });
    expect(
      await sandbox.run(baseTool, { message: 'preview' }, { mode: 'simulate' })
    ).toEqual(
      expect.objectContaining({
        simulated: true,
        result: { preview: true, args: { message: 'preview' } },
      })
    );
  });

  test('PromptRegistry, RunRecipe, WorkflowPreset, IncidentBundleExporter, CredentialDelegationKit, and RoutePolicySimulator compose utility artifacts', async () => {
    const registry = new PromptRegistry();
    registry.register(new PromptArtifact({ id: 'ops-summary', content: 'Summarize ops.' }));
    expect(registry.get('ops-summary').content).toBe('Summarize ops.');

    const tool = new Tool({
      name: 'noop',
      implementation: async () => ({ ok: true }),
    });
    const recipe = new RunRecipe({ id: 'ops-recipe', tools: [tool] });
    expect(recipe.buildAgentOptions().tools).toHaveLength(1);

    const preset = new WorkflowPreset({ id: 'ops-workflow', defaults: { retries: 1 } });
    expect(preset.instantiate({ retries: 3 }).defaults.retries).toBe(3);

    const incidentBundle = new IncidentBundleExporter().export({
      assuranceReport: { summary: { verdict: 'allow' } },
    });
    expect(incidentBundle.kind).toBe('agnostic-agents/incident-bundle');

    const delegated = new CredentialDelegationKit().issue({
      principal: 'worker-a',
      scope: ['tool:send_update'],
    });
    expect(new CredentialDelegationKit().validate(delegated)).toEqual({ valid: true, reason: null });

    const router = new CapabilityRouter({
      candidates: [
        {
          id: 'cheap-model',
          kind: 'model',
          capabilities: ['summarization'],
          profile: {
            taskTypes: ['ops_summary'],
            costTier: 'low',
            riskTier: 'low',
            latencyTier: 'low',
          },
        },
      ],
    });
    const simulation = await new RoutePolicySimulator({ router }).simulate([
      {
        id: 'ops-summary',
        task: { taskType: 'ops_summary', requiredCapabilities: ['summarization'] },
      },
    ]);
    expect(simulation.summary.total).toBe(1);
    expect(simulation.scenarios[0].route.candidate.id).toBe('cheap-model');
  });

  test('MCPDiscoveryLoader preserves remote MCP tool names behind local prefixes', async () => {
    const { MCPClient } = require('../src/mcp/MCPClient');
    const listTools = jest.spyOn(MCPClient.prototype, 'listTools').mockResolvedValue([
      {
        name: 'search_docs',
        description: 'Search docs',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
        },
      },
    ]);
    const execute = jest.spyOn(MCPClient.prototype, 'execute').mockResolvedValue({ hits: 3 });

    const { tools } = await require('../src/tools/adapters/MCPDiscoveryLoader').MCPDiscoveryLoader.load({
      endpoint: 'wss://mcp.example.com',
      serviceName: 'docs',
    });

    await tools[0].call({ query: 'routing' });
    expect(tools[0].name).toBe('docs_search_docs');
    expect(execute).toHaveBeenCalledWith('search_docs', { query: 'routing' });
    listTools.mockRestore();
    execute.mockRestore();
  });
});
