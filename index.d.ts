export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export type ProducerContent =
  | { type: 'text'; text: string }
  | { type: 'json'; value: JsonValue }
  | { type: 'image' | 'audio' | 'video' | 'file'; artifactId: string; mimeType: string };
export interface ProducerRequest { operation: string; content: ProducerContent[]; }
export interface ProducerContext { runId: string; signal?: AbortSignal; }
export interface ProviderTarget {
  id: string; name: string; integration: 'adapter' | 'producer' | 'job-backend';
  requiredEnv: string[]; primaryTextSmoke: boolean; verification: 'live-revalidation-pending';
}
export class ProviderCatalog {
  static list(): ProviderTarget[];
  static vectorStores(): Array<{ id: string; name: string; implementation: string; verification: 'live-revalidation-pending' }>;
}
export interface HttpConnectorOptions { fetchImpl?: typeof fetch; timeoutMs?: number; maxBytes?: number; }
export class MistralAdapter {
  constructor(apiKey: string, options: HttpConnectorOptions & { model: string });
  getCapabilities(): Record<string, boolean>;
  supports(capability: string): boolean;
  generateText(prompt: any, config?: Record<string, any>): Promise<any>;
  generateToolResult(prompt: any, toolCall: any, toolResult: any, config?: Record<string, any>): Promise<string>;
}
export class XAIAdapter extends MistralAdapter {}
export class ElevenLabsProducer implements Producer {
  constructor(options: HttpConnectorOptions & { apiKey: string; voiceId: string; model: string;
    saveArtifact(asset: { data: Uint8Array; mimeType: string }, context: ProducerContext): Promise<{ artifactId: string }> });
  id: string;
  supports(operation: string): boolean;
  produce(request: ProducerRequest, context?: ProducerContext): Promise<{ content: ProducerContent[] }>;
}
export interface MediaJobBackendOptions extends HttpConnectorOptions {
  apiKey: string; modelPath: string; operation: 'generateImage' | 'generateVideo';
  toInput(request: ProducerRequest, context: any): JsonObject | Promise<JsonObject>;
  toContent(result: any, context: ProducerContext & { jobId: string; provider: string }): ProducerContent[] | Promise<ProducerContent[]>;
}
export class FalJobBackend {
  constructor(options: MediaJobBackendOptions);
  id: string;
  start(request: ProducerRequest, context?: any): Promise<{ jobId: string }>;
  poll(jobId: string, context?: any): Promise<{ status: 'pending' | 'completed' | 'failed'; content?: ProducerContent[] }>;
  cancel(jobId: string, context?: any): Promise<{ cancellationRequested: boolean }>;
}
export class HiggsfieldJobBackend extends FalJobBackend {}
export type CompletionStatus = 'completed' | 'incomplete' | 'failed' | 'cancelled' | 'uncertain';
export interface SchemaSafetyOptions {
  maxDepth?: number; maxNodes?: number; maxBytes?: number; allowPatterns?: boolean; allowLocalRefs?: boolean;
}
export class SchemaSafety {
  constructor(options?: SchemaSafetyOptions);
  assertValue(value: unknown): void;
  assertSchema(schema: unknown): void;
}
export interface RunLock { withLock<T>(key: string, action: () => Promise<T>): Promise<T>; }
export class InMemoryRunLock implements RunLock {
  withLock<T>(key: string, action: () => Promise<T>): Promise<T>;
}
export class FileRunLock implements RunLock {
  constructor(options: { directory: string });
  withLock<T>(key: string, action: () => Promise<T>): Promise<T>;
}
export class ApprovalSigner {
  constructor(options: { key: string | Uint8Array });
  sign(request: any): string;
  verify(request: any): boolean;
}
export interface RunBudgetOptions {
  limits: { tokens?: number; costMicros?: number };
  estimate(request: any, context: { run: Run }): any | Promise<any>;
}
export class RunBudget {
  constructor(options: RunBudgetOptions);
  reserve(run: Run, request: any): Promise<any>;
  settle(run: Run, reservation: any, actual?: { tokens?: number; costMicros?: number }): void;
}
export interface ContentEnvelopeValue {
  kind: 'agnostic-agents/content'; version: '1.0'; status: CompletionStatus; content: ProducerContent[];
}
export class ContentEnvelope {
  static create(input: { content: ProducerContent[]; status?: CompletionStatus }): ContentEnvelopeValue;
  static parse(value: unknown): ContentEnvelopeValue;
  static migrate(value: any, options: { fromVersion: 'legacy' | '1.0' }): ContentEnvelopeValue;
}
export type RealtimeFrame = { type: 'text'; text: string } |
  { type: 'audio' | 'video' | 'image'; data: Uint8Array; mimeType: string };
export interface RealtimeTransport {
  connect(context: { runId: string; signal?: AbortSignal }): Promise<unknown>;
  send(frame: RealtimeFrame & { epoch: number }, context: { signal?: AbortSignal }): Promise<unknown>;
  interrupt(context: { epoch: number; signal?: AbortSignal }): Promise<unknown>;
  events(): AsyncIterable<(RealtimeFrame | { type: 'end' }) & { epoch: number }>;
  close(): Promise<unknown>;
}
export class RealtimeSession {
  constructor(options: { transport: RealtimeTransport; authorize(request: any): boolean | Promise<boolean>;
    runStore?: BaseRunStore; maxFrameBytes?: number; maxFrames?: number; maxTotalBytes?: number; invocationTimeoutMs?: number });
  run: Run | null;
  open(options?: { signal?: AbortSignal }): Promise<Run>;
  send(frame: RealtimeFrame, options?: { signal?: AbortSignal }): Promise<void>;
  interrupt(options?: { signal?: AbortSignal }): Promise<void>;
  events(options?: { signal?: AbortSignal }): AsyncGenerator<RealtimeFrame & { epoch: number; runId: string }>;
  close(): Promise<void>;
}
export interface Producer {
  id: string;
  supports(operation: string): boolean;
  produce(request: ProducerRequest, context: ProducerContext): Promise<{ content: ProducerContent[]; completionStatus?: 'completed' | 'incomplete' | 'uncertain' }>;
  supportsStream?(operation: string): boolean;
  stream?(request: ProducerRequest, context: ProducerContext): AsyncIterable<{ type: 'content'; content: ProducerContent[] }>;
}
export function normalizeContent(content: ProducerContent[]): ProducerContent[];
export class FunctionProducer implements Producer {
  constructor(options: { id: string; operations?: Record<string,
    (request: ProducerRequest, context: ProducerContext) => Promise<{ content: ProducerContent[]; completionStatus?: 'completed' | 'incomplete' | 'uncertain' }>>;
    streams?: Record<string, (request: ProducerRequest, context: ProducerContext) =>
      AsyncIterable<{ type: 'content'; content: ProducerContent[] }>> });
  id: string;
  supports(operation: string): boolean;
  produce(request: ProducerRequest, context: ProducerContext): Promise<{ content: ProducerContent[]; completionStatus?: 'completed' | 'incomplete' | 'uncertain' }>;
  supportsStream(operation: string): boolean;
  stream(request: ProducerRequest, context: ProducerContext): AsyncIterable<{ type: 'content'; content: ProducerContent[] }>;
}
export class ProducerRuntime {
  constructor(options: { producer: Producer; runStore?: { saveRun(run: Run): Promise<unknown> };
    authorize?: (request: ProducerRequest, context: ProducerContext) => boolean | Promise<boolean>;
    outputSchema?: JsonObject | boolean; maxOutputBytes?: number; invocationTimeoutMs?: number | null; schemaSafety?: SchemaSafetyOptions });
  run(request: ProducerRequest, options?: { signal?: AbortSignal; parentRunId?: string | null;
    rootRunId?: string | null; onRunCreated?: (run: Run) => Promise<void> | void }): Promise<Run>;
  stream(request: ProducerRequest, options?: { signal?: AbortSignal }): AsyncGenerator<
    { type: 'content'; runId: string; content: ProducerContent[] } |
    { type: string; run: Run }, void, unknown>;
}

