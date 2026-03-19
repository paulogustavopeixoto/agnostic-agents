# Operator Checklists

These are the maintained review checklists for `v16 Operator OS`.

## Rollout review

- confirm the candidate id, rollout scope, and rollback target
- check fleet safety and impact signals before promotion
- check assurance verdicts and violations
- confirm whether any learned change is bundled into the rollout
- record the governance decision and correlation id

## Incident review

- inspect the failed run summary and run tree
- generate an incident report and trace diff
- identify the last safe checkpoint before replay or branching
- confirm whether the incident requires approval, quarantine, or rollback
- stitch the incident into the broader governance timeline if it affects an active rollout

## Adaptation review

- inspect the learned change proposal and rollback metadata
- confirm the adaptation stays within the approved envelope
- review measured effect summaries and regression guards
- confirm whether the change is already part of a rollout candidate
- record approval, rejection, or quarantine in the governance ledger
