# WF-004 - Chapter Manager v2

## Purpose

Chapter Manager v2 consolidates the WF-004 chapter intake, metadata, workspace,
and persistence-definition pipeline into one importable n8n workflow. A caller
submits one chapter request and receives one complete, validated persistence
contract for WF-005. The workflow performs JavaScript data transformation only;
it does not create folders or files or access any external service.

## Architecture

The workflow contains 12 functional nodes across five logical sections. Former
Part boundaries are direct node connections—there are no internal Execute
Workflow nodes. Expected validation failures stay on the main path and reach
Build Final Output without an unhandled exception.

| Section | Nodes | Responsibility |
| --- | --- | --- |
| Chapter Intake | Workflow Trigger through Validate Chapter Input | Accept, extract, normalize, and validate current or legacy P01 input |
| Chapter Metadata | Generate/Normalize Chapter Metadata | Produce the canonical v2 chapter object |
| Chapter Workspace | Generate/Normalize Chapter Workspace | Produce provider-neutral relative workspace definitions |
| Chapter Persistence | Generate/Normalize Chapter Persistence | Produce deferred operation names without executing them |
| Final Output | Build Final Output | Emit the exact ready or error contract |

No API, OpenAI, Google Drive, Google Sheets, database, filesystem, credential,
external package, or cryptographic UUID API is used.

## Workflow Diagram

```text
SECTION 1 — Chapter Intake
Workflow Trigger → Validate Chapter Route → Extract Chapter Input
→ Normalize Chapter Input → Validate Chapter Input

SECTION 2 — Chapter Metadata
→ Generate Chapter Metadata → Normalize Chapter Metadata

SECTION 3 — Chapter Workspace
→ Generate Chapter Workspace → Normalize Chapter Workspace

SECTION 4 — Chapter Persistence
→ Generate Chapter Persistence → Normalize Chapter Persistence

SECTION 5 — Final Output
→ Build Final Output
```

## Source Workflows Merged

- `workflows/WF-004/P01/` — Create Chapter Intake
- `workflows/WF-004/P02/` — Chapter Metadata Builder
- `workflows/WF-004/P03/` — Chapter Workspace Builder
- WF-004 P04 — Chapter Persistence Contract behavior specified for v2

P01–P03 remain in their original paths and are copied byte-for-byte to
`archive/P01` through `archive/P03`. The repository snapshot did not contain a
tracked P04 file; `archive/P04` therefore contains an explicit archival recovery
of the specified P04 persistence behavior. No historical or deployed n8n
workflow is deleted.

## Input Contract

The canonical v2 input is:

```json
{
  "schema_version": "1.0",
  "route": "chapter.create.requested",
  "status": "ready",
  "context": {
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "chapter_number": 1,
    "chapter_title": "",
    "created_at": "2026-08-01T00:00:00.000Z"
  }
}
```

### Latest P01 compatibility

The repository P01 differs from the canonical example: it accepts
`route: workspace.persistence.prepared`, obtains UUIDs from `persistence`, and
accepts chapter fields at the top level or in `chapter`. It does not require a
schema version. Chapter Manager v2 preserves that actual contract as a legacy
input mode while making the versioned `chapter.create.requested` context the
preferred interface.

```json
{
  "route": "workspace.persistence.prepared",
  "status": "ready",
  "persistence": {
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678"
  },
  "chapter_number": 1,
  "chapter_title": ""
}
```

## Final Output Contract