export interface ContextWindowOptions {
  maxTokens: number;
  reserveOutputTokens?: number;
  countTokens?: ((request: { messages: any[]; tools: any[] }) => number | Promise<number>) | null;
  pinnedMessages?: Array<{ role: 'system'; content: string }>;
  summarize?: ((request: { messages: any[]; sourceIndices: number[]; availableTokens: number }) => string | Promise<string>) | null;
}
export class ContextWindow {
  constructor(options: ContextWindowOptions);
  project(messages: any[], tools?: any[]): Promise<{ messages: any[]; sourceIndices: number[];
    omittedIndices: number[]; inputTokens: number; inputBudget: number;
    reserveOutputTokens: number; countingMode: 'custom' | 'estimate';
    summary: { text: string; sourceIndices: number[] } | null }>;
}

export class GuardedProvider {
  constructor(options: { id: string; provider: any;
    authorize(request: { providerId: string; operation: string; capability: string; args: any[] }): boolean | Promise<boolean>;
    capabilities?: Record<string, boolean>; models?: Record<string, Record<string, boolean>>; defaultModel?: string | null });
  getModelCapabilities(model: string): Record<string, boolean> | null;
  getCapabilities(): Record<string, boolean>;
  supports(capability: string): boolean;
  generateText(...args: any[]): Promise<any>;
  generateToolResult(...args: any[]): Promise<any>;
  embedChunks(...args: any[]): Promise<any>;
  analyzeImage(...args: any[]): Promise<any>;
  generateImage(...args: any[]): Promise<any>;
  transcribeAudio(...args: any[]): Promise<any>;
  generateAudio(...args: any[]): Promise<any>;
  analyzeVideo(...args: any[]): Promise<any>;
  generateVideo(...args: any[]): Promise<any>;
}
export class ScopedRetriever {
  constructor(options: { retriever: { search(query: string, options?: any): Promise<any> };
    tenantId: string; authorizeQuery: (request: { query: string; tenantId: string }) => boolean | Promise<boolean>;
    authorizeMatch?: (request: any) => boolean | Promise<boolean> });
  search(query: string, options?: any): Promise<any>;
}
export class ScopedLayerStore extends BaseLayerStore {
  constructor(options: { store: BaseLayerStore; tenantId: string });
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<any>;
  delete(key: string): Promise<void>;
  entries(): Promise<Array<[string, any]>>;
  clear(): Promise<void>;
}
export class ScopedRunStore extends BaseRunStore {
  constructor(options: { store: BaseRunStore; tenantId: string });
  saveRun(run: Run | JsonObject): Promise<Run>;
  getRun(runId: string): Promise<Run | null>;
  listRuns(): Promise<Run[]>;
}
export class ArtifactResolver {
  constructor(options: { tenantId: string; maxBytes?: number; requireVersion?: boolean;
    authorize: (request: { artifactId: string; tenantId: string; operation: string }) => boolean | Promise<boolean>;
    store: { stat(id: string, context: any): Promise<{ tenantId: string; sizeBytes: number; mimeType?: string; version?: string; etag?: string }>;
      read(id: string, context: any): AsyncIterable<Uint8Array> } });
  read(id: string, options?: { signal?: AbortSignal }): Promise<{ artifactId: string; mimeType?: string; data: Uint8Array }>;
}
export class ProducerJobRunner {
  constructor(options: { backend: {
    id?: string;
    start(request: ProducerRequest, context: any): Promise<{ jobId: string }>;
    poll(jobId: string, context: any): Promise<{ status: 'pending' | 'completed' | 'failed'; content?: ProducerContent[] }>;
  }; runStore: { saveRun(run: Run): Promise<unknown>; getRun(id: string): Promise<Run | null> };
    authorize(request: any): boolean | Promise<boolean>; maxPolls?: number; pollIntervalMs?: number;
    runLock?: RunLock; lockNamespace?: string; invocationTimeoutMs?: number });
  start(request: ProducerRequest, options?: { signal?: AbortSignal }): Promise<Run>;
  resume(id: string, options?: { signal?: AbortSignal }): Promise<Run>;
}

export class ProducerTool extends Tool {
  constructor(options: { name: string; description?: string; parameters?: JsonObject;
    runtime: ProducerRuntime; operation: string;
    toContent: (args: Record<string, any>) => ProducerContent[] | Promise<ProducerContent[]>;
    maxCallsPerRun?: number; metadata?: ToolMetadata });
}

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
  outputSchema?: JsonObject | boolean | null;
  strict?: boolean;
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
  outputSchema: JsonObject | boolean | null;
  metadata: ToolMetadata;
  implementation?: ToolDefinition['implementation'];
  call(args?: Record<string, any>, context?: any): Promise<any>;
  toUnifiedSchema(): JsonObject;
  toOpenAIFunction(): JsonObject;
  toAnthropicTool(): JsonObject;
}

export interface AgentOptions {
  runLock?: RunLock; lockNamespace?: string; approvalSigner?: ApprovalSigner | null;
  budget?: RunBudget | RunBudgetOptions | null; schemaSafety?: SchemaSafetyOptions; invocationTimeoutMs?: number | null;
  contextWindow?: ContextWindow | ContextWindowOptions | null;
  authorizeModelCall?: ((request: any, context: { run: Run }) => boolean | Promise<boolean>) | null;
  authorizeResume?: ((request: any, context: { run: Run; config: any }) => boolean | Promise<boolean>) | null;
  approvalTtlMs?: number;
  executionLimits?: { modelCalls?: number; toolCalls?: number };
  outputSchema?: JsonObject | boolean;
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
  run(input: string, config?: JsonObject | (Record<string, any> & { signal?: AbortSignal })): Promise<Run>;
  runTool(toolName: string, args?: Record<string, any>, config?: Record<string, any> & { signal?: AbortSignal }): Promise<Run>;
  runMedia(operation: 'analyzeImage' | 'generateImage' | 'transcribeAudio' | 'generateAudio' | 'analyzeVideo' | 'generateVideo',
    input: any, config?: Record<string, any> & { signal?: AbortSignal }): Promise<{ run: Run; result: any }>;
  analyzeImage(input: any, config?: Record<string, any>): Promise<any>;
  generateImage(input: any, config?: Record<string, any>): Promise<any>;
  transcribeAudio(input: any, config?: Record<string, any>): Promise<any>;
  generateAudio(input: any, config?: Record<string, any>): Promise<any>;
  analyzeVideo(input: any, config?: Record<string, any>): Promise<any>;
  generateVideo(input: any, config?: Record<string, any>): Promise<any>;
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
  getScore(
    actorId: string,
    options?: { domain?: string | null; taskFamily?: string | null; role?: string | null }
  ): number;
  rankActors(
    actorIds?: string[],
    options?: { domain?: string | null; taskFamily?: string | null; role?: string | null }
  ): JsonObject[];
  getProfile(actorId: string): JsonObject;
  summarize(): JsonObject;
}

