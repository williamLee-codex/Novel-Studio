# KB-001 Chapter 1 Idempotency and Non-destructive Persistence Report v1.1

## Overall status

**BLOCKED**

Repository implementation and static retry verification are **PASS**. Chapter 1 live run 1 and live rerun 2 are **NOT_TESTED** because this environment has no production n8n instance, Google credentials, immutable Master Story Database ID, workflow internal IDs, workspace UUID, or Drive root ID. No Chapter 2 execution was attempted.

## Safe fix

The existing production persistence design is retained:

1. WF-011 searches by exact parent folder plus exact filename.
2. An existing file is updated; a missing file is uploaded.
3. The manifest now names this existing behavior `upsert_exact_path` and records the relative path as its `upsert_key`.
4. Knowledge object identities no longer use `Date.now()`/`Math.random()`. They use stable keys based on the existing `novel_uuid`, `chapter_uuid`, `chapter_number`, and layer-specific knowledge keys.
5. KB-001 passes its existing bootstrap `idempotency_key` to WF-011. WF-011 derives a stable `persistence_id` from that key.
6. KB-001 resume still skips a chapter whose log status is `COMPLETED`. Therefore a normal second workflow execution for Chapter 1 performs no Knowledge-chain writes.

This is a minimal hardening of the existing exact-file upsert and chapter identity mechanisms; it does not introduce a second persistence architecture.

## Actual keys

| Layer | Stable record/upsert key | Deterministic ID |
|---|---|---|
| Canon | `<novel_uuid>|chapter|<chapter_number>|<chapter_uuid>` | `CANON-<stable-hash>` |
| Character | `<novel_uuid>|character|<normalized-character-name>` | `CHR-<stable-hash>` |
| World | `<novel_uuid>|world|<world_type>|<normalized-world-name>` | `WLD-<stable-hash>` |
| Timeline | `<novel_uuid>|timeline|<chapter_number>|<event_order>|<normalized-event-name>` | `TML-<stable-hash>` |
| Story Bible | `<novel_uuid>|story-bible` | `BIB-<stable-hash>` |
| Knowledge Persistence execution | `_bootstrap_context.idempotency_key` | `KPS-<stable-hash>` |
| Google Drive file | `<exact-parent-folder-id>|<exact-file-name>`; manifest key is `<relative-folder>/<file-name>` | Existing Drive file ID is retained on update |
| Bootstrap log | `<novel_uuid>:chapter:<chapter_number>:historical-bootstrap` | append-or-update matching column `idempotency_key` |

For Chapter 1, the bootstrap idempotency key is `NOVEL001:chapter:1:historical-bootstrap`; the chapter UUID is `NOVEL001-CH-001`.

## Retry behavior

| Scenario | Status | Behavior |
|---|---|---|
| Same input reaches WF-006–WF-011 twice | PASS (static) | Stable keys generate the same Canon, Character, World, Timeline, Story Bible, and persistence identifiers. Exact Drive paths route to update rather than duplicate upload. |
| Chapter 1 has a `COMPLETED` bootstrap log and KB-001 is run again | PASS (static) | Resume resolves beyond Chapter 1 and finishes without invoking WF-006–WF-012. |
| Technical error from Sheets/Execute Workflow | PASS (static) | v1.1 removes `continueRegularOutput`; execution stops and cannot advance the cursor. |
| Live partial failure followed by retry | NOT_TESTED | Requires production n8n/Drive and before/after inspection. |

## Before/after record counts

No production counts were available and no values are fabricated.

| Knowledge layer | Before run 1 | After run 1 | Before rerun 2 | After rerun 2 | Live conclusion |
|---|---:|---:|---:|---:|---|
| Canon | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Character | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| World | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Timeline | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Story Bible | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Knowledge Persistence files | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |

The static fixture runs the same Chapter 1 keys twice and confirms that each layer's set cardinality is unchanged on the second pass. These are identity assertions, not production record counts.

## `allow_canon_overwrite=false`

The flag is retained in `_bootstrap_context` and now reaches WF-011. Retry safety is enforced through deterministic record keys, exact-path file upsert, and the completed-log short circuit. A live verification remains mandatory before declaring the non-destructive requirement operationally PASS. Historical conflicts are not resolved or promoted by this change.

## Required live test

**BLOCKED**

An operator with production access must:

1. Keep `KB001_START_CHAPTER=1`, `KB001_END_CHAPTER=1`, and multi-chapter mode disabled.
2. Capture counts and exact IDs/Drive file IDs for all six layers.
3. Execute Chapter 1 once and require WF-006–WF-012 plus `COMPLETED` log.
4. Capture after-run counts.
5. Execute KB-001 again with the same Chapter 1 range.
6. Confirm the resume short circuit performs zero Knowledge writes, all counts and IDs remain unchanged, and no Chapter 2 execution exists.
7. Test a controlled retry only if a safe disposable copy or approved rollback is available.

Chapter 2 remains **BLOCKED** until these live assertions are PASS.
