# WF-012 — Knowledge Integrity Manager v2

## Purpose

WF-012 receives the latest `knowledge.persistence.completed` result emitted by WF-011, verifies persistence evidence, optionally validates a supplied knowledge snapshot, scores integrity issues, and returns one deterministic integrity report for WF-013. It never reads or changes persisted files, invents knowledge, corrects records, or resolves conflicts.

## Architecture

The workflow is a single linear n8n workflow with 16 functional nodes and five documentation notes. Every functional step is an Execute Workflow Trigger or a plain JavaScript Code node; there are no service, storage, credential, AI, or branching nodes.

```mermaid
flowchart LR
  A[Workflow Trigger] --> B[Validate Persistence Route]
  B --> C[Extract Persistence Context]
  C --> D[Extract Knowledge Snapshot]
  D --> E[Validate Required Files]
  E --> F[Validate Persistence Summary]
  F --> G[Validate File Results]
  G --> H[Validate Knowledge Identifiers]
  H --> I[Detect Duplicate Identifiers]
  I --> J[Validate Character References]
  J --> K[Validate World References]
  K --> L[Validate Timeline Ordering]
  L --> M[Collect Unresolved Conflicts]
  M --> N[Calculate Integrity Score]
  N --> O[Build Integrity Report]
  O --> P[Build Final Output]
```

## Input contract from WF-011

The source of truth is the current WF-011 `Build Final Output` contract. WF-012 requires `schema_version: "1.0"`, route `knowledge.persistence.completed`, `status: "ready"`, `is_valid: true`, a completed `persistence` object with story-bible, novel, and workspace IDs, a `summary` object, a `files` array, and a `context` object. WF-011 emits `provider: "google_drive"`, but WF-012 preserves rather than hard-codes or calls that provider.

The task example shows empty identifiers and zero file counts for readability; those values do **not** form a valid successful input. The repository contract also includes `existing_root_folder_id` in `persistence` and `canon_uuid` in `context`; WF-012 intentionally extracts only the fields specified for its persistence context. WF-011 does not currently emit a snapshot, so a caller may augment its result with any supported optional snapshot source.

## Persistence verification rules

WF-012 validates the envelope independently of persistence evidence. Contract errors are accumulated in `validation_errors`; invalid input still traverses every node and produces the defined error output. File evidence is checked directly rather than trusting summary counts.

### Required file rules

Exactly these nine names are required:

1. `StoryBible.json`
2. `StoryBible.md`
3. `Canon.json`
4. `Characters.json`
5. `World.json`
6. `Timeline.json`
7. `Conflicts.json`
8. `KnowledgeIndex.json`
9. `KnowledgePersistenceManifest.json`

Each must have a matching result with `status: "success"`, a non-empty `resource_id`, and a non-empty `relative_path`. Missing, failed, and duplicate results are reported separately. The declared summary must say nine required, nine successful required, and zero failed required; total arithmetic and actual result counts must also agree. Every file result is validated for name, path, supported status, status-dependent fields, and optional timestamp syntax.

## Knowledge snapshot behavior

Snapshots may be supplied at `knowledge_snapshot`, `context.knowledge_snapshot`, `story_bible`, or `context.story_bible`, in that precedence order. A Story Bible source may expose collections under `sections`. Input is copied into a normalized snapshot containing `story_bible`, `canon`, `characters`, `worlds`, `timeline`, and the three conflict arrays. Source objects are not mutated.

A missing snapshot is valid. Persistence checks continue, knowledge checks return empty findings, and one informational `KNOWLEDGE_SNAPSHOT_ABSENT` issue is recorded. Empty supplied collections are valid and receive informational entries.

## Identifier validation

When a snapshot is available, Story Bible, character, world, and timeline required identifiers are checked. Character and world names and timeline event names are also required. Every collection-level novel and workspace identifier must exactly equal the corresponding persistence identifier. Missing Story Bible IDs and cross-object novel/workspace mismatches are critical. Missing timeline chapter references are errors.

## Duplicate detection

UUID duplicates are detected independently in characters, worlds, and timeline events and are errors. Deterministically normalized keys use trimmed, lower-cased, whitespace-collapsed values:

- character name;
- world type plus world name;
- event name plus chapter number plus event order.

Normalized-key duplicates are warnings. Records are neither merged nor removed.

## Character reference validation

Character names and explicit aliases form the accepted normalized index. Only supplied timeline `participants` are checked. Empty values are ignored; unknown values produce `timeline_participant` warning records. WF-012 does not infer characters from proper nouns.

## World reference validation