Successful requests return:

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "chapter.persistence.created",
  "target": "WF-005",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "chapter": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "chapter_slug": "chapter-0001",
    "chapter_number": 1,
    "chapter_order": 1,
    "chapter_title": "",
    "chapter_filename": "0001.md",
    "chapter_version": "1.0",
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "created_at": "2026-08-01T00:00:01.000Z",
    "updated_at": "2026-08-01T00:00:01.000Z",
    "created_by": "Novel Studio WF-004"
  },
  "workspace": {
    "chapter_directory": "02_Chapters/0001",
    "draft_file": "0001.md",
    "notes_file": "notes.md",
    "assets_directory": "assets",
    "images_directory": "images",
    "exports_directory": "exports",
    "logs_directory": "logs",
    "metadata_file": "chapter.json",
    "workspace_version": "1.0"
  },
  "persistence": {
    "storage_provider": "local",
    "storage_strategy": "deferred",
    "storage_status": "pending",
    "pending_operations": [
      "create_chapter_directory",
      "create_draft_file",
      "create_notes_file",
      "create_assets_directory",
      "create_images_directory",
      "create_exports_directory",
      "create_logs_directory",
      "create_metadata_file"
    ],
    "persistence_version": "1.0"
  }
}
```

Invalid requests retain the envelope and target, set `status: error` and
`is_valid: false`, populate `validation_errors`, and set `chapter`, `workspace`,
and `persistence` to `null`.

## Validation Rules

- Canonical input requires `schema_version: 1.0`, route
  `chapter.create.requested`, `status: ready`, and an object `context`.
- Legacy P01 input accepts route `workspace.persistence.prepared`; a missing
  schema version is treated as `1.0`, and `persistence` supplies the context.
- `workspace_uuid` and `novel_uuid` must normalize to non-empty strings.
- `chapter_number` must be a positive integer.
- `chapter_title` must exist as a string; the empty string is valid.
- Route and field errors accumulate in `validation_errors` and never intentionally
  throw.

## Metadata Rules

The existing Math.random-based `uuidHelper()` produces a UUID-shaped value; its
first eight hexadecimal characters receive the `CHP-` prefix. Chapter numbers
are padded to at least four digits for `chapter_slug` and `chapter_filename`.
Order equals number, chapter version is `1.0`, workflow version is `2.0`, both
timestamps share one ISO 8601 instant, and creator is `Novel Studio WF-004`.

## Workspace Rules

The workspace is a definition only. It uses `02_Chapters/<padded number>`, the
padded Markdown draft filename, fixed notes and metadata filenames, fixed assets,
images, exports, and logs directory names, and workspace version `1.0`.

## Persistence Rules

Persistence is deferred and local with status `pending` and version `1.0`. The
eight ordered operation names describe intended creation; no operation runs in
this workflow.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-004/WF-004_Chapter_Manager_v2.0.json`.
3. Confirm the workflow name and 12 connected functional nodes.
4. Save it. No credentials require configuration.
5. Keep P01–P04 deployed but inactive for rollback until migration is accepted.

## Connection Instructions

Configure the existing WF-004 caller to invoke **WF-004 - Chapter Manager v2**
with Accept-all-data semantics and wait for completion. Route the returned
`chapter.persistence.created` contract to the appropriate WF-005 entry workflow.
Do not connect callers separately to P02, P03, or P04 after migration.

## Testing

1. Execute a valid canonical request; assert ready/valid and all three objects.
2. Remove `workspace_uuid`; assert error/invalid and three null objects.
3. Remove `novel_uuid`; assert the same invalid output.
4. Set `chapter_number` to `0`; assert the same invalid output.
5. Set `chapter_title` to `""`; assert a valid complete output.
6. Execute the legacy repository P01 input; assert backward-compatible success.
7. Parse and import in n8n 2.29+; confirm no missing nodes, expression security
   errors, `$json.arguments` references, cryptographic UUID errors, or internal
   Execute Workflow nodes.

### Validation Report

Validated on 2026-08-01: JSON parsing, 12-node/11-connection structure, direct
connections, valid canonical and legacy execution, the four required boundary
cases, UUID and output contract assertions, archive equality for P01–P03,
prohibited-node/reference scans, scope review, and `git diff --check` passed.
The development container does not include n8n, so live UI import remains a
release-environment check.

## Migration from P01–P04

Old:

```text
WF-004 P01 → WF-004 P02 → WF-004 P03 → WF-004 P04
```

New:

```text
WF-004 - Chapter Manager v2
```

The caller should invoke only the new consolidated workflow. Import and test v2,
switch the caller once contract tests pass, and keep the old deployed chain
inactive during the rollback window. Do not delete the original workflows from
n8n.

## Rollback Instructions

1. Stop new calls to Chapter Manager v2.
2. Restore the caller target to WF-004 P01.
3. Reactivate the P01 → P02 → P03 → P04 chain with its prior configuration.
4. Replay only requests confirmed not to have reached WF-005.
5. Use the copied archive files for comparison or re-import if a local export is
   unavailable; note that P04 is an archive recovery in this repository snapshot.

## Known Limitations

- The workflow defines but does not execute persistence.
- The UUID fallback is non-cryptographic and unsuitable for security tokens.
- It does not check duplicate chapter numbers or existing paths.
- Only the two documented intake shapes are supported.
- The P04 repository source was absent; its specified persistence behavior is
  recovered in the archive and consolidated implementation.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Consolidated P01–P04 behavior with legacy P01 compatibility. |
