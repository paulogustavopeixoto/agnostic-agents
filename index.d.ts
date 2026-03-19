export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ToolMetadata {
  sideEffectLevel?: string;
  executionPolicy?: string;
  verificationPolicy?: string;
  tags?: string[];
  [key: string]: JsonValue | undefined;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: JsonObject;
  metadata?: ToolMetadata;
  implementation?: (args: Record<string, any>, context?: any) => Promise<any> | any;
}

export class Tool {
  constructor(definition: ToolDefinition);
  name: string;
  description: string;
  parameters: JsonObject;
  metadata: ToolMetadata;
  implementation?: ToolDefinition['implementation'];
  call(args?: Record<string, any>, context?: any): Promise<any>;
  toUnifiedSchema(): JsonObject;
  toOpenAIFunction(): JsonObject;
  toAnthropicTool(): JsonObject;
}

export interface AgentOptions {
  tools?: Tool[] | any;
  memory?: Memory | null;
  defaultConfig?: JsonObject;
  description?: string;
  rag?: RAG | null;
  retryManager?: RetryManager;
  mcpClient?: MCPClient | null;
  askUser?: ((prompt: string, context?: any) => Promise<any> | any) | null;
  runStore?: BaseRunStore | null;
  toolPolicy?: ToolPolicy | JsonObject | null;
  authContext?: JsonObject | null;
  resolveToolAuth?: ((tool: Tool, runtime?: JsonObject) => Promise<JsonObject> | JsonObject) | null;
  executionIdentity?: JsonObject | null;
  onEvent?: ((event: JsonObject, run: Run) => Promise<void> | void) | null;
  eventBus?: EventBus | JsonObject | null;
  debug?: boolean;
  verifier?: any;
  approvalInbox?: ApprovalInbox | null;
  governanceHooks?: GovernanceHooks | JsonObject | null;
  extensionHost?: ExtensionHost | any[] | null;
}

export class Agent {
  constructor(adapter: any, options?: AgentOptions);
  adapter: any;
  tools: Tool[];
  run(input: string, config?: JsonObject): Promise<Run>;
  sendMessage(input: string, config?: JsonObject): Promise<any>;
  resumeRun(runId: string, options?: JsonObject): Promise<Run>;
  pauseRun(runId: string, options?: JsonObject): Promise<Run>;
  cancelRun(runId: string, options?: JsonObject): Promise<Run>;
  branchRun(runId: string, options?: JsonObject): Promise<Run>;
  createDistributedEnvelope(runId: string, options?: JsonObject): Promise<JsonObject>;
  continueDistributedRun(envelope: JsonObject, config?: JsonObject): Promise<Run>;
  replayRun(runId: string, options?: JsonObject): Promise<Run>;
}

export class CritiqueProtocol {
  constructor(options?: {
    reviewers?: Array<((candidate: JsonObject, context?: JsonObject) => Promise<JsonObject | JsonObject[]> | JsonObject | JsonObject[]) | any>;
    failureTypes?: string[];
    schemaRegistry?: CritiqueSchemaRegistry | JsonObject | null;
  });
  review(candidate?: JsonObject, context?: JsonObject): Promise<JsonObject>;
  normalizeCritique(critique?: JsonObject, candidate?: JsonObject, context?: JsonObject, reviewer?: any): JsonObject;
  summarize(critiques?: JsonObject[]): JsonObject;
}

export class CritiqueSchemaRegistry {
  constructor(options?: {
    schemas?: JsonObject[] | Record<string, JsonObject>;
  });
  register(taskFamily: string, schema?: JsonObject): JsonObject;
  resolve(candidateOrTaskFamily?: string | JsonObject | null, context?: JsonObject): JsonObject | null;
  list(): JsonObject[];
}

export class TrustRegistry {
  constructor(options?: { records?: JsonObject[] });
  recordOutcome(outcome?: JsonObject): JsonObject;
  getScore(actorId: string, options?: { domain?: string | null }): number;
  rankActors(actorIds?: string[], options?: { domain?: string | null }): JsonObject[];
  summarize(): JsonObject;
}

export class DisagreementResolver {
  constructor(options?: {
    trustRegistry?: TrustRegistry | JsonObject | null;
    escalateOnDisagreement?: boolean;
  });
  resolve(critiques?: JsonObject[], context?: JsonObject): JsonObject;
}

export class CoordinationLoop {
  constructor(options?: {
    critiqueProtocol?: CritiqueProtocol | JsonObject | null;
    trustRegistry?: TrustRegistry | JsonObject | null;
    disagreementResolver?: DisagreementResolver | JsonObject | null;
    handlers?: Record<string, (payload: JsonObject) => Promise<JsonObject> | JsonObject>;
    history?: JsonObject[];
  });
  coordinate(candidate?: JsonObject, context?: JsonObject): Promise<JsonObject>;
  listHistory(): JsonObject[];
}

export class DecompositionAdvisor {
  constructor(options?: {
    delegateComplexityThreshold?: number;
    splitComplexityThreshold?: number;
    escalateRiskThreshold?: number;
  });
  recommend(task?: JsonObject, options?: { availableDelegates?: JsonObject[] }): JsonObject;
  rankDelegates(task?: JsonObject, delegates?: JsonObject[]): JsonObject[];
}

