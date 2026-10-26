# Provider And Vector Integration Targets

Updated 2026-10-23. This is a practical ten-provider coverage shortlist across text,
open-model hosting, speech, images and video, **not a universal popularity ranking**.
ProviderCatalog.list() and ProviderCatalog.vectorStores() expose detached descriptors,
not live certification evidence. Custom integrations remain first-class.

## Ten Model And Media Providers

| Provider | Entry point | Integration boundary |
| --- | --- | --- |
| OpenAI | OpenAIAdapter | Existing text/tools/embeddings/image/audio adapter |
| Anthropic | AnthropicAdapter | Existing text/tool adapter, not image/video generation |
| Google Gemini | GeminiAdapter | Existing text/tools/embeddings/image/video analysis; no bundled video generation |
| Hugging Face | HFAdapter | Existing adapter; hosted inference availability depends on model/provider |
| DeepSeek | DeepSeekAdapter | Existing adapter; declarations are not fresh live evidence |
| Mistral | MistralAdapter | New explicit-model chat/tool compatibility subset |
| xAI | XAIAdapter | New explicit-model chat/tool subset, not native Responses |
| ElevenLabs | ElevenLabsProducer | New bounded MP3 producer with host artifact storage |
| fal.ai | FalJobBackend | New image/video submission, persisted-ID polling and cancellation requests |
| Higgsfield | HiggsfieldJobBackend | New image/video submission, persisted-ID polling and cancellation requests |

The five new paths have deterministic contract tests; the existing five retain their
prior adapter tests. No live verification was performed for the new paths. The set
is not collectively certified for every model/modality. Unsupported features reject.

## Three Vector Backends

| Backend | Entry point | Contract |
| --- | --- | --- |
| Pinecone | PineconeVectorStore | Host SDK v4-style Index, native namespace operations |
| Qdrant | QdrantVectorStore | Host JS REST client, payload namespaces and namespace-derived UUIDs |
| PostgreSQL / pgvector | PgVectorStore | Host query client, parameterized SQL and namespace-qualified composite keys |

All three implement upsert/query/delete/deleteAll for VectorStoreRetriever, Memory
and ScopedVectorStore. LocalVectorStore remains the local/offline option. Wrap a
backend in ScopedVectorStore to bind host-authenticated tenant scope and authorization.
These are contract-tested implementations, not live-certified installations.

Portable filters support scalar equality/inequality, $in/$nin, $exists, $and and $or
over flat alphanumeric/underscore/hyphen keys. Unsupported conditions fail before
dispatch. Filtered fields must contain scalars; nested paths, null comparison, array
membership, regex and arbitrary backend DSLs are not portable.
Qdrant owns its internal payload layout and requires compatible unnamed vectors.
Dimensions/metric must match the embedding model. PgVectorStore.schemaSql returns
host-reviewable DDL with PRIMARY KEY(namespace,id); it does not provision extensions,
tables, indexes, roles or RLS. Supabase can supply a compatible pgvector client but
is not separately certified by that fact.

Configure SDK retries/timeouts and database statement timeouts in the host. Local
adapter deadlines and sanitized failures do not prove backend writes stopped.
Reconcile uncertain outcomes before retrying. SQL run/job persistence and binary
artifact storage remain separate concerns; PostgreSQL/SQLite/MySQL are not a
replacement for this vector shortlist. No SQL run/job store is added here.

## Provider Wiring

MistralAdapter/XAIAdapter require an API key and explicit model. They normalize
modern tools, usage and completion status, translate legacy Agent tool history,
propagate signals, and do not retry internally. GuardedProvider supplies host
egress authorization and per-model restrictions.

ElevenLabsProducer requires apiKey, voiceId, model and saveArtifact(asset, context).
Wrap it in ProducerRuntime for inspectable authorized runs or ProducerTool for
tool-policy/approval gates. The callback receives bounded MP3 bytes and returns
{ artifactId }; hosts supply tenancy, retention and storage. This is speech generation,
not a live conversational voice adapter or a provider-side zero-retention guarantee.

FalJobBackend/HiggsfieldJobBackend require apiKey, modelPath, operation,
toInput(request, context) and toContent(result, context). ProducerJobRunner persists
IDs and bounds polling. A provider/model/operation binding prevents accidental
resumption through a different backend. Unknown states fail; failed/moderated/canceled
jobs do not become successful output.

