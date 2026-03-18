# State Durable Restore

`StateDurableRestoreSuite` extends the base restore plan with durable restore
scenarios across:

- process workers
- queue workers
- service runtimes

It also adds workflow- and scheduler-aware steps when the portable state bundle
captures long-running execution.

## What it adds

On top of `StateRestorePlanner`, the suite can add:

- `restore_workflow_progress`
- `restore_scheduler_jobs`
- `verify_scheduler_job_alignment`

Those steps stay explicit and inspectable instead of living in deployment glue.

## Maintained example

- [`examples/referenceStateRestorePlanner.js`](../examples/referenceStateRestorePlanner.js)

That example shows one portable bundle being evaluated across process, queue,
and service restore targets while preserving long-running workflow and
scheduler references.