export class CoordinationBenchmarkSuite {
  constructor(options?: {
    critiqueProtocol?: CritiqueProtocol | JsonObject | null;
    disagreementResolver?: DisagreementResolver | JsonObject | null;
    coordinationLoop?: CoordinationLoop | JsonObject | null;
    decompositionAdvisor?: DecompositionAdvisor | JsonObject | null;
    evalHarness?: EvalHarness | JsonObject | null;
  });
  buildScenarios(options?: JsonObject): JsonObject[];
  run(options?: JsonObject): Promise<JsonObject>;
}

export class CoordinationRoleContract {
  constructor(options?: {
    id?: string | null;
    role?: string;
    capabilities?: string[];
    responsibilities?: string[];
    trustDomain?: string | null;
    reviewMode?: string;
    metadata?: JsonObject;
  });
  id: string;
  role: string;
  capabilities: string[];
  responsibilities: string[];
  trustDomain: string | null;
  reviewMode: string;
  metadata: JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): CoordinationRoleContract;
  static readonly DEFAULT_ROLES: string[];
}

export class CoordinationTrace {
  static fromPlan(plan?: JsonObject, options?: { task?: JsonObject; context?: JsonObject }): JsonObject;
  static render(trace?: JsonObject): string;
}

export class RoleAwareCoordinationPlanner {
  constructor(options?: {
    trustRegistry?: TrustRegistry | JsonObject | null;
    decompositionAdvisor?: DecompositionAdvisor | JsonObject | null;
    roleContracts?: Array<CoordinationRoleContract | JsonObject>;
  });
  trustRegistry: TrustRegistry;
  decompositionAdvisor: DecompositionAdvisor;
  roleContracts: CoordinationRoleContract[];
  plan(task?: JsonObject, options?: { actors?: JsonObject[]; context?: JsonObject }): JsonObject;
  getRoleContract(role: string, task?: JsonObject): JsonObject;
}

export class PolicyPack {
  constructor(options?: {
    id?: string | null;
    name?: string;
    version?: string | null;
    description?: string;
    defaultAction?: 'allow' | 'deny' | 'require_approval';
    rules?: JsonObject[];
    allowTools?: string[] | string | null;
    denyTools?: string[] | string | null;
    metadata?: JsonObject;
  });
  id: string | null;
  name: string;
  version: string | null;
  description: string;
  defaultAction: string;
  rules: JsonObject[];
  allowTools: string[] | null;
  denyTools: string[] | null;
  metadata: JsonObject;
  toJSON(): JsonObject;
  toToolPolicy(options?: JsonObject): ToolPolicy;
  diff(otherPolicyPack?: PolicyPack | JsonObject): JsonObject;
  static fromJSON(payload?: JsonObject): PolicyPack;
  static fromToolPolicy(toolPolicy?: ToolPolicy | JsonObject, metadata?: JsonObject): PolicyPack;
}

export class PolicyDecisionReport {
  constructor(options?: {
    mode?: string;
    policyPack?: JsonObject | null;
    decisions?: JsonObject[];
    metadata?: JsonObject;
  });
  summarize(): JsonObject;
  explain(): JsonObject;
  toJSON(): JsonObject;
}

export class PolicyEvaluationRecord {
  constructor(options?: {
    subject?: JsonObject;
    report?: JsonObject | null;
    metadata?: JsonObject;
  });
  summarize(): JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): PolicyEvaluationRecord;
}

export class PolicySimulator {
  constructor(options?: {
    policyPack?: PolicyPack | JsonObject | null;
    toolPolicy?: ToolPolicy | JsonObject | null;
  });
  simulateRequest(tool?: JsonObject, args?: JsonObject, context?: JsonObject): JsonObject;
  simulateRequests(requests?: JsonObject[], context?: JsonObject): PolicyDecisionReport;
  simulateRun(run?: Run | JsonObject, options?: { toolsByName?: Record<string, any> }): PolicyDecisionReport;
  simulateTraceBundle(bundle?: JsonObject, options?: { toolsByName?: Record<string, any> }): JsonObject;
  createEvaluationRecord(subject?: JsonObject, report?: PolicyDecisionReport | JsonObject): PolicyEvaluationRecord;
}

export class PolicyScopeResolver {
  static DEFAULT_PRECEDENCE: string[];
  constructor(options?: {
    precedence?: string[];
    metadata?: JsonObject;
  });
  precedence: string[];
  metadata: JsonObject;
  resolve(scopes?: Record<string, PolicyPack | JsonObject | null>): PolicyPack;
  resolveToolPolicy(
    scopes?: Record<string, PolicyPack | JsonObject | null>,
    options?: JsonObject
  ): ToolPolicy;
}

