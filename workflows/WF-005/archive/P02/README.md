# WF-005 P02 - Google Drive Storage Adapter

## Purpose

WF-005 P02 receives the Storage Intake Contract from WF-005 P01 and translates
its provider-neutral persistence operations into a normalized Google Drive
execution plan for WF-005 P03.

Despite being the first external-integration boundary, this Part is a **planning
adapter only**. It does not call Google Drive, execute an operation, create a
folder or file, use OAuth, load credentials, or invoke an API node.

## Architecture

The workflow is a linear six-node n8n sub-workflow. The unconfigured Execute
Workflow Trigger accepts the P01 contract; five plain-JavaScript Code nodes
validate, extract, translate, normalize, and emit the plan. Validation is
non-throwing and produces a structured error contract.

Provider translation is isolated here so core workflows do not depend on Google
Drive terminology. Actual external execution is exclusively owned by WF-005
P03.

```text
Workflow Trigger
  ↓
Validate Storage Contract
  ↓
Extract Storage
  ↓
Generate Google Drive Plan
  ↓
Normalize Plan
  ↓
Build Output
```

## Operation Schema

Every `drive_plan.operations` entry has this schema:

```json
{
  "sequence": 1,
  "operation": "create_root_folder",
  "relative_path": "WS-12345678",
  "source_index": null
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `sequence` | positive integer | One-based execution order within this plan |
| `operation` | string | One of the canonical operations below |
| `relative_path` | string | Provider-neutral path relative to the configured Drive deployment boundary |
| `source_index` | integer or null | Index of the P01 operation; `null` identifies the generated root operation |

Canonical operations:

| Operation | Purpose |
| --- | --- |
| `create_root_folder` | Establish the workspace root represented by `workspace_uuid` |
| `create_directory` | Prepare a relative directory |
| `create_markdown` | Prepare creation of a `.md` artifact |
| `create_json` | Prepare creation of a `.json` artifact |

Incoming `write` and `create_file` operations are translated by extension into
`create_markdown` or `create_json`. The adapter always generates one root-folder
operation first. An incoming root operation is ignored to prevent duplication.
No operation includes a Google Drive resource ID, credential, OAuth token, or
executable API payload.

## Input

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "storage.intake.created",
  "target": "WF-005-P02",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "storage": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "storage_provider": "google_drive",
    "storage_strategy": "chapter_workspace",
    "storage_status": "pending",
    "pending_operations": [
      {
        "operation": "create_directory",
        "path": "02_Chapters/0001"
      },
      {
        "operation": "write",
        "path": "02_Chapters/0001/0001.md"
      },
      {
        "operation": "create_file",
        "path": "02_Chapters/0001/chapter.json"
      }
    ]
  }
}
```

The adapter accepts only ready, valid P01 contracts whose normalized provider is
`google_drive`.

## Output

A valid input produces:

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "storage.drive.plan.created",
  "target": "WF-005-P03",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "drive_plan": {
    "provider": "google_drive",
    "root_folder": "WS-12345678",
    "operations": [
      {
        "sequence": 1,
        "operation": "create_root_folder",
        "relative_path": "WS-12345678",
        "source_index": null
      },
      {
        "sequence": 2,
        "operation": "create_directory",
        "relative_path": "02_Chapters/0001",
        "source_index": 0
      },
      {
        "sequence": 3,
        "operation": "create_markdown",
        "relative_path": "02_Chapters/0001/0001.md",
        "source_index": 1
      },
      {
        "sequence": 4,
        "operation": "create_json",
        "relative_path": "02_Chapters/0001/chapter.json",
        "source_index": 2
      }
    ]
  }
}
```

Invalid input is non-throwing and returns the same envelope with `status: error`,
`is_valid: false`, accumulated messages, and `drive_plan: null`.

## Testing

### Import Test

Parse the export with a standard JSON parser and import it into n8n 2.29+.
Confirm six core nodes and five linear connections, with no Google Drive, HTTP,
OAuth, or credential configuration.

### Execute and Mock Test

Run the documented input. Confirm the output targets WF-005 P03, starts with one
root operation, maps the directory unchanged, maps the Markdown and JSON files
to their canonical operations, normalizes path separators, and does not mutate
the input operation objects.

### Invalid Tests

Test incorrect versions, route, status, `is_valid`, provider, missing identifiers,
missing strategy, non-array operations, unsupported operations, absent paths,
parent traversal, and unsupported file extensions. Every case must return a
structured error without executing or throwing.

### Validation Report

Validated on 2026-08-01:

| Check | Result |
| --- | --- |
| JSON syntax | Passed with `python -m json.tool` |
| Export structure | Passed: six core nodes and five linear connections |
| Plan execution | Passed with a Node.js VM harness across all Code nodes |
| Translation | Passed for root, directory, Markdown, and JSON operations |
| Invalid input | Passed for contract, provider, operation, path, and traversal failures |
| Integration safety | Passed: no Drive/API node, OAuth, credentials, network, or filesystem operation |
| Diff integrity | Passed with `git diff --check` |

The development container does not include an n8n executable. Live UI import is
therefore a release-environment check; JSON parsing, node structure, connections,
and complete plan generation were validated locally.

## Limitations

- Paths are logical and are not resolved to Google Drive item IDs.
- File content is intentionally absent; a later contract must provide or resolve
  content before execution.
- This version supports directory, Markdown, and JSON creation only.
- The plan does not test permissions, quota, naming conflicts, or availability.
- Retries, idempotency, rollback, and Google Drive error translation belong to
  the execution layer.

## Future Execution Layer

WF-005 P03 is the only Part authorized to translate this plan into Google Drive
node operations. It must bind credentials at deployment time, validate the plan
again, resolve parent folder IDs step by step, execute in sequence, record every
created resource ID, implement idempotency and bounded retries, and return a
provider-neutral execution result. P03 must never expose OAuth tokens or
credential values in its output or committed workflow JSON.
