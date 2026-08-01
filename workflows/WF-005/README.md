# WF-005 - Storage Manager v2

## Purpose

Storage Manager v2 is the single Google Drive persistence boundary for Novel
Studio workspace and chapter contracts. It validates one of two upstream routes,
normalizes a storage request, creates an ordered execution queue, executes
supported folder and text-file operations with official n8n Google Drive nodes,
collects individual results, verifies required work, and returns one stable
Storage Result contract.

Google Drive is the only external provider. The workflow contains no Telegram,
OpenAI, Google Sheets, database, Supabase, filesystem, npm package, embedded
credential, access token, or hardcoded Drive folder ID.

## Architecture

The workflow contains 24 functional nodes and five Sticky Notes:

| Section | Responsibility |
| --- | --- |
| Storage Intake | Validate route/envelope, detect workspace or chapter, extract and validate its persistence contract |
| Storage Planning | Generate `STORAGE-` identity, root/folder/file plans, ordered queue, and pre-execution validation |
| Google Drive Execution | Select create-or-existing root mode and process arrays through three reusable official Drive nodes |
| Verification | Collect every operation result, redact sensitive error fragments, and verify required operations |
| Final Output | Calculate summary and emit one ready/error Storage Result |

One Execute Workflow Trigger accepts all data. Root handling uses a Switch;
folder and file preparation emit multiple n8n items so the same Drive node is
reused for every operation. All Drive nodes continue on individual errors so
failures reach result collection.

## Workflow Diagram

```text
Workflow Trigger
→ Validate Storage Route → Detect Persistence Type
→ Extract Persistence Contract → Validate Persistence Contract
→ Normalize Storage Request → Build Root Folder Plan
→ Build Folder Operation Plan → Build File Operation Plan
→ Build Google Drive Execution Queue → Validate Execution Queue
→ Resolve Parent Folder → Switch Root Mode
   ├─ create → Create Root Folder ─┐
   ├─ existing → Use Existing Root Folder ─┤
   └─ rejected ────────────────────────────────▶ Collect Execution Results
→ Prepare Child Folder Items → Create Child Folders
→ Prepare File Items → Convert Text Content → Create Text and JSON Files
→ Collect Execution Results → Verify Required Operations
→ Calculate Storage Summary → Build Final Output
```

## Supported Input Routes

| Route | Source | Type |
| --- | --- | --- |
| `workspace.persistence.requested` | WF-003 - Workspace Manager v2 | `workspace` |
| `chapter.persistence.created` | WF-004 - Chapter Manager v2 | `chapter` |

Every input must have schema `1.0`, status `ready`, and `is_valid: true`.
Unrelated routes are rejected before Drive execution.

### Latest-contract notes

The current WF-003 v2 contract supplies ten folder operations, nine file
operations, a `persistence_plan_id`, and `total_operations: 19`. The current
WF-004 v2 contract supplies its chapter/workspace objects and eight string
`pending_operations`; Storage Manager uses the canonical workspace fields to
construct five folder and three file operations rather than interpreting those
strings as executable provider instructions.

## Workspace Persistence Behavior

Workspace input requires `workspace_uuid`, `novel_uuid`, `root_folder_name`,
folder/file operation arrays, a non-negative integer total, and either:

- `existing_root_folder_id`, to resolve and reuse an existing root; or
- `base_parent_folder_id`, beneath which the root is created.

The root operation is handled once. The existing nine child folders and nine
files are normalized and sent through reusable Drive nodes. Original initial
content and required flags are preserved.

## Chapter Persistence Behavior

Chapter input requires `chapter_uuid`, `workspace_uuid`, `novel_uuid`,
`chapter_directory`, `draft_file`, and a pending-operation array. Because there
is no persistent workspace-to-Drive mapping database, chapter persistence also
requires `existing_root_folder_id`; it never creates an arbitrary or duplicate
novel root.

The plan creates the chapter directory plus assets, images, exports, and logs,
then creates:

- the draft with empty content;
- `notes.md` with `# Notes`; and
- `chapter.json` containing formatted canonical chapter metadata.

## Storage Request Schema

```json
{
  "storage_request_id": "STORAGE-a1b2c3d4",
  "persistence_type": "workspace",
  "provider": "google_drive",
  "execution_mode": "live",
  "workspace_uuid": "WS-a1b2c3d4",
  "novel_uuid": "NOV-a1b2c3d4",
  "chapter_uuid": null,
  "root_folder_name": "the-glass-city",
  "requested_at": "2026-08-01T00:00:00.000Z",
  "requested_by": "Novel Studio WF-005"
}
```