export class CoordinationPolicyGate {
  constructor(options?: {
    policyPack?: PolicyPack | JsonObject | null;
    toolPolicy?: ToolPolicy | JsonObject | null;
    policyScopeResolver?: PolicyScopeResolver | JsonObject | null;
    scopes?: Record<string, PolicyPack | JsonObject | null> | null;
    escalationAction?: string;
    actionMetadata?: Record<string, JsonObject>;
  });
  policyPack: PolicyPack;
  simulator: PolicySimulator;
  escalationAction: string;
  actionMetadata: Record<string, JsonObject>;
  evaluate(
    resolution?: JsonObject,
    options?: {
      candidate?: JsonObject;
      review?: JsonObject | null;
      context?: JsonObject;
    }
  ): JsonObject;
  createEvaluationRecord(
    resolution?: JsonObject,
    options?: {
      candidate?: JsonObject;
      review?: JsonObject | null;
      context?: JsonObject;
    }
  ): PolicyEvaluationRecord;
}

export class PolicyLifecycleManager {
  constructor(options?: {
    draft?: PolicyPack | JsonObject | null;
    active?: PolicyPack | JsonObject | null;
    history?: JsonObject[];
  });
  draft: PolicyPack | null;
  active: PolicyPack | null;
  history: JsonObject[];
  setDraft(policyPack?: PolicyPack | JsonObject): PolicyPack;
  activate(policyPack?: PolicyPack | JsonObject, metadata?: JsonObject): JsonObject;
  promote(policyPack?: PolicyPack | JsonObject | null, metadata?: JsonObject): JsonObject;
  rollback(options?: {
    version?: string | null;
    policyPackId?: string | null;
    reason?: string;
  }): JsonObject;
  summarize(): JsonObject;
}

export class ApprovalEscalationPolicySuite {
  constructor(options?: {
    policySimulator?: PolicySimulator | JsonObject | null;
    coordinationPolicyGate?: CoordinationPolicyGate | JsonObject | null;
    approvalScenarios?: JsonObject[];
    escalationScenarios?: JsonObject[];
  });
  approvalScenarios: JsonObject[];
  escalationScenarios: JsonObject[];
  buildScenarios(): JsonObject[];
  run(): Promise<JsonObject>;
}

export class RecoveryPolicyGate {
  constructor(options?: {
    policyPack?: PolicyPack | JsonObject | null;
    toolPolicy?: ToolPolicy | JsonObject | null;
    policyScopeResolver?: PolicyScopeResolver | JsonObject | null;
    scopes?: Record<string, PolicyPack | JsonObject | null> | null;
    defaultBlockedAction?: string;
    actionMetadata?: Record<string, JsonObject>;
  });
  policyPack: PolicyPack;
  simulator: PolicySimulator;
  defaultBlockedAction: string;
  actionMetadata: Record<string, JsonObject>;
  evaluateStep(step?: JsonObject, plan?: JsonObject, context?: JsonObject): JsonObject;
  evaluatePlan(plan?: JsonObject, context?: JsonObject): JsonObject;
  createEvaluationRecord(plan?: JsonObject, context?: JsonObject): PolicyEvaluationRecord;
}

export class CompensationPolicyPlanner {
  constructor(options?: {
    policyPack?: PolicyPack | JsonObject | null;
    toolPolicy?: ToolPolicy | JsonObject | null;
    policyScopeResolver?: PolicyScopeResolver | JsonObject | null;
    scopes?: Record<string, PolicyPack | JsonObject | null> | null;
    fallbackAction?: string;
    actionMetadata?: Record<string, JsonObject>;
  });
  policyPack: PolicyPack;
  simulator: PolicySimulator;
  fallbackAction: string;
  actionMetadata: Record<string, JsonObject>;
  plan(entries?: JsonObject[], context?: JsonObject): JsonObject;
  createEvaluationRecord(entries?: JsonObject[], context?: JsonObject): PolicyEvaluationRecord;
}

export class StateBundle {
  constructor(options?: {
    run?: Run | JsonObject | null;
    memory?: JsonObject | null;
    metadata?: JsonObject;
  });
  run: Run | null;
  memory: JsonObject | null;
  metadata: JsonObject;
  summarize(): JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): StateBundle;
  static SCHEMA_VERSION: string;
  static FORMAT: string;
}

export class StateDiff {
  static diff(left?: StateBundle | JsonObject, right?: StateBundle | JsonObject): JsonObject;
}

export class StateBundleSerializer {
  static export(options?: {
    run?: Run | JsonObject | null;
    memory?: JsonObject | null;
    metadata?: JsonObject;
  }): JsonObject;
  static import(payload?: JsonObject): StateBundle;
  static validate(payload?: JsonObject): { valid: boolean; errors: string[] };
}

export class StateContractRegistry {
  constructor(options?: {
    contracts?: Record<string, JsonObject>;
  });
  contracts: Record<string, JsonObject>;
  describe(name?: string): JsonObject | null;
}

export class StateIntegrityChecker {
  constructor(options?: {
    contractRegistry?: StateContractRegistry | JsonObject | null;
  });
  contractRegistry: StateContractRegistry;
  check(bundle?: StateBundle | JsonObject): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    contract: JsonObject | null;
    summary?: JsonObject;
  };
}

export class StateConsistencyChecker {
  check(bundle?: StateBundle | JsonObject): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: JsonObject;
  };
}

