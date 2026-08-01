# WF-004 P03 - Chapter Workspace Builder

## Purpose

WF-004 P03 receives the standardized Chapter Metadata contract from WF-004 P02
and builds a provider-neutral Chapter Workspace definition for WF-004 P04 and
WF-005. It transforms data only: it does not create directories or files and
performs no filesystem, API, database, OpenAI, Google Drive, or Google Sheets
operation.

## Architecture

The workflow is a six-node linear sub-workflow. The unconfigured Execute
Workflow Trigger accepts the upstream contract; three JavaScript Code nodes own
validation, workspace generation, and the terminal contract; two Edit Fields
(Set) nodes extract and order fields. Expected invalid input never throws and
travels through the same pipeline to a structured error contract.

The workflow has no credentials, npm packages, external modules, environment-
specific resource IDs, or hidden dependencies.

## Workflow Diagram

```text
Workflow Trigger
  ↓
Validate Metadata (Code)
  ↓
Extract Chapter (Set)
  ↓
Generate Workspace (Code)
  ↓
Normalize Workspace (Set)
  ↓
Build Output (Code)
```

## Input Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "chapter.metadata.created",
  "target": "WF-004-P03",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "chapter": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "chapter_slug": "chapter-0001",
    "chapter_number": 1,
    "chapter_order": 1,
    "chapter_title": "第一章",
    "chapter_filename": "0001.md",
    "chapter_version": "1.0",
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "created_at": "2026-07-31T00:00:00.000Z",
    "updated_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  }
}
```

WF-004 P02 is the supported source. The validator consumes the required version,
route, status, and chapter fields; unrelated upstream fields do not enter the
workspace object.

## Output Contract

Valid metadata returns:

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "chapter.workspace.created",
  "target": "WF-004-P04",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "workspace": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "chapter_number": 1,
    "chapter_title": "第一章",
    "chapter_directory": "02_Chapters/0001",
    "draft_file": "0001.md",
    "notes_file": "notes.md",
    "assets_directory": "assets",
    "images_directory": "images",
    "exports_directory": "exports",
    "logs_directory": "logs",
    "metadata_file": "chapter.json",
    "workspace_version": "1.0"
  }
}
```

Invalid metadata keeps the same envelope and target, as required by the P03
contract, while setting `workspace` to `null`:

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "chapter.workspace.created",
  "target": "WF-004-P04",
  "status": "error",
  "is_valid": false,
  "validation_errors": [
    "chapter.chapter_uuid is required."
  ],
  "workspace": null
}
```

## Validation Rules

- `schema_version` must equal `1.0`.
- `route` must equal `chapter.metadata.created`.
- `status` must equal `ready`.
- `chapter` must be a non-array object.
- `chapter_uuid`, `workspace_uuid`, and `novel_uuid` must be non-empty strings.
- `chapter_number` must be a positive integer.
- `chapter_filename` must be non-empty and equal the chapter number padded to a
  minimum of four digits plus `.md`.
- All discovered errors are accumulated; expected invalid data never throws.

Workspace generation pads the chapter number with `padStart(4, "0")`. It emits
definitions only and performs no filesystem operation.

## Import Guide

1. Use n8n 2.29 or later.
2. Select **Workflows → Import from File**.
3. Import `workflows/WF-004/P03/WF-004_P03_v1.0.json`.
4. Save the workflow; no credentials require configuration.
5. Configure WF-004 P02 to pass the complete Chapter Metadata contract and wait
   for completion.

## Testing

### Import Test

Parse the export with a standard JSON parser. Import it into n8n 2.29+ and verify
that the six named nodes and five linear connections appear without missing-node
warnings.

### Execute and Mock Test

Execute with the documented input. Confirm all nodes complete and the output is
`ready`, targets `WF-004-P04`, contains `02_Chapters/0001`, and preserves the
chapter, workspace, novel, number, and title values.

### Invalid Tests

Run separate inputs missing each of these fields:

1. `chapter_uuid`;
2. `workspace_uuid`;
3. `novel_uuid`;
4. `chapter_number`; and
5. `chapter_filename`.

Also test an unsupported schema version, route, and status; a non-object chapter;
and a filename inconsistent with the chapter number. Every invalid case must
reach Build Output without throwing and return `status: error`, `is_valid:
false`, descriptive errors, and `workspace: null`.

### Validation Report

Validated on 2026-07-31:

| Check | Result |
| --- | --- |
| JSON syntax | Passed with `python -m json.tool` |
| Export structure | Passed: six supported core nodes and five linear connections |
| Execute test | Passed through a Node.js Code/Set-node harness |
| Mock test | Passed for chapter 1 and the complete workspace definition |
| Missing-field tests | Passed separately for all five required fields |
| Invalid envelope | Passed with accumulated validation messages and no exception |
| Prohibited operations | Passed static scan for external and filesystem nodes |
| Diff integrity | Passed with `git diff --check` |

The development container does not include an n8n executable. Live UI import is
therefore a release-environment check; JSON parsing, supported node structure,
connections, and full transformation execution were validated locally.

## Limitations

- This Part describes workspace paths; it does not create or verify them.
- The output uses relative, provider-neutral path fragments only.
- Chapter title and slug are not used to construct paths, avoiding unsafe path
  characters and rename churn.
- Collision, persistence, permissions, and rollback belong to later workflows.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-31 | Initial Chapter Workspace Builder. |
