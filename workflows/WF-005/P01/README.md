# WF-005 P01 - Storage Intake

## Purpose

WF-005 P01 receives the Chapter Persistence Contract from WF-004 P04 and
prepares a normalized Storage Request for WF-005 P02. This workflow performs
data transformation only. It does not access a filesystem, call an API, create
or modify storage, or connect to OpenAI, Google Drive, Google Sheets, or a
database.

## Architecture

The workflow is a six-node, linear n8n sub-workflow. Its unconfigured Execute
Workflow Trigger receives the upstream contract, and five plain-JavaScript Code
nodes validate, extract, normalize, build, and emit the Storage Intake Contract.
Expected invalid input is accumulated and returned as a structured error; no
validation path intentionally throws.

The workflow has no credentials, npm packages, third-party modules, hardcoded
external resource IDs, or hidden dependencies.

## Workflow Diagram

```text
Workflow Trigger
  ↓
Validate Persistence
  ↓
Extract Persistence
  ↓
Normalize Storage Request
  ↓
Build Storage Intake
  ↓
Output
```

## Input Contract

WF-004 P04 is the supported source. A valid input has this shape:

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "chapter.persistence.created",
  "status": "ready",
  "persistence": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "workspace_uuid": "WS-12345678",
    "novel_uuid": "NOV-12345678",
    "storage_provider": "local",
    "storage_strategy": "chapter_workspace",
    "storage_status": "pending",
    "pending_operations": [
      {
        "operation": "write",
        "path": "02_Chapters/0001/0001.md"
      }
    ]
  }
}
```

`pending_operations` is a provider-neutral plan. This Part carries the operations
forward but does not execute them.

## Output Contract

Valid input returns exactly:

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
    "storage_provider": "local",
    "storage_strategy": "chapter_workspace",
    "storage_status": "pending",
    "pending_operations": [
      {
        "operation": "write",
        "path": "02_Chapters/0001/0001.md"
      }
    ]
  }
}
```

Invalid input keeps the same version, route, and target while setting storage to
`null`:

```json
{
  "schema_version": "1.0",
  "workflow_version": "1.0",
  "route": "storage.intake.created",
  "target": "WF-005-P02",
  "status": "error",
  "is_valid": false,
  "validation_errors": [
    "persistence.chapter_uuid is required."
  ],
  "storage": null
}
```

## Validation

The workflow validates and accumulates errors for:

- `schema_version` equal to `1.0`;
- `workflow_version` equal to `1.0`;
- `route` equal to `chapter.persistence.created`;
- `status` equal to `ready`;
- `persistence` as a non-array object;
- non-empty string values for `chapter_uuid`, `workspace_uuid`, `novel_uuid`,
  `storage_provider`, and `storage_strategy`; and
- `pending_operations` as an array. An empty array is valid.

`storage_status` is optional and normalizes to `pending` when empty. Provider,
strategy, and status tokens are trimmed, lowercased, and have whitespace changed
to underscores. UUID values are trimmed. String operations are trimmed; object
operations are shallow-copied without provider-specific interpretation.

## Testing

### Import Test

Parse the export using a standard JSON parser, then import it into n8n 2.29+.
Confirm that the six required nodes and five linear connections appear without
missing-node warnings.

### Execute and Mock Test

Execute the documented mock input. Confirm the workflow reaches Output, targets
`WF-005-P02`, preserves all three UUIDs and pending operations, and returns the
normalized storage tokens with `status: ready`.

### Invalid Test

Run separate cases with a missing or invalid schema version, workflow version,
route, status, persistence object, each UUID, storage provider, storage strategy,
and pending operations. Every case must reach Output without an intentional
exception and return `status: error`, `is_valid: false`, at least one validation
message, and `storage: null`.

### Validation Report

Validated on 2026-08-01:

| Check | Result |
| --- | --- |
| JSON syntax | Passed with `python -m json.tool` |
| Export structure | Passed: six core nodes and five linear connections |
| Code execution | Passed for all five Code nodes using a Node.js VM harness |
| Mock input | Passed with normalization and operation preservation assertions |
| Invalid input | Passed independently for every required persistence field |
| Error accumulation | Passed with all malformed-envelope errors and no throw |
| Prohibited operations | Passed static scan for API, Google, database, filesystem, credentials, and modules |
| Diff integrity | Passed with `git diff --check` |

The development container does not include an n8n executable, so live UI import
remains a release-environment check. JSON parsing, supported node structure,
connections, and end-to-end transformation execution were validated locally.

## Limitations

- This Part prepares a request only; it performs no storage operation.
- It validates the operations collection but does not validate provider-specific
  operation schemas; that belongs at the adapter boundary.
- It does not verify that referenced paths or identifiers exist.
- Retry, idempotency, authorization, persistence results, and rollback belong to
  later WF-005 Parts.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-08-01 | Initial Storage Intake workflow. |