toContent imports/registers assets and returns normalized image/video references.
It receives jobId for idempotent handling across crashes. Adapters never follow
service-supplied status/result/CDN URLs or forward API credentials to asset storage.
Hosts must implement bounded, authorized imports with destination checks.
cancel() acknowledges a cancellation request, not confirmed termination or refunds.
ProducerJobRunner cancellation stops local polling, not remote production. No webhook
verification, uploads, native realtime transport or exhaustive model schemas are implied.

New HTTP paths use fixed HTTPS origins, refuse redirects, bound sizes/local wait,
sanitize failures and never retry internally. These are not network firewalls or
DNS/SSRF protection for arbitrary host/tool code.

## Verification

One offline check covers contracts, security regressions, types and the example:

```sh
npm run test:foundation
```

Offline configuration/optional-driver checks make no API calls:

```sh
npm run test:certify:preflight
npm run test:certify:vectors:preflight
```

Provider preflight lists all ten; vector preflight checks host drivers. The package
does not force pg or @qdrant/js-client-rest dependencies on consumers.

Explicit opt-ins to billable/service calls, from a repository checkout:

```sh
npm run test:certify:providers
npm run test:certify:expanded
npm run test:certify:vectors
```

The provider command remains the **primary text-smoke subset**: OpenAI/Anthropic/Gemini
text, OpenAI embeddings and one OpenAI tool flow. It requires their keys and explicit
test model IDs. It does not run ten-provider/media certification.

The expanded command requires configuration for all ten entries and explicitly runs
their live smoke suites, including billable speech/image/video generation. Media jobs
require a model path, operation, input JSON and declared output MIME type; the offline
preflight lists exact environment variable names. Use tiny, non-sensitive test inputs.
Media tests register HTTPS output references in a temporary in-memory registry; they
do not download/validate asset bytes or prove durable asset hosting. Speech tests
inspect bounded returned MP3 bytes. These smoke tests do not certify every capability
or replace an application end-to-end test. No expanded live run was performed here.
Remote media run IDs are persisted privately under .agnostic-agents/certification
(Git-ignored) for uncertain-job reconciliation; cancellation cleanup is best effort.

Vector verification requires all three host-provisioned test resources and optional
drivers; preflight reports required variable names. It writes disposable UUID-prefixed
namespaces, checks visibility/isolation/deletion, and attempts scoped cleanup. Use test
accounts/collections/tables only. It does not provision infrastructure automatically.
Missing configuration/drivers block the command; service failures never become passes.
No vector live run was performed here.

Keep secrets out of source/logs/prompts and rotate credentials previously disclosed.
Record provider/model/service/SDK/version/date and measured results before promoting
support labels. Independent security review and deployed isolation remain separate.

## Minimal Vector Wiring

```js
const { PgVectorStore, ScopedVectorStore, VectorStoreRetriever } = require('agnostic-agents');

// pool and the provisioned table belong to the host. authenticatedTenantId must
// come from verified host identity, not model arguments or an arbitrary header.
const backend = new PgVectorStore({ client: pool, table: 'agent_vectors', dimensions: 1536 });
const vectors = new ScopedVectorStore({
  store: backend,
  tenantId: authenticatedTenantId,
  authorize: async ({ operation, tenantId }) => hostCanAccess(operation, tenantId),
});
const retriever = new VectorStoreRetriever({ vectorStore: vectors, adapter: guardedEmbeddingProvider });
```

Swap backend for PineconeVectorStore({ index }) or QdrantVectorStore({ client,
collection }) without replacing the retriever/tenant boundary. Provision matching
dimensions and use a guarded embedding provider for memory and retrieval egress.

## API References Reviewed

- [Mistral chat](https://docs.mistral.ai/api/endpoint/chat)
- [xAI chat compatibility](https://docs.x.ai/developers/rest-api-reference/inference/chat-completions)
- [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [fal asynchronous inference](https://fal.ai/docs/documentation/model-apis/inference/queue)
- [Higgsfield quick start](https://open.higgsfield.ai/quick-start)
- [Pinecone namespace operations](https://sdk.pinecone.io/typescript/classes/Index.html), with bundled v4 declarations checked locally
- [Qdrant query](https://api.qdrant.tech/api-reference/search/query-points)
- [pgvector](https://github.com/pgvector/pgvector)