export class StateRestorePlanner {
  constructor(options?: {
    integrityChecker?: StateIntegrityChecker | JsonObject | null;
  });
  integrityChecker: StateIntegrityChecker;
  buildPlan(
    bundle?: StateBundle | JsonObject,
    options?: {
      sourceEnvironment?: string;
      targetEnvironment?: string;
    }
  ): JsonObject;
}

export class StateDurableRestoreSuite {
  constructor(options?: {
    restorePlanner?: StateRestorePlanner | JsonObject | null;
    consistencyChecker?: StateConsistencyChecker | JsonObject | null;
  });
  restorePlanner: StateRestorePlanner;
  consistencyChecker: StateConsistencyChecker;
  build(
    bundle?: StateBundle | JsonObject,
    options?: {
      sourceEnvironment?: string;
    }
  ): JsonObject;
}

export class StateIncidentReconstructor {
  constructor(options?: {
    integrityChecker?: StateIntegrityChecker | JsonObject | null;
  });
  integrityChecker: StateIntegrityChecker;
  reconstruct(bundle?: StateBundle | JsonObject): JsonObject;
}

export class ExtensionManifest {
  constructor(options?: {
    kind?: string;
    name?: string;
    version?: string | null;
    description?: string;
    contracts?: string[];
    capabilities?: string[];
    compatibility?: JsonObject;
    contributions?: JsonObject;
    metadata?: JsonObject;
  });
  kind: string;
  name: string;
  version: string | null;
  description: string;
  contracts: string[];
  capabilities: string[];
  compatibility: JsonObject;
  contributions: JsonObject;
  metadata: JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): ExtensionManifest;
  static validate(payload?: JsonObject): { valid: boolean; errors: string[] };
  static fromExtension(extension?: JsonObject): ExtensionManifest;
}

export class ToolSchemaArtifact {
  constructor(options?: {
    tool?: Tool | JsonObject | null;
    metadata?: JsonObject;
  });
  tool: Tool | null;
  schema: JsonObject | null;
  metadata: JsonObject;
  toJSON(): JsonObject;
  toTool(options: {
    implementation: (args: Record<string, any>, context?: any) => Promise<any> | any;
  }): Tool;
  static fromJSON(payload?: JsonObject): ToolSchemaArtifact;
  static readonly FORMAT: string;
  static readonly SCHEMA_VERSION: string;
}

export class InteropArtifactRegistry {
  export(type: string, value: any, metadata?: JsonObject): JsonObject;
  import(type: string, payload?: JsonObject): any;
}

export class ConformanceKit {
  validateManifest(manifest?: ExtensionManifest | JsonObject): { valid: boolean; errors: string[] };
  validateExtension(
    extension?: JsonObject,
    options?: {
      manifest?: ExtensionManifest | JsonObject | null;
    }
  ): { valid: boolean; errors: string[]; summary: JsonObject };
  validateStore(
    store: any,
    options?: {
      type?: string;
    }
  ): { valid: boolean; errors: string[]; summary: JsonObject };
  validateArtifact(
    artifact: any,
    options?: {
      type?: string;
    }
  ): { valid: boolean; errors: string[] };
}

export class EvalReportArtifact {
  constructor(options?: {
    report?: JsonObject | null;
    metadata?: JsonObject;
  });
  report: JsonObject | null;
  metadata: JsonObject;
  summarize(): JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): EvalReportArtifact;
  static fromReport(report?: JsonObject, metadata?: JsonObject): EvalReportArtifact;
}

export class ArtifactCompatibilitySuite {
  constructor(options?: {
    conformanceKit?: ConformanceKit | JsonObject | null;
  });
  conformanceKit: ConformanceKit;
  run(fixtures?: JsonObject): {
    total: number;
    passed: number;
    failed: number;
    checks: JsonObject[];
  };
}

export class InteropContractValidator {
  constructor(options?: {
    conformanceKit?: ConformanceKit | JsonObject | null;
  });
  conformanceKit: ConformanceKit;
  validateFile(
    filePath: string,
    options?: {
      type?: string;
    }
  ): { filePath: string; type: string; valid: boolean; errors: string[] };
  validateFiles(
    entries?: Array<{
      filePath: string;
      type: string;
    }>
  ): { total: number; passed: number; failed: number; results: JsonObject[] };
}

export class CertificationKit {
  certifyProvider(
    adapter: any,
    options?: {
      name?: string | null;
    }
  ): JsonObject;
  certifyStore(
    store: any,
    options?: {
      type?: string;
      name?: string | null;
    }
  ): JsonObject;
}

export class CompatibilitySummary {
  static build(entries?: JsonObject[]): JsonObject;
}

export interface RunMetrics {
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  timings: Record<string, number>;
  childRuns: {
    count: number;
    items: any[];
  };
  debug: Record<string, any>;
}

