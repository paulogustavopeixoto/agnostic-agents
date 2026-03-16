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
  summarize(): JsonObject;
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
  run<T>(operation: () => Promise<T> | T): Promise<T>;
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