`storage_request_id` uses the project Math.random UUID fallback and never a
cryptographic UUID API.

## Folder Operation Schema

```json
{
  "operation_id": "FOLDER-002",
  "operation_type": "create_folder",
  "relative_path": "the-glass-city/01_Source",
  "folder_name": "01_Source",
  "parent_relative_path": "$root",
  "sequence": 2,
  "required": true,
  "status": "pending"
}
```

Duplicate logical paths are removed during chapter planning and rejected if they
remain in the final queue. Workspace operation order is preserved.

## File Operation Schema

```json
{
  "operation_id": "FILE-001",
  "operation_type": "create_file",
  "relative_path": "the-glass-city/Novel.json",
  "file_name": "Novel.json",
  "parent_relative_path": "the-glass-city",
  "content_type": "application/json",
  "initial_content": "{}",
  "sequence": 1,
  "required": true,
  "status": "pending"
}
```

Supported content types are Markdown (`text/markdown`), JSON
(`application/json`), and plain text (`text/plain`). Convert Text Content creates
the transient upload data required by the Drive node. Binary asset ingestion is
not supported.

## Execution Queue Schema

```json
{
  "queue_id": "QUEUE-003",
  "operation_id": "FOLDER-002",
  "action": "create_folder",
  "provider": "google_drive",
  "parent_reference": "$root",
  "relative_path": "the-glass-city/01_Source",
  "resource_name": "01_Source",
  "mime_type": "",
  "content": "",
  "sequence": 3,
  "required": true,
  "status": "pending"
}
```

Queue order is base resolution, root create/resolve, child folders, files, then
verification. Validation checks array shape, unique queue and operation IDs,
contiguous sequences, required file parent references, and duplicate paths.

## Google Drive Credential Setup

The export intentionally has no `credentials` property. After import:

1. Open **Create Root Folder**, **Create Child Folders**, and **Create Text and
   JSON Files**.
2. Select the same existing Google Drive OAuth2 credential in all three nodes.
3. Confirm the credential can create folders/files beneath the configured base.
4. Never paste a client secret, refresh token, or access token into a Code node,
   input contract, or committed export.

Missing or rejected credentials are expected to surface through each Drive
node's continue-on-error output and become failed execution results. Some n8n
credential-resolution failures can occur before node execution; test this in the
target deployment before publishing.

## `base_parent_folder_id` Setup

Provide `base_parent_folder_id` as a top-level input string for a new workspace.
It is the Google Drive folder ID under which the novel root will be created. It
is deployment data—not stored in this JSON. Copy only the folder ID from Drive,
not its URL. Workspace validation rejects creation when both this value and an
existing root ID are absent.

## `existing_root_folder_id` Behavior

- Workspace input may provide it to reuse an already-created root.
- Chapter input must provide it because no reliable mapping database exists.
- When present, Create Root Folder is bypassed and no duplicate root is created.
- The ID and its standard Drive URL are returned in the final storage object.
- Optional `folder_id_map` may map relative parent paths to known folder IDs for
  nested chapter subfolders. Without a mapping, unresolved nested parents fall
  back to the root; see Known Limitations.

## Execution Behavior

The root branch either creates the workspace root, reuses the supplied root, or
rejects execution. Prepare nodes expand operation arrays into items. Official
Google Drive nodes then create child folders and upload converted Markdown,
JSON, or text content. `continueOnFail`/regular error output keeps independent
items moving. Result collection correlates outputs with operation inputs,
records IDs/URLs, and converts errors to concise text with token/credential-like
fragments redacted.

Each result contains `operation_id`, type, resource name, `success`/`failed`
status, resource ID/URL, error message, execution time, and an internal required
flag used only for verification.

## Verification Rules

- Every required result successful → `storage_status: completed`, ready, valid.
- Any required result failed → `storage_status: partial_failure`, error, invalid.
- Pre-execution validation failure → `storage_status: rejected`, error, invalid.
- Optional failures do not prevent completed status when every required operation
  succeeds.

The summary counts total, success, failed, skipped, required, successful required,
and failed required operations. Storage cannot be reported completed when a
required operation failed.