export class DisagreementResolver {
  constructor(options?: {
    trustRegistry?: TrustRegistry | JsonObject | null;
    escalateOnDisagreement?: boolean;
    strategy?: string;
    trustThreshold?: number;
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
    capabilityRouter?: CapabilityRouter | JsonObject | null;
  });
  recommend(
    task?: JsonObject,
    options?: { availableDelegates?: JsonObject[]; routeCandidates?: JsonObject[] }
  ): JsonObject;
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
    capabilityRouter?: CapabilityRouter | JsonObject | null;
    safetyGuard?: CoordinationSafetyGuard | JsonObject | null;
  });
  trustRegistry: TrustRegistry;
  decompositionAdvisor: DecompositionAdvisor;
  roleContracts: CoordinationRoleContract[];
  plan(task?: JsonObject, options?: { actors?: JsonObject[]; context?: JsonObject }): JsonObject;
  getRoleContract(role: string, task?: JsonObject): JsonObject;
}

export class VerificationStrategySelector {
  constructor(options?: {
    trustRegistry?: TrustRegistry | JsonObject | null;
    thresholds?: JsonObject;
    capabilityRouter?: CapabilityRouter | JsonObject | null;
  });
  trustRegistry: TrustRegistry;
  thresholds: JsonObject;
  select(task?: JsonObject, context?: JsonObject): JsonObject;
}

export class MultiPassVerificationEngine {
  constructor(options?: {
    selector?: VerificationStrategySelector | JsonObject | null;
    reviewers?: Array<Function | JsonObject>;
  });
  selector: VerificationStrategySelector;
  reviewers: Array<Function | JsonObject>;
  verify(candidate?: JsonObject, options?: { task?: JsonObject; context?: JsonObject }): Promise<JsonObject>;
}

export class CoordinationQualityTracker {
  constructor(options?: {
    trustRegistry?: TrustRegistry | JsonObject | null;
    records?: JsonObject[];
  });
  trustRegistry: TrustRegistry;
  records: JsonObject[];
  record(record?: JsonObject): JsonObject;
  getQualityScore(
    actorId: string,
    options?: {
      qualityType?: string | null;
      role?: string | null;
      domain?: string | null;
      taskFamily?: string | null;
    }
  ): number;
  summarize(): JsonObject;
  getProfile(actorId: string): JsonObject;
}

export class CoordinationDiagnostics {
  summarize(options?: {
    review?: JsonObject | null;
    resolution?: JsonObject | null;
    plan?: JsonObject | null;
    verification?: JsonObject | null;
    quality?: JsonObject | null;
  }): JsonObject;
}

export class DelegationBudget {
  constructor(options?: { maxTotalDelegations?: number; perActor?: Record<string, number> });
  maxTotalDelegations: number;
  perActor: Record<string, number>;
  usage: JsonObject;
  canDelegate(options?: { actorId?: string | null; count?: number }): JsonObject;
  consume(options?: { actorId?: string | null; count?: number }): JsonObject;
  summarize(): JsonObject;
}

export class SharedContextScope {
  constructor(options?: { roleScopes?: Record<string, string[]>; redactedValue?: string });
  roleScopes: Record<string, string[]>;
  redactedValue: string;
  filter(role: string, context?: JsonObject): JsonObject;
}

export class CoordinationSafetyGuard {
  constructor(options?: {
    maxRepeatedActionCount?: number;
    forbiddenRoleOverlaps?: string[][];
    delegationBudget?: DelegationBudget | JsonObject | null;
    sharedContextScope?: SharedContextScope | JsonObject | null;
  });
  maxRepeatedActionCount: number;
  forbiddenRoleOverlaps: string[][];
  delegationBudget: DelegationBudget;
  sharedContextScope: SharedContextScope;
  evaluate(options?: {
    history?: JsonObject[];
    assignments?: JsonObject[];
    sharedContext?: JsonObject;
    requestedDelegations?: JsonObject[];
  }): JsonObject;
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
    memoryGovernance?: JsonObject | null;
    metadata?: JsonObject;
  });
  run: Run | null;
  memory: JsonObject | null;
  memoryGovernance: JsonObject | null;
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
    memoryGovernance?: JsonObject | null;
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

export class DeploymentPatternCertificationKit {
  constructor(options?: {
    certificationKit?: CertificationKit;
  });
  certify(
    deployment?: JsonObject,
    options?: {
      pattern?: string;
      name?: string | null;
    }
  ): JsonObject;
  certifyMany(
    entries?: Array<{
      pattern: string;
      name?: string | null;
      deployment: JsonObject;
    }>
  ): JsonObject[];
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
  static migrateTrace(trace: JsonObject): JsonObject;
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
    captureContent?: boolean;
    redactor?: { redact(value: any): any };
  });
  handleEvent(event: JsonObject, run?: Run): Promise<any>;
}

export class RuntimeEventRedactor {
  constructor(options?: { replacement?: string; sensitiveKeys?: string[];
    secrets?: string[]; maxDepth?: number });
  redact(value: any): any;
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
  claimJob(jobId: string, expectedRunAt: string): Promise<JsonObject | null>;
}

export abstract class BaseLayerStore {
  static assert(store: any, name?: string): BaseLayerStore;
  abstract get(key: string): Promise<any>;
  abstract set(key: string, value: any): Promise<any>;
  abstract delete(key: string): Promise<void>;
  abstract entries(): Promise<Array<[string, any]>>;
  abstract clear(): Promise<void>;
}

