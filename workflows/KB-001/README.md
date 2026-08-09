# KB-001 - Historical Knowledge Bootstrap Adapter v1

## Purpose and safety boundary

KB-001 is an inactive, manually triggered migration adapter for the `NOVEL001` legacy chapters. It does not rewrite prose or implement Knowledge business logic. It reads only a single `LEGACY_MASTER` full-text row at the expected chapter, attaches the matching human-curated row as validation context, and invokes the repository's existing WF-006 through WF-012 contracts one at a time. The safe exported default is chapter 1 only; it never starts the 1–182 migration automatically.

The fixed source priority is `chapter_content` (source of truth), then `historical_master_context` (validation), then Knowledge inference. The 18-column database's `MASTER正文` is deliberately never read into the WF-006 content field.

## Repository contract investigation

WF-006 requires root fields `schema_version: 1.0`, `route: chapter.persistence.created`, `status: ready`, `is_valid: true`, a `chapter` object containing non-empty `chapter_uuid`, `novel_uuid`, and `workspace_uuid`, a positive integer `chapter_number`, and a string `chapter_title`. `chapter_content` is a separate root string: `Validate Chapter Contract` allows it, `Extract Chapter Metadata` reads it into `source_content`, and `Extract Canon Input` passes that to Canon generation. Extra bootstrap data is therefore isolated in `_bootstrap_context`.

WF-006 does not call the later workflows. WF-000 v2 proves that the caller invokes WF-006, WF-007, WF-008, WF-009, WF-010, WF-011, and WF-012 in that order and validates each route. KB-001 follows the same caller-owned chain and waits for each subworkflow. WF-011 additionally needs the existing Drive root folder and performs exact-file search followed by update/create; WF-012 validates its persistence result. The repository does not contain a production spreadsheet ID for Master Story Database v1, a NOVEL001 workspace UUID, or its Drive root folder ID.

## Configuration

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `GOOGLE_SHEETS_CREDENTIAL_ID` | none | Existing `Google Sheets account` credential ID |
| `KB001_START_CHAPTER` | `1` | Inclusive start, validated in 1–182 |
| `KB001_END_CHAPTER` | `1` | Inclusive end; deliberately chapter 1 by default |
| `KB001_BATCH_ID` | generated | Stable batch ID; set this when resuming the same formal batch |
| `KB001_WORKSPACE_UUID` | none (blocking) | Existing NOVEL001 workspace UUID required by WF-006 |
| `KB001_ROOT_FOLDER_ID` | none (blocking) | Existing novel Drive root required by WF-011 |

The fixed flags are `bootstrap_mode=true`, `bootstrap_source=historical_1_182`, `source_priority=chapter_content`, `master_role=validation`, `force_historical_mode=true`, `allow_canon_overwrite=false`, `stop_on_error=true`, and `sequence_mode=SEQUENTIAL`.

## Google Sheets nodes

| Nodes | Spreadsheet | Worksheet | Operation |
| --- | --- | --- | --- |
| Load Historical Chapter Source | ID `1qJi6XSSKxliFyUbDiYFR5vLuyG0ejKJxzn8mHNRpivY` | `01_Master Chapters` | read with `novel_uuid`, exact `chapter_number`, and `LEGACY_MASTER` filters |
| Load Master Chapter Row | existing document resolved by exact name `Master Story Database v1` | `01_章節主表` | read exact `章號` |
| Read/Upsert Bootstrap Log nodes | same existing `Master Story Database v1` | `Historical Knowledge Bootstrap Log` | read and append-or-update by `idempotency_key` |

All use n8n Google Sheets node v4.6 and the existing credential convention: ID from `GOOGLE_SHEETS_CREDENTIAL_ID`, display name `Google Sheets account`. The log worksheet must already exist with the schema below; importing a workflow cannot create a worksheet safely.

## Historical Master Context schema

`historical_master_context` contains: `chapter_summary`, `major_events`, `characters`, `character_state_changes`, `realm_changes`, `factions`, `locations`, `items_and_techniques`, `foreshadowing_added`, `foreshadowing_progress`, `ending_hook`, `version_status`, `completeness`, `has_conflict`, and `conflict_ids`. `historical_conflict_ids` repeats the deduplicated `C###` array at bootstrap-context level. `known_historical_conflict` is true when that array is non-empty. None of these fields modify `chapter_content`.

## Log, cursor, resume, and idempotency

The worksheet schema is: `idempotency_key`, `batch_id`, `run_id`, `novel_uuid`, `chapter_number`, `status`, `started_at`, `completed_at`, `wf006_status` through `wf012_status`, `error_workflow`, `error_node`, `error_message`, and `retry_count`.

At startup, the cursor reads all NOVEL001 log rows and skips only the contiguous `COMPLETED` chapters from the configured start. A `FAILED` or absent expected chapter is retried; later completed rows never make the cursor jump over that gap. Every chapter uses the stable key `NOVEL001:chapter:<n>:historical-bootstrap`. RUNNING, FAILED, and COMPLETED are upserts of that same row. The retry counter increments from prior attempts. Cursor advancement happens only after WF-012 validates and the COMPLETED upsert succeeds.

The underlying WF-006–WF-010 generators create IDs at runtime, while WF-011 persists exact named files using update-or-create. The adapter's pre-chain completed gate and stable chapter key prevent replay of completed chapters. A failed chapter is retried without appending duplicate log records. `allow_canon_overwrite=false` and known conflicts are preserved as metadata; the existing WF-006 contract has no overwrite/supersede switch. Consequently, operators must not treat that flag as a new WF-006 business rule. The existing WF-011 exact-file update is the only repository persistence mechanism and remains a live-test safety concern.

## Validation and errors

Historical validation requires exactly one filtered row, matching novel and expected chapter, title, non-empty content of at least 200 characters (summary guard), exact `LEGACY_MASTER`, and declared length within max(20 characters, 5%). It never falls back to a summary or `MASTER正文`. A missing/multiple Master validation row also stops execution.

Every execute-workflow node waits synchronously. Unexpected route, invalid result, error/review-blocking state writes FAILED stage status and then uses Stop And Error. No next chapter can start. Only WF-012 `ready` or valid `review_required` completes the chain. The workflow contains a single back-edge after the COMPLETED log and uses no batches, promises, workers, or parallel chapter branches.

## Live-test status

Repository-level parse, structure, reference, Sheets configuration, JavaScript syntax, source-filter, contract, cursor, and idempotency simulations are covered by `tests/test_kb001.js`. Live Chapter 1 is **BLOCKED** because this repository has no Google credential/runtime access, no Master Database spreadsheet ID binding (the export safely resolves its known name), no confirmation that the log worksheet exists, no NOVEL001 workspace UUID, and no Drive root folder ID. Therefore Chapter 2 and the Chapter 1–3 smoke test were not run. Once an operator supplies those resources, import inactive, keep `KB001_END_CHAPTER=1`, create/confirm the log headers, execute Chapter 1 manually, and inspect the log and Knowledge files before widening the range.
