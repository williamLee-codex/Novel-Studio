# WF-003 - Workspace Manager v2

## Purpose

Workspace Manager v2 consolidates novel metadata intake, logical workspace
generation, and deferred persistence planning into one n8n workflow. It accepts
the canonical Novel Manager v2 output and returns a complete workspace plus
ordered folder/file operations for the next business boundary.

It only transforms data. It does not create folders or files, execute a plan,
call an API, use a database or provider, load credentials, or access OpenAI,
Google Drive, Google Sheets, or the filesystem.

## Architecture

The workflow has 14 functional nodes and 13 direct connections:

| Section | Nodes | Responsibility |
| --- | --- | --- |
| Workspace Intake | Workflow Trigger through Extract Novel Metadata | Validate WF-002 and isolate canonical novel/Telegram fields |
| Workspace Generation | Generate Workspace UUID through Build Workspace Object | Generate names, manifests, identity, and audit fields |
| Persistence Planning | Validate Workspace Object through Build Persistence Plan | Validate the workspace and create 19 deferred operations |
| Final Output | Normalize Workspace Contract, Build Final Output | Remove intermediates and emit the ready/error contract |

One Execute Workflow Trigger accepts all incoming data. There is no internal
Execute Workflow node. Invalid data follows the same path and reaches the final
output without an intentional exception.

## Workflow Diagram

```text
Workflow Trigger → Validate Novel Metadata → Extract Novel Metadata
→ Generate Workspace UUID → Generate Workspace Names
→ Generate Folder Manifest → Generate File Manifest → Build Workspace Object
→ Validate Workspace Object → Build Folder Operations → Build File Operations
→ Build Persistence Plan → Normalize Workspace Contract → Build Final Output
```

## Source Workflows Merged

- `workflows/WF-003/P01/` — Novel Workspace Provisioner
- `workflows/WF-003/P02/` — Workspace Persistence Contract

Both original directories remain unchanged. Their README and JSON files are
copied byte-for-byte to `archive/P01` and `archive/P02`. The consolidated
workflow removes the former P01 output/P02 input boundary and second trigger.