export class InMemoryRunStore extends BaseRunStore {
  saveRun(run: Run | JsonObject): Promise<Run>;
  getRun(runId: string): Promise<Run | null>;
  listRuns(): Promise<Run[]>;
}
export class FileRunStore extends BaseRunStore {
  constructor(options?: { directory?: string });
  runLock: RunLock;
  saveRun(run: Run | JsonObject): Promise<Run>;
  getRun(runId: string): Promise<Run | null>;
  listRuns(): Promise<Run[]>;
}
export class InMemoryJobStore extends BaseJobStore {
  saveJob(job: JsonObject): Promise<JsonObject>;
  getJob(jobId: string): Promise<JsonObject | null>;
  listJobs(): Promise<JsonObject[]>;
}
export class FileJobStore extends BaseJobStore {
  constructor(options?: { directory?: string });
  saveJob(job: JsonObject): Promise<JsonObject>;
  getJob(jobId: string): Promise<JsonObject | null>;
  listJobs(): Promise<JsonObject[]>;
}
export class InMemoryLayerStore extends BaseLayerStore {
  constructor(options?: { initial?: Record<string, any> });
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<any>;
  delete(key: string): Promise<void>;
  entries(): Promise<Array<[string, any]>>;
  clear(): Promise<void>;
}
export class FileLayerStore extends BaseLayerStore {
  constructor(options?: { filePath: string });
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<any>;
  delete(key: string): Promise<void>;
  entries(): Promise<Array<[string, any]>>;
  clear(): Promise<void>;
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
  constructor(options?: { eventBus?: EventBus | null; onEvent?: (event: any, run: Run) => any;
    authorize?: (request: any) => boolean | Promise<boolean>; maxDelegations?: number; maxDepth?: number; runStore?: BaseRunStore | null });
  delegate(options: { parentRun: Run; agent: Agent | any; prompt: string; contract?: any; metadata?: any; state?: any; config?: any }): Promise<any>;
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

export class InvariantRegistry {
  constructor(options?: { invariants?: JsonObject[] });
  register(invariant?: JsonObject): JsonObject;
  list(): JsonObject[];
  evaluate(context?: JsonObject): Promise<JsonObject[]>;
}

export class AssuranceReport {
  constructor(options?: { invariants?: JsonObject[]; scenarios?: JsonObject[] });
  invariants: JsonObject[];
  scenarios: JsonObject[];
  summarize(): JsonObject;
  explain(): JsonObject;
  toJSON(): JsonObject;
}

export class AssuranceSuite {
  constructor(options?: {
    invariants?: InvariantRegistry | JsonObject | null;
    scenarios?: JsonObject[];
  });
  invariants: InvariantRegistry;
  scenarios: JsonObject[];
  run(context?: JsonObject): Promise<AssuranceReport>;
}

export class AssuranceGuardrail {
  evaluate(report?: AssuranceReport | JsonObject): JsonObject;
}

export class AssuranceRecoveryPlanner {
  plan(report?: AssuranceReport | JsonObject): JsonObject;
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

export class CapabilityRouter {
  constructor(options?: {
    candidates?: JsonObject[];
    routingAdvisor?: HistoricalRoutingAdvisor | JsonObject | null;
    weights?: JsonObject;
  });
  candidates: JsonObject[];
  routingAdvisor: HistoricalRoutingAdvisor | JsonObject | null;
  weights: JsonObject;
  register(candidate?: JsonObject): JsonObject;
  rank(request?: JsonObject, candidates?: JsonObject[]): JsonObject;
  select(request?: JsonObject, candidates?: JsonObject[]): JsonObject;
  explain(decision?: JsonObject): string;
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

export class FleetRolloutPlan {
  constructor(options?: {
    id?: string | null;
    target?: JsonObject;
    stages?: JsonObject[];
    rollbackTriggers?: JsonObject[];
    metadata?: JsonObject;
  });
  id: string;
  target: JsonObject;
  stages: JsonObject[];
  rollbackTriggers: JsonObject[];
  metadata: JsonObject;
  summarize(): JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): FleetRolloutPlan;
}

export class FleetHealthMonitor {
  constructor(options?: { snapshots?: JsonObject[] });
  record(snapshot?: JsonObject): JsonObject;
  summarize(): JsonObject;
}

export class FleetCanaryEvaluator {
  constructor(options?: { monitor?: FleetHealthMonitor | JsonObject | null });
  monitor: FleetHealthMonitor;
  evaluate(plan?: FleetRolloutPlan | JsonObject, summary?: JsonObject | null): JsonObject;
}

export class FleetSafetyController {
  constructor(options?: {
    monitor?: FleetHealthMonitor | JsonObject | null;
    maxConcurrentRuns?: number | null;
    maxSchedulerBacklog?: number | null;
    maxAdaptiveRegressions?: number;
    maxSaturation?: number;
    allowedEnvironmentIds?: string[];
    allowedTenantIds?: string[];
  });
  monitor: FleetHealthMonitor;
  evaluate(summary?: JsonObject | null, scope?: JsonObject): JsonObject;
}

export class FleetImpactComparator {
  constructor(options?: {
    before?: FleetHealthMonitor | JsonObject | null;
    after?: FleetHealthMonitor | JsonObject | null;
  });
  before: FleetHealthMonitor;
  after: FleetHealthMonitor;
  compare(beforeSummary?: JsonObject | null, afterSummary?: JsonObject | null): JsonObject;
}

export class FleetRollbackAdvisor {
  constructor(options?: {
    comparator?: FleetImpactComparator | JsonObject | null;
  });
  comparator: FleetImpactComparator;
  advise(options?: {
    plan?: FleetRolloutPlan | JsonObject | null;
    comparison?: JsonObject | null;
    safetyDecision?: JsonObject | null;
  }): JsonObject;
}

export class RouteFleetDiagnostics {
  constructor(options?: { monitor?: FleetHealthMonitor | JsonObject | null });
  monitor: FleetHealthMonitor;
  analyze(summary?: JsonObject | null): JsonObject;
}

export class MemoryProvenanceLedger {
  constructor(options?: { records?: JsonObject[] });
  record(entry?: JsonObject): JsonObject;
  list(filters?: JsonObject): JsonObject[];
  summarize(): JsonObject;
}

export class MemoryRetentionPolicy {
  constructor(options?: { layerRules?: JsonObject });
  getRule(layer: string): JsonObject;
  evaluate(record?: JsonObject, layer?: string): JsonObject;
  apply(entries?: Array<[string, JsonObject]>, layer?: string): JsonObject[];
}

export class MemoryAccessController {
  constructor(options?: { rules?: JsonObject[] });
  canRead(options?: JsonObject): JsonObject;
  canWrite(options?: JsonObject): JsonObject;
  redact(record?: JsonObject, context?: JsonObject): JsonObject;
}

export class MemoryConflictResolver {
  constructor(options?: { trustScores?: JsonObject; preferNewer?: boolean });
  resolve(existing?: JsonObject | null, incoming?: JsonObject | null): JsonObject;
  detect(existing?: JsonObject | null, incoming?: JsonObject | null): JsonObject;
}

export class MemoryAccessContractRegistry {
  constructor(options?: { contracts?: JsonObject });
  describe(surface: string): JsonObject | null;
  list(): JsonObject;
  allows(surface: string, action: string, layer: string): boolean;
}

export class MemoryAuditView {
  build(options?: { audit?: JsonObject[] }): JsonObject;
}

export class MemoryGovernanceBenchmarkSuite {
  constructor(options?: { auditView?: MemoryAuditView | JsonObject | null; scenarios?: JsonObject[] });
  buildDefaultScenarios(options?: { audit?: JsonObject[]; stateBundle?: JsonObject | null }): JsonObject[];
  run(options?: JsonObject): Promise<JsonObject>;
}

export class MemoryGovernanceDiagnostics {
  summarize(options?: {
    auditView?: JsonObject | null;
    benchmarkReport?: JsonObject | null;
    stateSummary?: JsonObject | null;
  }): JsonObject;
}

export class MemoryGovernanceReviewWorkflow {
  constructor(options?: {
    auditView?: MemoryAuditView | JsonObject | null;
    diagnostics?: MemoryGovernanceDiagnostics | JsonObject | null;
  });
  run(options?: {
    audit?: JsonObject[];
    benchmarkReport?: JsonObject | null;
    stateSummary?: JsonObject | null;
  }): JsonObject;
}

export class SecretResolver {
  constructor(options?: { providers?: Record<string, Function>; env?: Record<string, string | undefined> });
  resolve(value: JsonValue, context?: JsonObject): JsonValue;
  redact(value: JsonValue): JsonValue;
}

export class SchemaNormalizer {
  static normalizeToolSchema(schema?: JsonObject): JsonObject;
  static normalizeApiProperty(property?: JsonObject): JsonObject;
  static normalizeSchema(schema?: JsonObject): JsonObject;
}

export class ToolRecorder {
  constructor(options?: { records?: JsonObject[] });
  wrap(tool: Tool, metadata?: JsonObject): Tool;
  export(): JsonObject;
}

export class ToolMockBuilder {
  static build(options?: {
    toolName?: string;
    records?: JsonObject[];
    description?: string;
    fallback?: Function | null;
  }): Tool;
}

export class ToolSandboxRunner {
  constructor(options?: { simulator?: Function | null });
  run(tool: Tool, args?: JsonObject, options?: { mode?: string; context?: JsonObject }): Promise<JsonObject>;
}

export class OperatorInterventionPlanner {
  plan(options?: {
    run?: Run | JsonObject | null;
    incident?: JsonObject | null;
    assurance?: JsonObject | null;
    rollout?: JsonObject | null;
    rollback?: JsonObject | null;
    context?: JsonObject;
  }): JsonObject;
}

export class OperatorSummary {
  summarize(options?: {
    runs?: JsonObject[];
    incidents?: JsonObject[];
    rollouts?: JsonObject[];
    learnedChanges?: JsonObject[];
    assuranceReports?: JsonObject[];
  }): JsonObject;
}

export class OperatorTriageWorkflow {
  constructor(options?: {
    summary?: OperatorSummary | JsonObject | null;
    planner?: OperatorInterventionPlanner | JsonObject | null;
  });
  summary: OperatorSummary;
  planner: OperatorInterventionPlanner;
  run(options?: {
    runs?: JsonObject[];
    incidents?: JsonObject[];
    rollouts?: JsonObject[];
    learnedChanges?: JsonObject[];
    assuranceReports?: JsonObject[];
    primaryRun?: Run | JsonObject | null;
    primaryIncident?: JsonObject | null;
    primaryAssurance?: JsonObject | null;
    primaryRollout?: JsonObject | null;
    primaryRollback?: JsonObject | null;
    context?: JsonObject;
  }): JsonObject;
}

export class AutonomyBudget {
  constructor(options?: {
    spend?: number | null;
    retries?: number | null;
    toolCalls?: number | null;
    wallClockMs?: number | null;
    externalActions?: number | null;
    tokens?: number | null;
    metadata?: JsonObject;
  });
  limits: JsonObject;
  usage: JsonObject;
  metadata: JsonObject;
  record(delta?: JsonObject): JsonObject;
  snapshot(): JsonObject;
  exhausted(): boolean;
  violations(): JsonObject[];
}

export class AutonomyBudgetLedger {
  constructor(options?: { records?: JsonObject[] });
  records: JsonObject[];
  record(entry?: JsonObject): JsonObject;
  list(): JsonObject[];
  summarize(): JsonObject;
}

export class UncertaintySupervisionPolicy {
  constructor(options?: {
    reviewThreshold?: number;
    escalateThreshold?: number;
    fallbackAction?: string;
    metadata?: JsonObject;
  });
  reviewThreshold: number;
  escalateThreshold: number;
  fallbackAction: string;
  metadata: JsonObject;
  evaluate(assessment?: JsonObject): JsonObject;
}

export class ApprovalDelegationContract {
  constructor(options?: {
    id?: string | null;
    approver?: string | null;
    delegate?: string | null;
    scope?: JsonObject[];
    metadata?: JsonObject;
  });
  id: string | null;
  approver: string | null;
  delegate: string | null;
  scope: JsonObject[];
  metadata: JsonObject;
  appliesTo(request?: JsonObject): boolean;
  toJSON(): JsonObject;
}

export class AutonomyEnvelope {
  constructor(options?: {
    budget?: AutonomyBudget | JsonObject | null;
    supervisionPolicy?: UncertaintySupervisionPolicy | JsonObject | null;
    environment?: string | null;
    tenant?: string | null;
    metadata?: JsonObject;
  });
  budget: AutonomyBudget;
  supervisionPolicy: UncertaintySupervisionPolicy;
  environment: string | null;
  tenant: string | null;
  metadata: JsonObject;
  evaluate(options?: { usage?: JsonObject; assessment?: JsonObject; riskClass?: string }): JsonObject;
}

export class AutonomyPolicyRegistry {
  constructor(options?: { policies?: JsonObject[] });
  policies: JsonObject[];
  register(policy?: JsonObject): JsonObject;
  list(): JsonObject[];
  resolve(request?: JsonObject): JsonObject;
  evaluate(request?: JsonObject): JsonObject;
}

export class InterventionPolicyRegistry {
  constructor(options?: { policies?: JsonObject[] });
  policies: JsonObject[];
  register(policy?: JsonObject): JsonObject;
  select(context?: JsonObject): JsonObject;
}

export class ApprovalDecisionCache {
  constructor(options?: { entries?: JsonObject[] });
  entries: Map<string, JsonObject>;
  cache(entry?: JsonObject): JsonObject;
  find(request?: JsonObject): JsonObject | null;
  revoke(id: string, options?: { reason?: string; revokedBy?: string | null }): JsonObject | null;
  list(): JsonObject[];
  summarize(): JsonObject;
}

export class WorkflowSupervisionCheckpoint {
  constructor(options?: {
    requireReviewBelowConfidence?: number;
    escalateBelowConfidence?: number;
    metadata?: JsonObject;
  });
  requireReviewBelowConfidence: number;
  escalateBelowConfidence: number;
  metadata: JsonObject;
  evaluate(options?: {
    workflowId?: string | null;
    stepId?: string | null;
    taskFamily?: string | null;
    riskClass?: string;
    confidence?: number;
    rationale?: string;
    alternatives?: string[];
    context?: JsonObject;
  }): JsonObject;
}

export class ProgressiveAutonomyController {
  constructor(options?: {
    minimumEvidenceScore?: number;
    widenIncrement?: JsonObject;
    tightenIncrement?: JsonObject;
    reviewThresholdDelta?: number;
    escalateThresholdDelta?: number;
  });
  minimumEvidenceScore: number;
  widenIncrement: JsonObject;
  tightenIncrement: JsonObject;
  reviewThresholdDelta: number;
  escalateThresholdDelta: number;
  adjust(
    envelope?: AutonomyEnvelope | JsonObject | null,
    options?: {
      evidenceScore?: number;
      environment?: string | null;
      tenant?: string | null;
      reason?: string | null;
    }
  ): JsonObject;
}

export class AutonomyBenchmarkSuite {
  constructor(options?: { evalHarness?: EvalHarness | JsonObject | null });
  buildScenarios(options?: {
    envelope?: AutonomyEnvelope | JsonObject | null;
    approvalCache?: ApprovalDecisionCache | JsonObject | null;
    approvalLatencyMs?: number;
    escalation?: JsonObject | null;
  }): JsonObject[];
  run(options?: JsonObject): Promise<JsonObject>;
}

export class AutonomyFleetSummary {
  constructor(options?: {
    monitor?: FleetHealthMonitor | JsonObject | null;
    budgetLedger?: AutonomyBudgetLedger | JsonObject | null;
  });
  summarize(options?: { escalations?: JsonObject[] }): JsonObject;
}

export class AutonomyRolloutGuard {
  evaluate(options?: {
    adjustment?: JsonObject | null;
    benchmarkReport?: JsonObject | null;
    minimumEvidenceScore?: number;
  }): JsonObject;
}

export class UnifiedExecutionGraph {
  constructor(options?: { graph?: EvidenceGraph | JsonObject | null });
  graph: EvidenceGraph;
  build(options?: {
    run?: Run | JsonObject | null;
    policyDecisions?: JsonObject[];
    memoryAudit?: JsonObject[];
    coordination?: JsonObject | null;
    learnedChanges?: JsonObject[];
    fleet?: JsonObject | null;
  }): EvidenceGraph;
  summarize(): JsonObject;
}

export class EnterpriseAutonomyArchitecture {
  constructor(options?: {
    services?: JsonObject[];
    storage?: JsonObject[];
    operators?: JsonObject[];
    environments?: JsonObject[];
    metadata?: JsonObject;
  });
  services: JsonObject[];
  storage: JsonObject[];
  operators: JsonObject[];
  environments: JsonObject[];
  metadata: JsonObject;
  build(): JsonObject;
}

export class EnterpriseOperatingModel {
  build(options?: {
    incident?: JsonObject | null;
    recovery?: JsonObject | null;
    rollback?: JsonObject | null;
    approvals?: JsonObject[];
    checkpoints?: JsonObject[];
    fleet?: JsonObject | null;
  }): JsonObject;
}

export class AutonomyStackConfig {
  constructor(options?: {
    id?: string | null;
    environment?: string | null;
    tenant?: string | null;
    routing?: JsonObject;
    policy?: JsonObject;
    memory?: JsonObject;
    autonomy?: JsonObject;
    fleet?: JsonObject;
    operator?: JsonObject;
    metadata?: JsonObject;
  });
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): AutonomyStackConfig;
}

export class AutonomyStackComparator {
  compare(
    leftConfig?: AutonomyStackConfig | JsonObject | null,
    rightConfig?: AutonomyStackConfig | JsonObject | null
  ): JsonObject;
}

export class AutonomyDriftGuard {
  evaluate(
    comparison?: JsonObject,
    options?: { blockedSections?: string[]; maxChanges?: number | null }
  ): JsonObject;
}

export class OperationalScorecard {
  evaluate(options?: {
    runs?: JsonObject[];
    governance?: JsonObject | null;
    memory?: JsonObject | null;
    routing?: JsonObject | null;
    operator?: JsonObject | null;
  }): JsonObject;
}

export class EnterpriseAutonomyBenchmarkSuite {
  constructor(options?: { evalHarness?: EvalHarness | JsonObject | null });
  buildScenarios(options?: {
    longLivedRun?: JsonObject | null;
    supervision?: JsonObject | null;
    rollback?: JsonObject | null;
  }): JsonObject[];
  run(options?: JsonObject): Promise<JsonObject>;
}

export class EnterpriseBoundaryProfile {
  constructor(input?: {
    environments?: Array<string | JsonObject>;
    approvalOrganizations?: Array<string | JsonObject>;
    externalSystems?: Array<string | JsonObject>;
    tenantBoundaries?: Array<string | JsonObject>;
  });
  validate(): JsonObject;
  toJSON(): JsonObject;
}

export class TransactionalExecutionPlan {
  static build(
    actions?: JsonObject[],
    options?: {
      defaultEnvironment?: string | null;
      requireVerification?: boolean;
    }
  ): JsonObject;
}

export class ReleaseEvidenceBundle {
  static build(input?: JsonObject): JsonObject;
}

export class RoutePromotionProof {
  static build(input?: JsonObject): JsonObject;
}

export class PolicyAutonomyAttestation {
  static issue(input?: JsonObject): JsonObject;
}

export class PreReleaseSimulationSuite {
  constructor(input?: JsonObject);
  buildScenarios(input?: JsonObject): JsonObject[];
  run(input?: JsonObject): Promise<JsonObject>;
}

export class FailureInjectionSuite {
  constructor(input?: JsonObject);
  buildScenarios(input?: JsonObject): JsonObject[];
  run(input?: JsonObject): Promise<JsonObject>;
}

export class ProofPromotionGate {
  evaluate(input?: JsonObject): JsonObject;
}

export class FederatedDelegationLedger {
  constructor(input?: { records?: JsonObject[] });
  record(input?: JsonObject): JsonObject;
  list(filters?: JsonObject): JsonObject[];
  summarize(): JsonObject;
}

export class FederatedAuditStitcher {
  constructor(input?: {
    ledgers?: Array<{
      source?: string;
      ledger?: GovernanceRecordLedger | JsonObject | null;
    }>;
    delegationLedger?: FederatedDelegationLedger | JsonObject | null;
  });
  stitch(filters?: JsonObject): JsonObject;
}

export class FederatedPromotionBoundaryAdvisor {
  evaluate(input?: JsonObject): JsonObject;
}

export class TrustCertificationExchange {
  static publish(input?: JsonObject): JsonObject;
  static merge(exchanges?: JsonObject[]): JsonObject;
}

export class ExternalControlPlaneCertificationKit {
  certify(target?: JsonObject, options?: {
    type?: string;
    name?: string | null;
  }): JsonObject;
}

export class WorkflowOutcomeContract {
  constructor(input?: JsonObject);
  evaluate(result?: JsonObject): JsonObject;
  toJSON(): JsonObject;
}

export class OutcomeScorecard {
  constructor(input?: JsonObject);
  evaluate(input?: JsonObject): JsonObject;
}

export class GovernedOutcomeOptimizationLoop {
  constructor(input?: JsonObject);
  review(input?: JsonObject): JsonObject;
}

export class TradeoffAnalyzer {
  evaluate(input?: JsonObject): JsonObject;
}

export class OutcomeOptimizationExperiment {
  static build(input?: JsonObject): JsonObject;
}

export class OutcomeReviewWorkflow {
  review(input?: JsonObject): JsonObject;
}

export class GovernanceRecordLedger {
  constructor(options?: { records?: JsonObject[] });
  records: JsonObject[];
  record(entry?: JsonObject): JsonObject;
  list(filters?: {
    surface?: string;
    correlationId?: string;
    candidateId?: string;
    runId?: string;
  }): JsonObject[];
  summarize(): JsonObject;
}

export class AuditStitcher {
  constructor(options?: {
    ledger?: GovernanceRecordLedger | JsonObject | null;
  });
  ledger: GovernanceRecordLedger;
  stitch(options?: {
    surface?: string;
    correlationId?: string;
    candidateId?: string;
    runId?: string;
  }): JsonObject;
}

export class GovernanceTimeline {
  constructor(options?: {
    ledger?: GovernanceRecordLedger | JsonObject | null;
  });
  ledger: GovernanceRecordLedger;
  build(options?: {
    surface?: string;
    correlationId?: string;
    candidateId?: string;
    runId?: string;
  }): JsonObject;
  render(timeline?: JsonObject): string;
}

export class OperatorDashboardSnapshot {
  constructor(options?: {
    summary?: OperatorSummary | JsonObject | null;
    timeline?: GovernanceTimeline | JsonObject | null;
  });
  summary: OperatorSummary;
  timeline: GovernanceTimeline;
  build(options?: {
    runs?: JsonObject[];
    incidents?: JsonObject[];
    rollouts?: JsonObject[];
    learnedChanges?: JsonObject[];
    assuranceReports?: JsonObject[];
    governance?: JsonObject;
  }): JsonObject;
}

export class OperatorControlLoop {
  constructor(options?: {
    triage?: OperatorTriageWorkflow | JsonObject | null;
    dashboard?: OperatorDashboardSnapshot | JsonObject | null;
  });
  triage: OperatorTriageWorkflow;
  dashboard: OperatorDashboardSnapshot;
  run(options?: {
    runs?: JsonObject[];
    incidents?: JsonObject[];
    rollouts?: JsonObject[];
    learnedChanges?: JsonObject[];
    assuranceReports?: JsonObject[];
    governance?: JsonObject;
    primaryRun?: Run | JsonObject | null;
    primaryIncident?: JsonObject | null;
    primaryAssurance?: JsonObject | null;
    primaryRollout?: JsonObject | null;
    primaryRollback?: JsonObject | null;
    context?: JsonObject;
  }): JsonObject;
}

export class PromptArtifact {
  constructor(options?: {
    id?: string;
    role?: string;
    content?: string;
    version?: string;
    metadata?: JsonObject;
  });
  id: string;
  role: string;
  content: string;
  version: string;
  metadata: JsonObject;
  toJSON(): JsonObject;
  static fromJSON(payload?: JsonObject): PromptArtifact;
}

export class PromptRegistry {
  constructor(options?: { prompts?: Array<PromptArtifact | JsonObject> });
  register(prompt: PromptArtifact | JsonObject): PromptArtifact;
  get(id: string): PromptArtifact | null;
  list(): JsonObject[];
}

export class RunRecipe {
  constructor(options?: {
    id?: string;
    tools?: Tool[];
    policy?: ToolPolicy | JsonObject | null;
    routing?: CapabilityRouter | JsonObject | null;
    memory?: Memory | JsonObject | null;
    approvals?: ApprovalInbox | JsonObject | null;
    metadata?: JsonObject;
  });
  buildAgentOptions(overrides?: JsonObject): JsonObject;
}

export class WorkflowPreset {
  constructor(options?: {
    id?: string;
    workflow?: Workflow | JsonObject | null;
    defaults?: JsonObject;
    metadata?: JsonObject;
  });
  instantiate(overrides?: JsonObject): JsonObject;
}

export class IncidentBundleExporter {
  export(options?: {
    run?: Run | JsonObject | null;
    traceBundle?: JsonObject | null;
    stateBundle?: JsonObject | null;
    policyEvaluation?: JsonObject | null;
    coordinationDiagnostics?: JsonObject | null;
    assuranceReport?: JsonObject | null;
    metadata?: JsonObject;
  }): JsonObject;
}

export class CredentialDelegationKit {
  issue(options?: {
    principal?: string;
    scope?: string[];
    expiresAt?: string | null;
    metadata?: JsonObject;
  }): JsonObject;
  validate(credential?: JsonObject, options?: { now?: Date }): JsonObject;
}

export class RoutePolicySimulator {
  constructor(options?: { router?: CapabilityRouter | JsonObject | null });
  simulate(scenarios?: JsonObject[]): Promise<JsonObject>;
}

export class LearnedAdaptationArtifact {
  constructor(options?: {
    proposal?: JsonObject;
    metadata?: JsonObject;
  });
  proposal: JsonObject;
  metadata: JsonObject;
  summarize(): JsonObject;
  toJSON(): JsonObject;
  diff(other?: LearnedAdaptationArtifact | JsonObject): JsonObject;
  static fromJSON(payload?: JsonObject): LearnedAdaptationArtifact;
  static readonly FORMAT: string;
  static readonly SCHEMA_VERSION: string;
}

export class ImprovementProposalEngine {
  constructor(options?: {
    learningLoop?: LearningLoop | JsonObject | null;
  });
  learningLoop: LearningLoop;
  buildProposals(options?: {
    branchComparison?: JsonObject | null;
    incident?: JsonObject | null;
  }): JsonObject[];
  exportArtifacts(options?: {
    branchComparison?: JsonObject | null;
    incident?: JsonObject | null;
  }): JsonObject[];
}

export class ImprovementActionPlanner {
  buildPlans(proposals?: Array<JsonObject | LearnedAdaptationArtifact>): JsonObject[];
  buildPlan(proposal?: JsonObject | LearnedAdaptationArtifact): JsonObject;
  compareArtifacts(left?: JsonObject | LearnedAdaptationArtifact, right?: JsonObject | LearnedAdaptationArtifact): JsonObject;
  buildRollbackPlan(proposal?: JsonObject | LearnedAdaptationArtifact): JsonObject;
}

export class GovernedImprovementLoop {
  constructor(options?: {
    proposalEngine?: ImprovementProposalEngine | JsonObject | null;
    governanceGate?: AdaptiveGovernanceGate | JsonObject | null;
    ledger?: AdaptiveDecisionLedger | JsonObject | null;
    adaptationEnvelope?: AdaptationPolicyEnvelope | JsonObject | null;
    effectTracker?: ImprovementEffectTracker | JsonObject | null;
    actionPlanner?: ImprovementActionPlanner | JsonObject | null;
  });
  ledger: AdaptiveDecisionLedger;
  proposalEngine: ImprovementProposalEngine;
  governanceGate: AdaptiveGovernanceGate;
  adaptationEnvelope: AdaptationPolicyEnvelope;
  effectTracker: ImprovementEffectTracker;
  actionPlanner: ImprovementActionPlanner;
  propose(options?: {
    branchComparison?: JsonObject | null;
    incident?: JsonObject | null;
  }): Promise<LearnedAdaptationArtifact[]>;
  review(options?: {
    branchComparison?: JsonObject | null;
    incident?: JsonObject | null;
  }): Promise<JsonObject>;
  recordOutcome(options?: {
    proposalId?: string;
    baseline?: JsonObject;
    outcome?: JsonObject;
    summary?: string | null;
    metadata?: JsonObject;
  }): JsonObject;
  summarizeEffects(): JsonObject;
  summarizeReview(review?: JsonObject): JsonObject;
  buildActionPlans(options?: {
    branchComparison?: JsonObject | null;
    incident?: JsonObject | null;
  }): JsonObject[];
}

export class AdaptationPolicyEnvelope {
  constructor(options?: {
    allowedTargetSurfaces?: string[];
    deniedTargetSurfaces?: string[];
    allowedChangeTypes?: string[];
    deniedChangeTypes?: string[];
    maxPriority?: 'low' | 'medium' | 'high' | 'critical';
    requireApprovalCategories?: string[];
    materialChangeTypes?: string[];
    constraints?: JsonObject;
  });
  evaluate(proposal?: JsonObject): JsonObject;
  explain(proposal?: JsonObject): string;
}

export class ImprovementEffectTracker {
  constructor(options?: { records?: JsonObject[] });
  record(record?: JsonObject): JsonObject;
  summarize(): JsonObject;
  explain(record?: JsonObject): JsonObject;
}

export class LearningBenchmarkSuite {
  constructor(options?: {
    effectTracker?: ImprovementEffectTracker | JsonObject | null;
    scenarios?: JsonObject[];
  });
  effectTracker: ImprovementEffectTracker;
  buildDefaultScenarios(): JsonObject[];
  run(options?: JsonObject): Promise<JsonObject>;
}

export class AdaptationRegressionGuard {
  constructor(options?: {
    effectTracker?: ImprovementEffectTracker | JsonObject | null;
    maxRegressions?: number;
    minConfidenceDelta?: number;
    maxFailureDelta?: number;
  });
  effectTracker: ImprovementEffectTracker;
  evaluate(records?: JsonObject[] | null): JsonObject;
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
    runLock?: RunLock | null;
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
    governance?: JsonObject;
    conversationStore?: BaseLayerStore | null;
    episodicMemory?: EpisodicMemory | null;
  });
  setWorkingMemory(key: string, value: any, options?: JsonObject): Promise<void>;
  getWorkingMemory(key: string, context?: JsonObject): any;
  listWorkingMemory(context?: JsonObject): any[];
  clearWorkingMemory(): Promise<void>;
  setProfile(key: string, value: any, options?: JsonObject): Promise<void>;
  setEntity(key: string, value: any, ttlMs?: number | null): Promise<void>;
  getEntity(key: string): any;
  clearEntities(): Promise<void>;
  getProfile(key: string, context?: JsonObject): any;
  listProfile(context?: JsonObject): any[];
  clearProfile(): Promise<void>;
  setPolicy(key: string, value: any, options?: JsonObject): Promise<void>;
  getPolicy(key: string, context?: JsonObject): any;
  listPolicies(context?: JsonObject): any[];
  clearPolicies(): Promise<void>;
  flushStorage(): Promise<void>;
  storeConversation(userMessage: string, agentResponse: string, metadata?: JsonObject): Promise<void>;
  getConversationHistory(): Promise<any[]>;
  deleteConversationHistoryBefore(timestamp: number): Promise<void>;
  clearConversation(): Promise<void>;
  getConversation(): any[];
  hydrate(): Promise<Memory>;
  compact(): void;
  decayExpired(): void;
  storeSemanticMemory(fact: string, metadata?: JsonObject): Promise<void>;
  searchSemanticMemory(query: string, topK?: number): Promise<any>;
  searchEpisodicMemory(query: string, options?: { limit?: number; tags?: string[]; runId?: string | null }): Promise<any[]>;
  searchSemanticMemoryWithProvenance(query: string, topK?: number): Promise<JsonObject[]>;
  searchAll(query: string, topK?: number): Promise<JsonObject[]>;
  get(key: string, options?: JsonObject): Promise<any>;
  set(key: string, value: any, options?: JsonObject): Promise<void>;
  clearSemanticMemory(): Promise<void>;
  clearAll(): Promise<void>;
  enforceRetention(): void;
  getMemoryAudit(filters?: JsonObject): JsonObject[];
  summarizeMemoryGovernance(): JsonObject;
}

