# WF-006 - Canon Knowledge Manager v2

## Purpose

WF-006 converts a valid chapter persistence contract into a versioned canonical
Knowledge Object. It performs deterministic validation, extraction,
normalization, identity generation, and contract assembly only.

This version performs no AI inference or persistence. It has no OpenAI, LLM,
embedding, vector database, external API, Google service, database, credential,
secret, filesystem operation, or external package.

## Architecture

The workflow is one eight-node linear n8n sub-workflow:

```text
Workflow Trigger
→ Validate Chapter Contract
→ Extract Chapter Metadata
→ Extract Canon Input
→ Normalize Canon Input
→ Generate Canon Object
→ Validate Canon Object
→ Build Canon Output
```

One Execute Workflow Trigger accepts all incoming data. The seven transformations
are plain-JavaScript Code nodes. Expected validation failures continue to the
terminal node and return a structured error contract without an intentional
exception.

## Input Contract

The supported input route is `chapter.persistence.created`:

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
    "chapter_title": "第一章",
    "chapter_filename": "0001.md",
    "workspace_uuid": "WS-a1b2c3d4",
    "novel_uuid": "NOV-a1b2c3d4"
  },
  "chapter_content": "Optional normalized source text"
}
```

`chapter_content` is optional in v2.0. When present, line endings and surrounding
whitespace are normalized as Canon preparation input, but the approved Canon
Object schema contains identity and provenance only and does not expose or store
chapter prose.

### Current WF-005 boundary

The latest repository Storage Manager v2 emits `storage.completed`, not
`chapter.persistence.created`, and its final contract does not carry chapter
number/title/content. Therefore its output cannot be passed directly to WF-006
without losing required Canon identity. The orchestration boundary must preserve
or rejoin the successful WF-004 chapter contract after WF-005 reports completed,
then submit the documented `chapter.persistence.created` envelope to WF-006.
WF-006 deliberately does not accept unrelated routes or silently invent missing
chapter values.

## Validation Rules

The workflow requires:

- `schema_version: 1.0`;
- route `chapter.persistence.created`;
- status `ready` and `is_valid: true`;
- a non-array `chapter` object;
- non-empty string `chapter_uuid`, `novel_uuid`, and `workspace_uuid`;
- a positive integer `chapter_number`; and
- a present string `chapter_title`, where `""` is allowed.

All errors are accumulated in `validation_errors`. Invalid input skips Canon
generation, reaches Build Canon Output, and returns `status: error`,
`is_valid: false`, and `canon: null`.

## Canon Normalization

IDs are trimmed. Chapter title leading/trailing whitespace is removed and
repeated internal whitespace is collapsed. Optional source text normalizes CRLF
or CR line endings to LF and trims its outer whitespace. `canon_type` is fixed to
`chapter`; no fact extraction, summarization, classification, or AI processing
occurs.

## UUID and Audit Rules

`canon_uuid` uses a deterministic hash of `novel_uuid`, `chapter_number`, and `chapter_uuid` in the format `CANON-xxxxxxxx`, so retries retain the same identity. Canon version
is `1.0`; `created_at` and `updated_at` share one UTC ISO 8601 creation instant;
`created_by` is `Novel Studio WF-006`.

## Output Contract

Successful output:

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "canon.created",
  "target": "WF-007",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "canon": {
    "canon_uuid": "CANON-a1b2c3d4",
    "canon_type": "chapter",
    "novel_uuid": "NOV-a1b2c3d4",
    "workspace_uuid": "WS-a1b2c3d4",
    "chapter_uuid": "CHP-a1b2c3d4",
    "chapter_number": 1,
    "chapter_title": "第一章",
    "canon_version": "1.0",
    "created_at": "2026-08-01T00:00:00.000Z",
    "updated_at": "2026-08-01T00:00:00.000Z",
    "created_by": "Novel Studio WF-006"
  }
}
```

Failure uses the same envelope and target with `status: error`, `is_valid:
false`, accumulated validation messages, and `canon: null`.

## Import and Connection Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-006/WF-006_Canon_Knowledge_Manager_v2.0.json`.
3. Confirm eight nodes, seven direct connections, and one Accept-all-data trigger.
4. Save the workflow; there are no credentials to configure.
5. Connect the post-storage orchestration boundary described above and wait for
   completion.
6. Route successful `canon.created` output to WF-007 when that workflow exists.

## Testing

1. Valid chapter metadata produces ready/valid Canon with all IDs preserved.
2. Chinese chapter titles remain intact.
3. Empty `chapter_title` is valid.
4. Missing chapter, novel, or workspace UUID produces error and null Canon.
5. Zero/negative/non-integer chapter number produces error.
6. Invalid route, schema, status, or upstream validity produces error.
7. Optional CRLF chapter content normalizes without entering the final contract.
8. Confirm timestamps are equal and ISO 8601 and UUID matches
   `CANON-xxxxxxxx`.

### Validation Report

Validated on 2026-08-01: JSON parsing, eight-node/seven-connection structure,
single passthrough trigger, Code-node syntax/execution, valid Chinese and empty
chapter-title cases, required-field and invalid-route cases, UUID/timestamp and
exact terminal-contract assertions, forbidden integration/reference scan, scope
review, and `git diff --check` passed. The container does not include n8n, so
live n8n 2.29+ import remains a release-environment check.

## Known Limitations

- v2.0 creates identity/provenance Canon only; it does not extract story facts.
- Normalized chapter prose is not included in the approved Canon Object schema.
- There is no Canon persistence, conflict detection, deduplication, timeline,
  Story Bible update, or approval workflow.
- The current WF-005 output needs the documented orchestration join before WF-006.
- UUID uniqueness is probabilistic until enforced by a persistence layer.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Initial consolidated Canon Knowledge Manager. |

## Deterministic chapter identity

Canon identity is now an upsert identity derived from `novel_uuid`, `chapter_number`, and `chapter_uuid`. Reprocessing the same persisted chapter produces the same `canon_uuid` and preserves an incoming bootstrap `idempotency_key`; it no longer allocates a random Canon identity for a retry.