export interface RunSummary {
  id: string;
  status: string;
  input: any;
  output: any;
  events: number;
  steps: Array<{
    id: string;
    type: string;
    status: string;
    durationMs: number | null;
  }>;
  checkpoints: Array<{
    id: string;
    label: string;
    status: string;
  }>;
  metrics: RunMetrics;
  childRunAggregate: {
    count: number;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: number;
    timings: Record<string, number>;
  };
  lineage: any;
  assessment: any;
  evidence: any;
  pendingApproval: any;
  pendingPause: any;
  errors: any[];
}

export interface RunOptions {
  id?: string;
  input?: any;
  state?: Record<string, any>;
  messages?: any[];
  steps?: any[];
  toolCalls?: any[];
  toolResults?: any[];
  checkpoints?: any[];
  errors?: any[];
  events?: any[];
  timestamps?: Record<string, any>;
  status?: string;
  output?: any;
  pendingApproval?: any;
  pendingPause?: any;
  metrics?: Partial<RunMetrics>;
  metadata?: Record<string, any>;
}

export class Run {
  constructor(options?: RunOptions);
  id: string;
  input: any;
  state: Record<string, any>;
  messages: any[];
  steps: any[];
  toolCalls: any[];
  toolResults: any[];
  checkpoints: any[];
  errors: any[];
  events: any[];
  timestamps: Record<string, any>;
  status: string;
  output: any;
  pendingApproval: any;
  pendingPause: any;
  metrics: RunMetrics;
  metadata: Record<string, any>;
  setStatus(status: string): void;
  addMessage(message: any): void;
  addStep(step: any): any;
  updateStep(stepId: string, patch?: Record<string, any>): any;
  addToolCall(toolCall: any): void;
  addToolResult(toolResult: any): void;
  addError(error: any): void;
  addEvent(event: any): void;
  addCheckpoint(checkpoint: any): any;
  getCheckpoint(checkpointId?: string | null): any;
  createCheckpointSnapshot(): JsonObject;
  branchFromCheckpoint(checkpointId?: string | null, options?: JsonObject): Run;
  toJSON(): JsonObject;
  static fromJSON(payload?: Record<string, any>): Run;
}

export class RunInspector {
  static summarize(run: Run): RunSummary;
}

export class DistributedRunEnvelope {
  static readonly SCHEMA_VERSION: string;
  static readonly FORMAT: string;
  static create(run: Run | JsonObject, options?: JsonObject): JsonObject;
  static validate(envelope?: JsonObject): { valid: boolean; errors: string[] };
  static parse(envelope?: JsonObject): JsonObject;
}

export class ExecutionIdentity {
  static normalize(identity?: JsonObject | null): JsonObject | null;
  static annotateMetadata(metadata?: JsonObject, identity?: JsonObject | null): JsonObject;
}

export class TraceCorrelation {
  static fromRun(run: Run | JsonObject, metadata?: JsonObject): JsonObject;
  static fromEnvelope(envelope: JsonObject, metadata?: JsonObject): JsonObject;
  static annotateMetadata(metadata?: JsonObject, correlation?: JsonObject): JsonObject;
}

export class RunTreeInspector {
  static build(runStore: BaseRunStore, options?: { rootRunId?: string | null }): Promise<any>;
  static render(tree: any, options?: { includeStatus?: boolean }): string;
}

export class TraceDiffer {
  static diff(leftRun: Run | JsonObject, rightRun: Run | JsonObject): JsonObject;
}

export class TraceSerializer {
  static readonly SCHEMA_VERSION: string;
  static readonly RUN_FORMAT: string;
  static readonly BUNDLE_FORMAT: string;
  static describeSchema(): JsonObject;
  static exportRun(run: Run | JsonObject, metadata?: JsonObject): JsonObject;
  static importRun(trace?: JsonObject): Run;
  static exportPartialRun(
    run: Run | JsonObject,
    options?: { checkpointId?: string | null; metadata?: JsonObject }
  ): JsonObject;
  static exportBundle(runs?: Array<Run | JsonObject>, metadata?: JsonObject): JsonObject;
  static importBundle(bundle?: JsonObject): Run[];
  static validateTrace(
    trace?: JsonObject,
    options?: { allowBundle?: boolean }
  ): { valid: boolean; errors: string[]; warnings: string[] };
}

export class IncidentDebugger {
  constructor(options: { runStore: BaseRunStore });
  createReport(runId: string, options?: { compareToRunId?: string | null }): Promise<JsonObject>;
}

export class BranchQualityAnalyzer {
  constructor(options?: { runStore?: BaseRunStore });
  compare(baselineRun: Run | JsonObject, candidateRuns?: Array<Run | JsonObject>): JsonObject;
  analyzeFamily(rootRunId: string): Promise<JsonObject>;
}

export class DistributedRecoveryPlanner {
  constructor(options: { runStore: BaseRunStore });
  createPlan(runId: string, options?: { compareToRunId?: string | null }): Promise<JsonObject>;
}

export class DistributedRecoveryRunner {
  constructor(options: {
    runStore: BaseRunStore;
    agentRuntime?: any | null;
    workflowRuntimes?: any[] | any | null;
    autoResumeBranch?: boolean;
  });
  executePlan(
    planOrRunId: JsonObject | string,
    options?: { compareToRunId?: string | null; approvalReason?: string }
  ): Promise<JsonObject>;
}