export class RAG {
  constructor(options?: JsonObject);
  index(input: any, metadata?: JsonObject): Promise<any>;
  retrieve(query: string, options?: JsonObject): Promise<any[]>;
}

export class LocalVectorStore {
  capabilities: { namespaceIsolation: boolean };
  upsert(options: { vectors: Array<{ id: string; values: number[]; metadata?: any }>; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: { vector: number[]; topK?: number; namespace?: string | null; filter?: any }): Promise<{ matches: any[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export class ScopedVectorStore {
  constructor(options: { store: LocalVectorStore | any; tenantId: string; authorize(request: any): boolean | Promise<boolean> });
  capabilities: { namespaceIsolation: boolean };
  upsert(options: { vectors: Array<{ id: string; values: number[]; metadata?: any }> }): Promise<any>;
  query(options: { vector: number[]; topK?: number; filter?: any }): Promise<{ matches: any[] }>;
  delete(options: { ids: string[] }): Promise<void>;
  deleteAll(options?: Record<string, unknown>): Promise<void>;
}
export interface VectorRecord { id: string; values: number[]; metadata?: Record<string, any>; }
export interface VectorMatch { id: string; score: number; metadata: Record<string, any>; }
export interface VectorQuery { vector: number[]; namespace?: string | null; topK?: number; filter?: Record<string, any>; }
export interface VectorBackend {
  capabilities: { namespaceIsolation: boolean };
  upsert(options: { vectors: VectorRecord[]; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: VectorQuery): Promise<{ matches: VectorMatch[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export class FileVectorStore implements VectorBackend {
  constructor(options: { filePath: string; runLock?: RunLock | null; maxFileBytes?: number; maxEntries?: number });
  capabilities: { namespaceIsolation: boolean; persistence: boolean };
  upsert(options: { vectors: VectorRecord[]; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: VectorQuery): Promise<{ matches: VectorMatch[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export class PineconeVectorStore implements VectorBackend {
  constructor(options: { index: { namespace(name: string): any }; timeoutMs?: number });
  capabilities: { namespaceIsolation: boolean };
  upsert(options: { vectors: VectorRecord[]; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: VectorQuery): Promise<{ matches: VectorMatch[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export class QdrantVectorStore implements VectorBackend {
  constructor(options: { client: { upsert(collection: string, request: any): Promise<any>;
    query(collection: string, request: any): Promise<any>; delete(collection: string, request: any): Promise<any> };
    collection: string; timeoutMs?: number });
  capabilities: { namespaceIsolation: boolean };
  upsert(options: { vectors: VectorRecord[]; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: VectorQuery): Promise<{ matches: VectorMatch[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export class PgVectorStore implements VectorBackend {
  constructor(options: { client: { query(sql: string, params?: any[]): Promise<{ rows: any[] }> };
    table?: string; dimensions: number; timeoutMs?: number });
  capabilities: { namespaceIsolation: boolean };
  readonly schemaSql: string;
  upsert(options: { vectors: VectorRecord[]; namespace?: string | null }): Promise<{ insertedIds: string[] }>;
  query(options: VectorQuery): Promise<{ matches: VectorMatch[] }>;
  delete(options: { ids: string[]; namespace?: string | null }): Promise<void>;
  deleteAll(options?: { namespace?: string | null }): Promise<void>;
}
export interface Episode { id: string; content: JsonValue; runId: string | null; tags: string[]; createdAt: number; expiresAt: number | null; }
export class EpisodicMemory {
  constructor(options: { store: BaseLayerStore; tenantId: string; authorize(request: any): boolean | Promise<boolean>; maxEntries?: number });
  append(input: { content: JsonValue; runId?: string | null; tags?: string[]; ttlMs?: number | null }): Promise<Episode>;
  search(options?: { query?: string; runId?: string | null; tags?: string[]; limit?: number }): Promise<Episode[]>;
  forget(id: string): Promise<void>;
  clear(): Promise<void>;
  pruneExpired(): Promise<{ deleted: number }>;
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

export class MCPTool extends Tool {
  constructor(options: { name: string; description?: string; parameters?: JsonObject; outputSchema?: JsonObject | null;
    mcpClient?: MCPClient; endpoint?: string; apiKey?: string; remoteName?: string | null; strict?: boolean; metadata?: JsonObject });
}
export type MCPTransport = (request: { method: string; params: any; signal?: AbortSignal }) => Promise<any>;
export class MCPClient {
  constructor(options: { endpoint?: string; apiKey?: string | null; extraHeaders?: Record<string, string>;
    retryManager?: RetryManager; transport?: MCPTransport | null; requestTimeoutMs?: number; maxPages?: number });
  listTools(): Promise<any[]>;
  execute(name: string, args?: Record<string, any>): Promise<any>;
  toTools(options?: any): Promise<Tool[]>;
  close(): void;
}
export class MCPDiscoveryLoader {
  static load(options?: { endpoint?: string; apiKey?: string | null; serviceName?: string; mcpClient?: MCPClient; transport?: MCPTransport;
    metadataForTool?: ((definition: any) => JsonObject) | null }): Promise<JsonObject>;
}
export class OpenAPILoader {
  static load(filePath: string, options?: { serviceName?: string; authToken?: string | null }): JsonObject;
}
export class ApiLoader {
  static load(options?: {
    serviceName?: string;
    authToken?: string | null;
    apiSpec?: JsonObject;
    spec?: JsonObject | null;
  }): JsonObject;
}
export class CurlLoader {
  static load(curlCommand: string, options?: { serviceName?: string; authToken?: string | null }): JsonObject;
  static parse(curlCommand: string): JsonObject;
  static toApiSpec(parsed?: JsonObject): JsonObject;
}
export class PostmanLoader {
  static load(
    input: string | JsonObject,
    options?: { serviceName?: string; authToken?: string | null; variables?: JsonObject }
  ): JsonObject;
  static toApiSpec(collection: JsonObject, options?: { variables?: JsonObject }): JsonObject;
}
export class PineconeManager {}

export class RetryManager {
  static withoutRetries<T>(action: () => T): T;
  static isSingleAttempt(): boolean;
  constructor(options?: JsonObject);
  execute<T>(operation: () => Promise<T> | T, ...args: any[]): Promise<T>;
  executeWithPolicy<T>(
    operation: () => Promise<T> | T,
    options?: { policy?: AdaptiveRetryPolicy | JsonObject | null; context?: JsonObject; onEscalate?: Function | null },
    ...args: any[]
  ): Promise<T>;
}

export interface EmbeddingRecord { embedding: number[]; index?: number; }
export interface EmbeddingOptions { model?: string; signal?: AbortSignal; }

export class OpenAIAdapter {
  constructor(apiKey?: string, options?: JsonObject);
  embedChunks(chunks: string[], options?: EmbeddingOptions): Promise<EmbeddingRecord[]>;
}

export class GeminiAdapter {
  constructor(apiKey?: string, options?: JsonObject);
  embedChunks(chunks: string[], options?: EmbeddingOptions): Promise<EmbeddingRecord[]>;
}

export class AnthropicAdapter {
  constructor(apiKey?: string, options?: JsonObject);
}

export class HFAdapter {
  constructor(apiKey?: string, options?: JsonObject);
  embedChunks(chunks: string[], options?: EmbeddingOptions): Promise<EmbeddingRecord[]>;
}

export class DeepSeekAdapter {
  constructor(apiKey?: string, options?: JsonObject);
  embedChunks(chunks: string[], options?: EmbeddingOptions): Promise<EmbeddingRecord[]>;
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