World names, explicit aliases, faction names, and location names are indexed according to deterministic world-type allowlists. Timeline `location`/`locations` values are checked against location-like types, while `faction`/`factions` values are checked against faction-like types. Unknown references are warnings; no world objects are created.

## Timeline ordering validation

The original timeline order is preserved. Chapter number and event order must be non-negative integers; event name and source chapter UUID must be present. The validator detects order regression, chapter regression, duplicate event order within a chapter, and missing chapter references without sorting or rewriting records.

## Conflict handling

Character, world, and timeline conflicts are copied into a common shape containing conflict type, entity name, field, existing value, incoming value, and source reference. Each preserved unresolved conflict produces a warning. No conflict is resolved.

## Severity levels

- **critical:** invalid persistence contract, missing/failed required files, missing Story Bible identifiers, and novel/workspace mismatches.
- **error:** duplicate UUIDs, invalid required file evidence, required summary mismatches, malformed timeline ordering fields, and missing timeline chapter references.
- **warning:** duplicate normalized keys, unknown explicit references, ordering regressions, duplicate event order, and unresolved conflicts.
- **info:** absent optional snapshot, optional file failure, and empty supplied collections.

## Integrity scoring and grades

Scoring begins at 100 and is clamped to 0–100. Each critical issue subtracts 25, each error 10, each warning 3, and informational issues subtract zero.

| Score | Grade |
|---:|---|
| 95–100 | `excellent` |
| 85–94 | `good` |
| 70–84 | `attention_required` |
| 50–69 | `degraded` |
| 0–49 | `critical` |

## Readiness rules

- `ready`: no critical or error issues (warnings are allowed).
- `review_required`: one or more errors and no critical issues.
- `blocked`: one or more critical issues.
- Invalid intake overrides readiness and returns final `status: "error"`.

## Integrity Report schema

A valid input produces one report with an `INT-` identifier, persistence IDs, version `1.0`, readiness, score, grade, the complete issue list, all category-specific finding arrays, the integrity summary, ISO creation time, and `created_by: "Novel Studio WF-012"`. The summary includes severity counts, required-file verification, snapshot availability, checked collection counts, and unresolved conflict/reference counts.

## Final output contracts

All outputs use schema `1.0`, workflow version `2.0`, route `knowledge.integrity.completed`, and target `WF-013`.

- Ready: `status: "ready"`, `is_valid: true`, report present, context present.
- Review: `status: "review_required"`, `is_valid: true`, report present, empty context.
- Blocked: `status: "blocked"`, `is_valid: false`, report present, empty context.
- Invalid intake: `status: "error"`, `is_valid: false`, `integrity_report: null`, empty context.

Context is retained only for ready output. It is suppressed for review-required, blocked, and invalid outputs exactly as defined by the final contracts.

## Null-safety behavior

Every Code node validates parent shapes, accepts empty arrays, and supplies local defaults before reading nested fields. No node references another node by name or assumes an optional branch ran. The workflow is linear, and invalid data reaches `Build Final Output` without an exception. Intermediate fields are excluded by the final Code node's explicit output construction.

## Import guide

1. In n8n 2.29 or later, choose **Import from File**.
2. Select `WF-012_Knowledge_Integrity_Manager_v2.0.json`.
3. Confirm the workflow contains one Execute Workflow Trigger, 15 Code nodes, and five Sticky Notes.
4. Save the workflow. No credentials or environment configuration are required.

## Connection instructions

Invoke WF-012 from WF-011 (or an orchestrator) after WF-011 returns `knowledge.persistence.completed`. Pass the full WF-011 JSON result unchanged, optionally adding one supported `knowledge_snapshot`. Consume WF-012's `knowledge.integrity.completed` result in WF-013. Do not connect any storage service to this workflow for verification; v2.0 validates only supplied persistence evidence.

## Testing

Test fixtures should cover: all nine files; missing or failed required evidence; contradictory summaries; no snapshot; duplicate UUIDs; unknown participant, location, and faction references; persistence-ID mismatches; duplicate event order; unresolved conflicts; and malformed intake routes. Structural validation should also verify connections, node allowlists, one trigger, absence of credentials and crypto APIs, and JSON/JavaScript parseability.

## Known limitations

- No AI-based semantic consistency checking.
- No prose comparison.
- No persistent cross-run identity database.
- Reference validation depends on supplied knowledge snapshot.
- Name and alias matching is deterministic only.
- Conflicts are detected but not resolved.
- No automatic correction.
- No Google Drive read-back verification in v2.0.

## Version history

- **2.0** — Initial complete WF-012 deterministic persistence and knowledge integrity workflow for n8n 2.29+.