## Input Contract from WF-002

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "novel.metadata.created",
  "target": "WF-003",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "novel": {
    "novel_uuid": "NOV-a1b2c3d4",
    "novel_id": null,
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "novel_status": "draft",
    "created_at": "2026-08-01T00:00:00.000Z",
    "updated_at": "2026-08-01T00:00:00.000Z",
    "created_by": "Novel Studio WF-002"
  },
  "context": {
    "telegram_update_id": 123,
    "telegram_chat_id": 456,
    "telegram_user_id": 789,
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

This is the actual latest consolidated WF-002 contract. Validation requires the
version, route, ready/valid state, novel object, UUID, slug, title, status, and
context. Errors accumulate instead of throwing.

## Workspace UUID Rules

The established Math.random-based `uuidHelper()` produces a UUID-shaped local
value. Its first eight hexadecimal characters receive the `WS-` prefix, for
example `WS-a1b2c3d4`. No cryptographic UUID API, external package, database, or
sequential counter is used.

## Workspace Naming Rules

`workspace_name` preserves the novel title. `root_folder_name` is a lowercase,
safe folder name derived from the existing novel slug by retaining ASCII letters,
digits, and hyphens. If nothing remains, it falls back to
`novel-<workspace UUID suffix>`. No external transliteration occurs.

## Folder Manifest

The stable nine-entry manifest is:

```json
["01_Source", "02_Chapters", "03_Canon", "04_Characters", "05_World", "06_Outline", "07_Assets", "08_Publish", "09_Backup"]
```

## File Manifest

The stable nine-entry manifest is:

```json
["Novel.json", "Metadata.json", "README.md", "StoryBible.md", "CharacterIndex.json", "CanonIndex.json", "WorldIndex.json", "Outline.md", "PublishLog.json"]
```

## Folder Operation Schema

The first operation defines the root with an empty `relative_path`. Nine child
operations follow in manifest order and use the root folder as their relative
parent.

```json
{
  "operation_id": "FOLDER-001",
  "operation_type": "create_folder",
  "relative_path": "",
  "folder_name": "the-glass-city",
  "sequence": 1,
  "required": true
}
```

IDs run from `FOLDER-001` through `FOLDER-010`. They are operation-local sequence
labels, not persistent resource identifiers.

## File Operation Schema

Each manifest file becomes one deferred operation under the root:

```json
{
  "operation_id": "FILE-001",
  "operation_type": "create_file",
  "relative_path": "the-glass-city",
  "file_name": "Novel.json",
  "content_type": "application/json",
  "initial_content": "{}",
  "sequence": 1,
  "required": true
}
```

JSON files use `application/json`; Markdown files use `text/markdown`. Initial
content is exactly `{}` for Novel/Metadata, `[]` for the four index/log JSON
files, the novel title heading for README, `# Story Bible`, and `# Outline`.

## Persistence Plan Schema

The plan uses a non-cryptographic `PLAN-xxxxxxxx` identifier, provider
`unassigned`, mode `deferred`, workspace/root identity, ten folder operations,
nine file operations, `total_operations: 19`, and an ISO 8601 creation time. It
is a definition only and performs no write.

## Final Output Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "workspace.persistence.requested",
  "target": "WF-004",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "workspace": {
    "workspace_uuid": "WS-a1b2c3d4",
    "workspace_name": "The Glass City",
    "novel_uuid": "NOV-a1b2c3d4",
    "novel_id": null,
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "novel_status": "draft",
    "root_folder_name": "the-glass-city",
    "folder_manifest": ["01_Source", "02_Chapters", "03_Canon", "04_Characters", "05_World", "06_Outline", "07_Assets", "08_Publish", "09_Backup"],
    "file_manifest": ["Novel.json", "Metadata.json", "README.md", "StoryBible.md", "CharacterIndex.json", "CanonIndex.json", "WorldIndex.json", "Outline.md", "PublishLog.json"],
    "workspace_version": "1.0",
    "created_at": "2026-08-01T00:00:01.000Z",
    "updated_at": "2026-08-01T00:00:01.000Z",
    "created_by": "Novel Studio WF-003"
  },
  "persistence_plan": {
    "persistence_plan_id": "PLAN-e5f6a7b8",
    "provider": "unassigned",
    "persistence_mode": "deferred",
    "workspace_uuid": "WS-a1b2c3d4",
    "root_folder_name": "the-glass-city",
    "folder_operations": [],
    "file_operations": [],
    "total_operations": 19,
    "created_at": "2026-08-01T00:00:01.001Z"
  },
  "context": {
    "telegram_update_id": 123,
    "telegram_chat_id": 456,
    "telegram_user_id": 789,
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

The operation arrays are abbreviated above; actual successful output contains
all 10 folder and nine file operations.

## Invalid-Input Behavior

Invalid input keeps the version, route, target, and safely normalized Telegram
context. It returns `status: error`, `is_valid: false`, accumulated errors,
`workspace: null`, and `persistence_plan: null`. Generation nodes safely skip
work without throwing.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-003/WF-003_Workspace_Manager_v2.0.json`.
3. Confirm 14 nodes, 13 direct connections, and one Accept-all-data trigger.
4. Save it; no credentials require configuration.
5. Run the contract tests before connecting production workflows.

## Connection Instructions

Configure Novel Manager v2 to call Workspace Manager v2 with its entire output
and wait for completion.

The current Chapter Manager v2 does **not** consume
`workspace.persistence.requested` directly. Its canonical input is a later
`chapter.create.requested` request, while its legacy mode accepts
`workspace.persistence.prepared`. Therefore, `target: WF-004` expresses the
logical next business capability, not a direct pass-through call. The caller or
future orchestration boundary must first complete/acknowledge workspace
persistence and construct the documented chapter request. No undocumented fields
are invented by this workflow.

## Testing

1. Chinese novel metadata produces ready workspace/plan and a safe slug fallback.
2. English metadata preserves its existing slug as `root_folder_name`.
3. Missing novel UUID produces error with both domain objects null.
4. Missing novel title produces the same invalid structure.
5. Folder/file manifests each contain exactly nine stable entries.
6. Folder operations contain root plus nine manifest operations.
7. File operations contain exactly nine entries and expected initial content.
8. Total operations equals 19.
9. UUIDs match `WS-xxxxxxxx` and `PLAN-xxxxxxxx`.
10. Invalid input completes without an exception.

### Validation Report

Validated on 2026-08-01: JSON parsing, 14-node/13-connection structure, single
passthrough trigger, no internal Execute Workflow node, Chinese and English
contracts, missing UUID/title cases, exact manifests, 10/9/19 operation counts,
operation schemas/content, UUID/timestamp/context and final-field assertions,
archive byte equality, prohibited-reference scan, scope check, and
`git diff --check` passed. The container does not include n8n, so live UI import
remains a release-environment check.

## Migration from P01 and P02

Old:

```text
WF-003 P01 → Execute Workflow → WF-003 P02
```

New:

```text
WF-003 - Workspace Manager v2
```

The caller should invoke only the consolidated workflow. Import and test v2,
change WF-002's next call to v2, apply the downstream orchestration boundary
described above, and retain the old chain inactive during rollback. Do not delete
old n8n workflows.

## Rollback Instructions

1. Stop calls to Workspace Manager v2.
2. Restore WF-002's target to WF-003 P01 with any prior envelope mapping.
3. Restore the P01-to-P02 deployment call.
4. Restore the prior downstream routing after P02.
5. Run English/Chinese metadata and invalid-input smoke tests.
6. Use `archive/P01` and `archive/P02` for comparison or re-import while keeping
   the original directories.

## Known Limitations

- Persistence is planned but never executed.
- UUID uniqueness is probabilistic until enforced by storage.
- Root names do not transliterate non-ASCII slugs.
- File contents are minimal bootstrap values only.
- Provider selection, idempotency, retries, permissions, and rollback are later
  concerns.
- Chapter Manager v2 requires the documented orchestration boundary rather than
  direct use of this output.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Consolidated workspace generation and persistence planning. |