export class EventBus {
  constructor(options?: { sinks?: any[] });
  addSink(sink: any): void;
  emit(event: JsonObject, run?: Run): Promise<void>;
}

export class ConsoleDebugSink {
  handle(event: JsonObject, run?: Run): Promise<void>;
}

export class WebhookEventSink {
  constructor(options?: {
    endpoint?: string;
    transport?: ((request: JsonObject) => Promise<any> | any) | null;
    headers?: JsonObject;
    eventTypes?: string[] | null;
  });
  handleEvent(event: JsonObject, run?: Run): Promise<any>;
}

export class GovernanceHooks {
  constructor(options?: Record<string, any>);
  dispatch(type: string, payload?: JsonObject, context?: JsonObject): Promise<void>;
}

export class WebhookGovernanceAdapter {
  constructor(options?: {
    endpoint?: string;
    transport?: ((request: JsonObject) => Promise<any> | any) | null;
    headers?: JsonObject;
  });
  handle(type: string, payload?: JsonObject, context?: JsonObject): Promise<any>;
  asHooks(): { onEvent: (type: string, payload?: JsonObject, context?: JsonObject) => Promise<any> };
}

export class ExtensionHost {
  constructor(options?: { extensions?: any[] });
  register(extension: any): any;
  listExtensions(): any[];
  getEnvironmentAdapters(): any[];
  getEvalScenarios(): any[];
  extendEventBus(eventBus?: EventBus | null): EventBus;
  extendGovernanceHooks(governanceHooks?: GovernanceHooks | null): GovernanceHooks;
  extendToolPolicy(toolPolicy?: ToolPolicy | JsonObject | null): ToolPolicy;
}

export class ApprovalInbox {
  constructor(options?: JsonObject);
  add(request: JsonObject): Promise<JsonObject>;
  get(id: string): Promise<JsonObject | null>;
  list(): Promise<JsonObject[]>;
  resolve(id: string, resolution: JsonObject): Promise<JsonObject | null>;
}

export abstract class BaseRunStore {
  static assert(store: any, name?: string): BaseRunStore;
  abstract saveRun(run: Run | JsonObject): Promise<Run>;
  abstract getRun(runId: string): Promise<Run | null>;
  abstract listRuns(): Promise<Run[]>;
}

export abstract class BaseJobStore {
  static assert(store: any, name?: string): BaseJobStore;
  abstract saveJob(job: JsonObject): Promise<JsonObject>;
  abstract getJob(jobId: string): Promise<JsonObject | null>;
  abstract listJobs(): Promise<JsonObject[]>;
}

export abstract class BaseLayerStore {
  static assert(store: any, name?: string): BaseLayerStore;
  abstract get(key: string): Promise<any>;
  abstract set(key: string, value: any): Promise<any>;
  abstract delete(key: string): Promise<void>;
  abstract entries(): Promise<Array<[string, any]>>;
  abstract clear(): Promise<void>;
}

export class InMemoryRunStore extends BaseRunStore {}
export class FileRunStore extends BaseRunStore {
  constructor(options?: { directory?: string });
}
export class InMemoryJobStore extends BaseJobStore {}
export class FileJobStore extends BaseJobStore {
  constructor(options?: { directory?: string });
}
export class InMemoryLayerStore extends BaseLayerStore {
  constructor(options?: { initial?: Record<string, any> });
}
export class FileLayerStore extends BaseLayerStore {
  constructor(options?: { filePath: string });
}

export class StorageBackendRegistry {
  constructor(options?: {
    runStores?: Record<string, BaseRunStore>;
    jobStores?: Record<string, BaseJobStore>;
    layerStores?: Record<string, BaseLayerStore>;
  });
  registerRunStore(name: string, store: BaseRunStore): BaseRunStore;
  registerJobStore(name: string, store: BaseJobStore): BaseJobStore;
  registerLayerStore(name: string, store: BaseLayerStore): BaseLayerStore;
  getRunStore(name: string): BaseRunStore | null;
  getJobStore(name: string): BaseJobStore | null;
  getLayerStore(name: string): BaseLayerStore | null;
  list(): {
    runStores: string[];
    jobStores: string[];
    layerStores: string[];
  };
}

export class BackgroundJobScheduler {
  constructor(options?: { store?: BaseJobStore; handlers?: Record<string, Function> });
  registerHandler(name: string, handler: Function): Function;
  schedule(job: JsonObject): Promise<JsonObject>;
  get(jobId: string): Promise<JsonObject | null>;
  runDueJobs(now?: Date | string): Promise<JsonObject[]>;
  list(): Promise<JsonObject[]>;
}

export class DelegationRuntime {
  delegate(options: JsonObject): Promise<any>;
}

export class PlanningRuntime {
  constructor(options: {
    planner: Function;
    executor: Function;
    verifier?: Function | null;
    recovery?: Function | null;
    runStore?: BaseRunStore;
    eventBus?: EventBus | JsonObject | null;
    onEvent?: ((event: JsonObject, run: Run) => Promise<void> | void) | null;
    maxRecoveryAttempts?: number;
  });
  run(input: any, options?: JsonObject): Promise<Run>;
}

