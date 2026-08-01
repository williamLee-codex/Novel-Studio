# WF-004 P02 - Chapter Metadata Builder

## Purpose

WF-004 P02 receives the ready Chapter Intake Contract from WF-004 P01 and
produces standardized Chapter Metadata for WF-004 P03. It performs deterministic
data transformation only. It does not call an external API, OpenAI, Google
Drive, Google Sheets, a database, or create any file.

## Architecture

The workflow has one Execute Workflow Trigger, three JavaScript Code nodes, and
two Edit Fields (Set) nodes. Validation is non-throwing: every expected contract
failure proceeds through the same pipeline and ends as a structured error
contract. Metadata generation runs only for valid intake.

There are no credentials, hardcoded n8n resource IDs, npm modules, third-party
packages, or hidden runtime dependencies.

## Workflow Diagram

```text
Workflow Trigger
  ↓
Validate Intake (Code)
  ↓
Extract Context (Set)
  ↓
Generate Metadata (Code)
  ↓
Normalize Metadata (Set)
  ↓
Build Output (Code)
```

## Input Contract

```json
{
  "schema_version": "1.0",
  "route": "chapter.create.intake",
  "status": "ready",
  "context": {
    "workspace_uuid": "WS-xxxxxxxx",
    "novel_uuid": "NOV-xxxxxxxx",
    "chapter_number": 123,
    "chapter_title": "New Beginning"
  }
}
```

WF-004 P01 is the only supported caller. `chapter_title` is required to exist and
must be a string, but its value may be empty.

## Output Contract

Valid input produces exactly this envelope and field order:

```json
{
  "schema_version": "1.0",
  "route": "chapter.metadata.created",
  "target": "WF-004-P03",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "chapter": {
    "chapter_uuid": "CHP-a1b2c3d4",
    "chapter_slug": "chapter-0123",
    "chapter_number": 123,
    "chapter_order": 123,
    "chapter_title": "New Beginning",
    "chapter_filename": "0123.md",
    "chapter_version": "1.0",
    "workspace_uuid": "WS-xxxxxxxx",
    "novel_uuid": "NOV-xxxxxxxx",
    "created_at": "2026-07-31T00:00:00.000Z",
    "updated_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  }
}
```

Expected validation failures do not throw. They return:

```json
{
  "schema_version": "1.0",
  "route": "chapter.metadata.created",
  "status": "error",
  "is_valid": false,
  "validation_errors": [
    "context.workspace_uuid is required."
  ]
}
```

Invalid output has no executable `target` and no generated `chapter` object.

## Validation Rules

- `schema_version` must equal `1.0`.
- `route` must equal `chapter.create.intake`.
- `status` must equal `ready`.
- `context` must be a non-array object.
- `workspace_uuid` and `novel_uuid` must be non-empty strings.
- `chapter_number` must be a positive integer.
- `chapter_title` must be present and must be a string; `""` is valid.
- All validation errors are accumulated and returned without an exception.

For valid input, the project `uuidHelper()` fallback creates a UUID-shaped local
value using `Math.random()`; the first eight hexadecimal characters receive the
`CHP-` prefix. The number is formatted with `padStart(4, "0")` for the slug and
filename. Both timestamps come from the same `new Date().toISOString()` call.

## Import Guide

1. Use n8n 2.29 or later.
2. Select **Workflows → Import from File**.
3. Import `workflows/WF-004/P02/WF-004_P02_v1.0.json`.
4. Save the workflow. No credentials require configuration.
5. Configure the WF-004 P01 caller to pass the complete contract and wait for
   completion.

## Testing

### Import Test

Parse the JSON with a standards-compliant parser, import it into n8n 2.29+, and
confirm the six named nodes and five sequential connections appear.

### Execute and Mock Input Test

Execute with the documented valid input. Confirm the workflow returns `ready`,
targets `WF-004-P03`, preserves the context, uses `chapter_order: 123`, and emits
`chapter-0123` and `0123.md`. Execute twice and confirm the chapter UUID changes.

### Invalid Input Tests

Run separate cases with each of these changes:

1. remove `workspace_uuid`;
2. remove `novel_uuid`;
3. remove `chapter_number`;
4. remove `chapter_title`;
5. use an unsupported schema version, route, or status;
6. use a zero, negative, decimal, or string chapter number; and
7. use a non-string chapter title.

Every case must reach Build Output without throwing and return `status: error`,
`is_valid: false`, and at least one descriptive `validation_errors` entry.

### Validation Report

Validated on 2026-07-31:

| Check | Result |
| --- | --- |
| JSON parser | Passed with `python -m json.tool` |
| n8n export structure | Passed: six supported core nodes and five sequential connections |
| Code Node execution | Passed for all three Code nodes through a Node.js VM harness |
| Mock input | Passed with chapter 123, `chapter-0123`, and `0123.md` |
| Invalid input | Passed independently for each missing required context field |
| Non-throwing validation | Passed with eight accumulated errors for a fully malformed envelope |
| Prohibited integrations | Passed static scan; no API, provider, credential, crypto, or npm usage |
| Whitespace | Passed with `git diff --check` |

The current development container does not include an n8n runtime, so live UI
import remains a release-environment check. The export uses only node types and
versions supported by n8n 2.29+ and passed the structural import checks above.

## Limitations

- This Part creates metadata only; it does not persist a chapter or Markdown file.
- UUID generation is non-cryptographic and is not suitable for security tokens.
- Chapter numbers longer than four digits remain intact because `padStart()` sets
  a minimum width rather than truncating values.
- Duplicate chapter-number detection and persistence belong to later Parts.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-31 | Initial Chapter Metadata Builder. |
