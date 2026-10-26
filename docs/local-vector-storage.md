# Persistent Local Vector Storage

FileVectorStore persists small local vector datasets without requiring a cloud
database or a new driver dependency. LocalVectorStore remains in-memory.

```js
const { FileVectorStore, ScopedVectorStore } = require('agnostic-agents');
const backend = new FileVectorStore({
  filePath: './.agnostic-agents/vectors.json',
  maxFileBytes: 16 * 1024 * 1024,
  maxEntries: 10000,
});
const vectors = new ScopedVectorStore({
  store: backend,
  tenantId: authenticatedTenantId,
  authorize: async request => hostAllowsVectorAccess(request),
});
```

The same upsert/query/delete/deleteAll contract works with VectorStoreRetriever and
Memory. Bind tenant identity in trusted host code, not model arguments. File contents
contain raw vectors and metadata; this is not encrypted storage or an authenticated
database. Keep the parent directory private and do not expose the backing file/client.

## Format And Consistency

The JSON snapshot has kind agnostic-agents/vector-snapshot, version 1.0 and an array
of namespaces containing records with id, values and metadata. Namespaces do not
become path names. IDs and namespaces remain data, not filenames or object prototypes.
Unknown versions, invalid JSON, null snapshots, malformed records and size/capacity
violations fail closed. A corrupt file is never silently replaced by an empty store.
No automatic migration is provided; retain a backup and migrate explicitly when a
future version is introduced. Changing a file path is not a migration or data deletion.

Every operation locks and reloads the snapshot. Separate instances see committed
changes without a cache invalidation protocol. Writes use private temporary files,
file fsync and atomic rename. Failed pre-rename writes leave the previous snapshot
readable. All mutation methods must be awaited to observe persistence failures.

FileRunLock is the default ownership mechanism and uses a shared local lock directory.
It excludes other processes but fails rather than waiting/stealing a live lock. A
SIGKILL can leave a stale lock and private orphaned temporary files. A trusted host
supervisor must establish that the writer has died, reconcile the canonical snapshot,
then remove only the known stale lock and orphan files. Never remove locks based only
on age. Live processes, ancestor symlinks/aliases and hostile shared filesystems are
outside this locking guarantee; use one trusted canonical file path/private directory.

No exactly-once external actions, distributed database transactions or power-loss
durability are promised. Directory-entry durability, filesystem behavior, encryption,
backup handling and cleanup require deployment-specific verification. The file-read
path refuses final-component symlinks where O_NOFOLLOW is supported; it is not a
general filesystem sandbox or ancestor-symlink protection.

## Bounds And Intended Workload

Defaults: 16 MiB snapshot, 10,000 total records, bounded JSON depth/node count and
the portable flat scalar filter subset. Constructor ceilings prevent unbounded file
limits. Each namespace must have consistent vector dimensions. Results are detached.
The whole snapshot is loaded/replaced and queries scan vectors linearly; this is a
small local persistence option, not an approximate-nearest-neighbor index or a
multi-machine production vector database. Use a service adapter for larger workloads.

## Local Evidence

tests/file-vector.unit.test.js covers re-instantiation, namespace separation, detached
results, deletion durability, corrupt/unknown snapshots, bounds, writer exclusion,
mocked ENOSPC/EACCES, symlink refusal and extreme finite-vector scoring. A real child
process is killed before saving, after temp-file fsync/before rename, and after
canonical replacement. The tests verify old/new committed snapshots and explicit
dead-owner lock reconciliation. Injected I/O faults do not establish actual hardware
power-loss resilience or production filesystem performance.