## Final Output Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "storage.completed",
  "target": "WF-006",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "storage": {
    "storage_request_id": "STORAGE-a1b2c3d4",
    "persistence_type": "workspace",
    "provider": "google_drive",
    "storage_status": "completed",
    "base_parent_folder_id": "configured-at-runtime",
    "root_folder_id": "drive-resource-id",
    "root_folder_url": "https://drive.google.com/drive/folders/drive-resource-id",
    "workspace_uuid": "WS-a1b2c3d4",
    "novel_uuid": "NOV-a1b2c3d4",
    "chapter_uuid": null,
    "executed_at": "2026-08-01T00:00:10.000Z"
  },
  "summary": {
    "total_operations": 19,
    "successful_operations": 19,
    "failed_operations": 0,
    "skipped_operations": 0,
    "required_operations": 19,
    "successful_required_operations": 19,
    "failed_required_operations": 0
  },
  "execution_results": [],
  "context": {}
}
```

The example result array is abbreviated. Failure uses the same shape with error
status, invalid state, `rejected` or `partial_failure`, populated validation or
execution errors, and actual summary counts.

## Error Handling

Code nodes use defensive checks and do not intentionally throw for expected
input failures. Drive nodes continue on individual errors. Permission, quota,
parent, and credential failures are not silently discarded. Result errors are
human-readable and outputs never contain OAuth tokens or secrets. Independent
operations continue where n8n and parent dependencies permit.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-005/WF-005_Storage_Manager_v2.0.json`.
3. Confirm 24 functional nodes, five Sticky Notes, one Workflow Trigger, three
   official Google Drive nodes, one Convert to File node, and direct connections.
4. Bind the credential manually to all Drive nodes.
5. Supply test `base_parent_folder_id`/`existing_root_folder_id` values.
6. Execute in a disposable Drive folder before production publication.

## Publish Instructions

Verify credential scope, parent IDs, Drive ownership, quota, and test cleanup.
Run both workspace and chapter scenarios plus permission-denied and invalid-input
cases. Publish only after execution results and counts match Drive resources.
Keep legacy WF-005 Parts imported but inactive during the rollback window.

## Testing

1. Workspace plan: create root + nine folders + nine files; verify completed and
   19 successful required operation results.
2. Chapter with existing root: create chapter directory, four subfolders, and
   three files; verify completed.
3. Chapter without existing root: reject before Drive execution.
4. Missing workspace UUID: reject.
5. Invalid route: reject.
6. Missing credential: capture node failure; never report completed.
7. Permission denial: failed required result and partial failure.
8. Optional failure: continue and complete when required work succeeds.
9. Duplicate relative paths: reject before execution.
10. Import in n8n 2.29+, bind credentials manually, and confirm no missing nodes,
    expression-security errors, cryptographic UUID errors, hardcoded IDs/tokens,
    or extra Workflow Triggers.

### Validation Report

Validated on 2026-08-01: JSON parsing, 24-functional-node/five-note structure,
connection targets, one passthrough trigger, three official Drive nodes with no
credential bindings, planning Code execution for both source contracts,
workspace/chapter/rejected/duplicate cases, queue and summary calculations,
archive byte equality, forbidden secret/provider/reference scans, scope review,
and `git diff --check`. Live Drive resource creation, OAuth failure, permission,
quota, and n8n UI import tests require the target n8n/Google environment and are
not claimed as executed locally.

## Migration from WF-005 Part Workflows

Old:

```text
WF-005 P01 → WF-005 P02 → future P03/P04 execution and verification
```

New:

```text
WF-005 - Storage Manager v2
```

P01/P02 originals remain in place and are copied to `archive/P01` and
`archive/P02`. No P03/P04 files existed in this repository snapshot. Update
WF-003/WF-004 orchestration to call only v2 after sandbox tests pass; do not
delete old n8n workflows.

## Rollback Instructions

1. Stop new v2 executions.
2. Repoint callers to the prior WF-005 P01/P02 planning chain.
3. Disable any unfinished execution continuation before retrying.
4. Compare Drive resources with `execution_results` to prevent duplicates.
5. Restore any deployment-specific later-Part executor.
6. Use archive copies for comparison/re-import while retaining original folders.

## Known Limitations

- No persistent workspace-to-Google-Drive-folder mapping database exists yet.
- Chapter persistence may require `existing_root_folder_id` and, for reliably
  nested parents, `folder_id_map`.
- No binary asset upload is supported.
- No Google Sheets behavior exists in this workflow.
- No overwrite or update support exists in v2.0.
- Duplicate-name handling is limited; Drive can allow same-name siblings.
- Google Drive API quota and permission limits apply.
- Nested chapter parent resolution is limited without explicit folder mappings.
- Execution is not transactionally rolled back after partial failure.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Consolidated storage intake, Drive execution, results, and verification. |
