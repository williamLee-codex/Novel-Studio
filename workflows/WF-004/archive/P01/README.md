# WF-004 P01 - Create Chapter Intake

## Purpose

WF-004 P01 converts a chapter-creation request received from WF-003 P02 into a
standardized Chapter Intake Contract. It performs data transformation only and
does not persist data or create any folders or files.

## Architecture

The workflow is an n8n sub-workflow. Its Execute Workflow Trigger accepts all
input data, and every subsequent node is a JavaScript Code node. Validation is
accumulative: invalid input continues through the complete workflow and returns
a structured invalid contract instead of throwing an error.

No OpenAI, Google Drive, Google Sheets, database, API, credential, npm module, or
third-party package is used.

## Workflow Diagram

```text
Workflow Trigger
  ↓
Validate Chapter Route
  ↓
Extract Chapter Input
  ↓
Normalize Chapter Input
  ↓
Validate Chapter Input
  ↓
Create Intake Output
```

## Input Contract

The source is WF-003 P02. `workspace_uuid` and `novel_uuid` are read from the
P02 `persistence` contract. Chapter fields can be supplied at the top level:

```json
{
  "route": "workspace.persistence.prepared",
  "status": "ready",
  "persistence": {
    "workspace_uuid": "33f74ca8-b512-48ae-b0ac-f71e9c924859",
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2"
  },
  "chapter_number": 1,
  "chapter_title": "Opening"
}
```

The chapter fields may instead be grouped in a `chapter` object. Values in that
object take precedence. A numeric string chapter number is normalized to a
number. The chapter title is trimmed and internal whitespace is collapsed; an
empty title is valid.

The workflow validates:

- `route` equals `workspace.persistence.prepared`;
- `status` equals `ready`;
- `workspace_uuid` and `novel_uuid` are non-empty strings;
- `chapter_number` is a positive integer; and
- `chapter_title` is a string, where an empty string is explicitly allowed.

## Output Contract

Valid input produces:

```json
{
  "route": "chapter.create.intake",
  "target": "WF-004-P02",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "context": {
    "workspace_uuid": "33f74ca8-b512-48ae-b0ac-f71e9c924859",
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "chapter_number": 1,
    "chapter_title": "Opening",
    "created_at": "2026-07-31T00:00:00.000Z"
  }
}
```

Invalid input never intentionally throws. It produces:

```json
{
  "route": "chapter.create.intake",
  "status": "invalid",
  "is_valid": false,
  "validation_errors": [
    "chapter_number must be a positive integer."
  ]
}
```

`target` and `context` are emitted only for valid input, matching the fixed
invalid-output contract.

## Import Guide

1. Use n8n 2.29 or later.
2. Choose **Workflows → Import from File**.
3. Select `workflows/WF-004/P01/WF-004_P01_v1.0.json`.
4. Save the imported workflow. No credentials require configuration.
5. Configure the caller in WF-003 P02 to pass all data to this workflow.

## Testing

1. Execute the workflow with the valid input example and confirm all six nodes
   run and produce a `ready` contract targeting `WF-004-P02`.
2. Set `chapter_title` to `""` and confirm the result remains valid.
3. Pass `chapter_number` as `"2"` and confirm it is normalized to numeric `2`.
4. Remove both UUID values, set the route and status incorrectly, and confirm the
   workflow returns `invalid` with all validation messages and does not throw.
5. Pass zero, a negative number, or a decimal as `chapter_number` and confirm
   each value is rejected.

## Compatibility

- Designed for n8n 2.29+.
- Uses Execute Workflow Trigger version 1.1 in Accept-all-data mode.
- Uses only built-in Code nodes version 2 and plain JavaScript.
- Requires no credentials or external services.

## Limitations

- This part validates and transforms data only; it does not create a chapter.
- UUID values are validated as non-empty identifiers, not against a UUID format.
- No UUID is generated in this workflow, so a UUID helper is not required.
- Chapter-title length and duplicate chapter numbers are deferred to later parts.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-31 | Initial WF-004 P01 Chapter Intake Contract. |