export class ToolPolicy {
  constructor(options?: JsonObject);
  evaluate(tool: any, context?: JsonObject): JsonObject;
  verify(tool: any, context?: JsonObject): JsonObject;
  addRule(rule?: JsonObject): JsonObject;
  addRules(rules?: JsonObject[]): JsonObject[];
}

export class ProductionPolicyPack {
  constructor(options?: {
    name?: string;
    version?: string | null;
    environment?: string;
    denyToolNames?: string[];
    protectedToolNames?: string[];
    denySideEffectLevels?: string[];
    requireApprovalSideEffectLevels?: string[];
    requireApprovalTags?: string[];
    onGovernanceEvent?: ((event: JsonObject, context?: JsonObject) => Promise<void> | void) | null;
  });
  buildPolicyRules(): JsonObject[];
  buildGovernanceHooks(): Function[];
  listGovernanceEvents(): JsonObject[];
  toPolicyPack(): PolicyPack;
  toExtension(): JsonObject;
}

export class EvidenceGraph {
  addNode(node: JsonObject): JsonObject;
  addEdge(edge: JsonObject): JsonObject;
  detectConflicts(): any[];
  summarize(): {
    nodes: number;
    edges: number;
    conflicts: number;
    nodeTypes: string[];
  };
}

export class EvalHarness {
  constructor(options?: { scenarios?: any[] });
  run(options?: JsonObject): Promise<JsonObject>;
}

export class LearningLoop {
  recordRun(run: Run | JsonObject): void;
  recordEvaluation(report: JsonObject): void;
  recordFeedback(item: JsonObject): JsonObject;
  summarize(): JsonObject;
  buildRecommendations(): string[];
  buildAdaptiveRecommendations(): JsonObject[];
}

export class PolicyTuningAdvisor {
  constructor(options?: { learningLoop?: LearningLoop | JsonObject | null });
  buildSuggestions(options?: { branchAnalysis?: JsonObject | null; evaluationReport?: JsonObject | null }): JsonObject[];
}

export class VerifierEnsemble {
  constructor(options?: {
    reviewers?: Array<Function | JsonObject>;
    strategy?: 'most_restrictive' | 'escalate_on_disagreement';
  });
  verify(tool: JsonObject, args: JsonObject, context?: JsonObject): Promise<JsonObject>;
}

export class ConfidencePolicy {
  constructor(options?: {
    toolApprovalThreshold?: number;
    runPauseThreshold?: number;
    riskySideEffects?: string[];
    evaluateTool?: Function | null;
    evaluateRun?: Function | null;
  });
  evaluateTool(tool: JsonObject, toolAssessment: JsonObject, context?: JsonObject): JsonObject;
  evaluateRun(run: Run | JsonObject, assessment: JsonObject, context?: JsonObject): JsonObject;
}

export class AdaptiveRetryPolicy {
  constructor(options?: {
    learningLoop?: LearningLoop | JsonObject | null;
    escalateAfterAttempt?: number;
  });
  onFailure(error: Error | JsonObject, options?: { attempt?: number; retries?: number; context?: JsonObject }): JsonObject;
}

export class HistoricalRoutingAdvisor {
  constructor(options?: { learningLoop?: LearningLoop | JsonObject | null; outcomes?: JsonObject[] });
  recordOutcome(outcome?: JsonObject): JsonObject;
  rankProviders(providers?: JsonObject[], options?: { methodName?: string; args?: any[] }): JsonObject[];
}

export class AdaptiveDecisionLedger {
  constructor(options?: { entries?: JsonObject[]; filePath?: string | null });
  record(entry?: JsonObject): Promise<JsonObject>;
  recordSuggestion(suggestion?: JsonObject, metadata?: JsonObject): Promise<JsonObject>;
  recordDecision(decision?: JsonObject, metadata?: JsonObject): Promise<JsonObject>;
  get(entryId: string): JsonObject | null;
  list(): JsonObject[];
  summarize(): JsonObject;
  exportReplay(entryId: string): JsonObject;
  buildRollbackPlan(entryId: string): JsonObject;
}

export class AdaptiveGovernanceGate {
  constructor(options?: {
    ledger?: AdaptiveDecisionLedger | null;
    approvalInbox?: ApprovalInbox | null;
    governanceHooks?: GovernanceHooks | JsonObject | null;
    materialCategories?: string[];
    materialPriorities?: string[];
    requireApproval?: ((entry: JsonObject, context?: JsonObject) => Promise<JsonObject | boolean> | JsonObject | boolean) | null;
  });
  evaluate(entry?: JsonObject, context?: JsonObject): Promise<JsonObject>;
  reviewSuggestion(suggestion?: JsonObject, metadata?: JsonObject): Promise<JsonObject>;
  reviewDecision(decision?: JsonObject, metadata?: JsonObject): Promise<JsonObject>;
  resolveReview(reviewId: string, resolution?: JsonObject): Promise<JsonObject>;
}

export class BaseEnvironmentAdapter {
  constructor(options?: JsonObject);
  kind: string;
  execute(action: string, payload?: JsonObject): Promise<any>;
  describe(): JsonObject;
}

export class BrowserEnvironmentAdapter extends BaseEnvironmentAdapter {}
export class ShellEnvironmentAdapter extends BaseEnvironmentAdapter {}
export class ApiEnvironmentAdapter extends BaseEnvironmentAdapter {}
export class QueueEnvironmentAdapter extends BaseEnvironmentAdapter {}
export class FileEnvironmentAdapter extends BaseEnvironmentAdapter {}

export class Workflow {
  constructor(options?: JsonObject);
  id: string;
  steps: any[];
  toExecutionGraph(): any;
}

export class WorkflowStep {
  constructor(options?: JsonObject);
}

export class ExecutionGraph {
  constructor(workflow: Workflow | JsonObject);
}

export class DelegationContract {
  constructor(options?: JsonObject);
}

export class AgentWorkflowStep extends WorkflowStep {
  constructor(options?: JsonObject);
}

export class WorkflowRunner {
  constructor(options: {
    workflow: Workflow | JsonObject;
    runStore?: BaseRunStore;
    retryManager?: RetryManager;
    eventBus?: EventBus | JsonObject | null;
    onEvent?: ((event: JsonObject, run: Run) => Promise<void> | void) | null;
    debug?: boolean;
    executionIdentity?: JsonObject | null;
  });
  run(input?: any, options?: JsonObject): Promise<Run>;
  resumeRun(runId: string, options?: JsonObject): Promise<Run>;
  cancelRun(runId: string, options?: JsonObject): Promise<Run>;
  branchRun(runId: string, options?: JsonObject): Promise<Run>;
  createDistributedEnvelope(runId: string, options?: JsonObject): Promise<JsonObject>;
  continueDistributedRun(envelope: JsonObject): Promise<Run>;
  replayRun(runId: string, options?: JsonObject): Promise<Run>;
}

export class Memory {
  constructor(options?: {
    vectorStore?: any;
    adapter?: any;
    stores?: {
      working?: BaseLayerStore;
      profile?: BaseLayerStore;
      policy?: BaseLayerStore;
    };
    policies?: JsonObject;
  });
  setWorkingMemory(key: string, value: any, options?: JsonObject): Promise<void>;
  getWorkingMemory(key: string): any;
  listWorkingMemory(): any[];
  clearWorkingMemory(): void;
  setProfile(key: string, value: any, options?: JsonObject): Promise<void>;
  getProfile(key: string): any;
  listProfile(): any[];
  clearProfile(): void;
  setPolicy(key: string, value: any, options?: JsonObject): Promise<void>;
  getPolicy(key: string): any;
  listPolicies(): any[];
  clearPolicies(): void;
  storeConversation(userMessage: string, agentResponse: string, metadata?: JsonObject): void;
  getConversation(): any[];
  hydrate(): Promise<Memory>;
  compact(): void;
  decayExpired(): void;
}

export class RAG {
  constructor(options?: JsonObject);
  index(input: any, metadata?: JsonObject): Promise<any>;
  retrieve(query: string, options?: JsonObject): Promise<any[]>;
}

export class LocalVectorStore {
  add(embeddings: any[], metadata?: any[]): Promise<any>;
  query(embedding: any, topK?: number): Promise<any[]>;
  deleteAll(): Promise<void>;
}

export class BaseRetriever {
  retrieve(query: string, options?: JsonObject): Promise<any[]>;
}

export class VectorStoreRetriever extends BaseRetriever {
  constructor(options?: JsonObject);
}

export class FallbackRouter {
  constructor(options?: JsonObject);
  generateText(messages: any[], options?: JsonObject): Promise<any>;
}

export class MCPTool {}
export class MCPClient {}
export class MCPDiscoveryLoader {}
export class OpenAPILoader {}
export class ApiLoader {}
export class PineconeManager {}

export class RetryManager {
  constructor(options?: JsonObject);
  execute<T>(operation: () => Promise<T> | T, ...args: any[]): Promise<T>;
  executeWithPolicy<T>(
    operation: () => Promise<T> | T,
    options?: { policy?: AdaptiveRetryPolicy | JsonObject | null; context?: JsonObject; onEscalate?: Function | null },
    ...args: any[]
  ): Promise<T>;
}

export class OpenAIAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class GeminiAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class AnthropicAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class HFAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class DeepSeekAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class Task {
  constructor(options?: JsonObject);
}

export class Orchestrator {
  constructor(options?: JsonObject);
}

export function chunkText(input: string, options?: JsonObject): string[];
export function repairJsonOutput(input: string): any;
export function encodeBase64(input: string): string;

export class AgentError extends Error {}
export class AdapterCapabilityError extends AgentError {}
export class InvalidToolCallError extends AgentError {}
export class ToolNotFoundError extends AgentError {}
export class ToolExecutionError extends AgentError {}
export class ToolPolicyError extends AgentError {}
export class ApprovalRequiredError extends AgentError {}
export class RunNotFoundError extends AgentError {}
export class RunPausedError extends AgentError {}
export class RunCancelledError extends AgentError {}
