# WF-007 - Character Knowledge Manager v2

## Purpose

WF-007 receives a valid Canon Knowledge Object, normalizes only character data
already present in that object, validates records independently, generates
canonical Character Knowledge Objects, merges same-name duplicates within the
execution, reports conflicts, and returns a stable collection contract.

It never extracts characters from prose and never invents facts. It uses no AI,
OpenAI, LLM, embeddings, vector store, database, Google service, external API,
credential, secret, filesystem, or external package. An absent character source
is a valid empty collection.

## Architecture

The workflow contains ten functional nodes, nine direct connections, and five
Sticky Notes:

```text
Workflow Trigger
→ Validate Canon Route
→ Extract Canon Context
→ Extract Character Input
→ Normalize Character Records
→ Validate Character Records
→ Generate Character IDs
→ Build Character Knowledge Objects
→ Calculate Character Summary
→ Build Final Output
```

One Execute Workflow Trigger accepts all incoming data. All transformations are
plain-JavaScript Code nodes. Canon-level failures continue to the final node and
produce an error envelope; invalid individual records are isolated and do not
block valid records.

## Input Contract from WF-006

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

### Latest-contract difference

The actual latest WF-006 contract above does not include a character collection,
so its unextended output correctly produces an empty successful WF-007 result.
WF-007 also supports the approved optional extension fields below when a
non-AI upstream process explicitly attaches records to `canon`. It does not
inspect omitted prose or infer names from `chapter_title`.

## Supported Character Source Fields

The first array found in this priority order is used:

1. `canon.characters`
2. `canon.character_records`
3. `canon.character_candidates`

If none is an array, `character_records` becomes `[]`. Later fields are not
combined, preventing accidental duplicate ingestion.

## Character Input Schema

```json
{
  "name": "林玄",
  "identity": "宗門弟子",
  "first_appearance_chapter": 1,
  "realm": "築基",
  "appearance": "青衣",
  "personality": "沉著",
  "relationship_to_protagonist": "同門",
  "is_alive": true,
  "aliases": ["林師兄"],
  "notes": "",
  "source_chapter_uuid": "CHP-a1b2c3d4"
}
```

Only `name` is required. Missing descriptive fields remain empty; unknown
booleans and first-appearance values become `null`; source chapter UUID falls
back to the Canon chapter UUID.

## Normalization Rules

- String fields are trimmed and repeated internal whitespace collapses to one.
- Chinese characters and punctuation are otherwise preserved.
- Aliases become an array of non-empty, unique normalized strings.
- A missing alias field becomes `[]`; a supplied non-array is marked invalid.
- Missing `notes` becomes `""`.
- Missing `is_alive` becomes `null`; only boolean or null is valid.
- Missing first appearance becomes `null`; only a positive integer or null is
  valid.
- Realm, appearance, personality, identity, and relationship are never inferred.

## Validation Rules

Canon validation requires schema `1.0`, `canon.created`, ready/valid state, a
Canon object, four non-empty Canon/domain UUIDs, and a non-negative integer
chapter number.

Every normalized character is independently checked for a 1–100-character name,
array aliases, valid first appearance, and boolean/null life status. An invalid
record is returned as:

```json
{
  "source_index": 2,
  "validation_errors": ["Character name is required."],
  "original_record": {"realm": "築基"}
}
```

Its original value is preserved for diagnosis. Record-level errors do not change
the workflow's ready status when the Canon envelope is valid.

## Character ID Rules

Only valid records receive an ID. `uuidHelper()` uses the established local
Math.random fallback; its first eight hexadecimal characters receive the
`CHR-` prefix. No cryptographic UUID API, sequential database ID, package, or
external service is used.

## Deduplication Rules

Deduplication is execution-local and keyed by the normalized character name
(case-insensitive while preserving the first display spelling). The first valid
record is the base. Later same-name records:

- merge unique aliases;
- fill empty base values with later non-empty values;
- preserve the first non-empty value when both values conflict; and
- create a conflict record instead of resolving the disagreement.

Alias overlap between different names never merges characters.

## Conflict Behavior

```json
{
  "character_name": "林玄",
  "field": "realm",
  "existing_value": "築基",
  "incoming_value": "金丹",
  "source_index": 1
}
```

Conflicts are informational and do not invalidate a Canon-valid run. The first
non-empty value remains canonical for this execution.

## Character Knowledge Object

Each unique valid name produces:

```json
{
  "character_uuid": "CHR-a1b2c3d4",
  "character_name": "林玄",
  "aliases": ["林師兄"],
  "identity": "宗門弟子",
  "first_appearance_chapter": 1,
  "realm": "築基",
  "appearance": "青衣",
  "personality": "沉著",
  "relationship_to_protagonist": "同門",
  "is_alive": true,
  "notes": "",
  "novel_uuid": "NOV-a1b2c3d4",
  "workspace_uuid": "WS-a1b2c3d4",
  "source_canon_uuid": "CANON-a1b2c3d4",
  "source_chapter_uuid": "CHP-a1b2c3d4",
  "source_chapter_number": 1,
  "character_version": "1.0",
  "created_at": "2026-08-01T00:00:01.000Z",
  "updated_at": "2026-08-01T00:00:01.000Z",
  "created_by": "Novel Studio WF-007"
}
```

Created/updated timestamps share one ISO 8601 instant per object.

## Final Output Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "characters.created",
  "target": "WF-008",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "characters": [],
  "invalid_character_records": [],
  "character_conflicts": [],
  "summary": {
    "source_records": 0,
    "valid_records": 0,
    "invalid_records": 0,
    "characters_created": 0,
    "duplicates_merged": 0,
    "conflicts_detected": 0
  },
  "context": {
    "canon_uuid": "CANON-a1b2c3d4",
    "novel_uuid": "NOV-a1b2c3d4",
    "workspace_uuid": "WS-a1b2c3d4",
    "chapter_uuid": "CHP-a1b2c3d4",
    "chapter_number": 1,
    "chapter_title": "第一章"
  }
}
```

Invalid Canon input uses the same version, route, and target with error/invalid
state, Canon validation messages, empty result/conflict arrays, a zero summary,
and `context: {}`.

## Empty-Input Behavior

No character source is not an error. WF-007 returns ready/valid, empty characters,
empty invalid/conflict arrays, all-zero summary counts, and the Canon context.
It never derives a character from the chapter title.

## Invalid-Record Behavior

Invalid records appear only in `invalid_character_records`. Valid records in the
same input still receive IDs, participate in deduplication, and appear in the
output. Summary counts distinguish source, valid, invalid, unique-created,
merged-duplicate, and conflict totals.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-007/WF-007_Character_Knowledge_Manager_v2.0.json`.
3. Confirm ten functional nodes, nine direct connections, five Sticky Notes, and
   one Accept-all-data Workflow Trigger.
4. Save it; no credentials require configuration.
5. Run the empty, valid, invalid-record, duplicate, and conflict tests.

## Connection Instructions

Configure WF-006 or an explicit non-AI Canon enrichment boundary to call WF-007
with the complete `canon.created` envelope and wait for completion. Enrichment
may attach one supported character array without changing Canon identity. Route
successful `characters.created` output to WF-008 when available.

## Testing

1. One valid Chinese record → one character, ready.
2. No source field or empty array → ready/valid, zero characters.
3. Missing name → one invalid record while workflow remains ready.
4. Duplicate name with different aliases → one character, merged aliases,
   `duplicates_merged: 1`.
5. Duplicate name with conflicting realms → first realm retained and conflict.
6. Missing `is_alive` → `null`.
7. String first appearance → invalid record.
8. Invalid Canon route → error/invalid and empty output.
9. Verify `CHR-xxxxxxxx`, synchronized ISO timestamps, exact fields, and no
   intermediate leakage.

### Validation Report

Validated on 2026-08-01: JSON parsing, ten-functional-node/nine-connection and
five-note structure, one passthrough trigger, Code-node syntax/execution, all
eight required behavior cases, empty input, Chinese preservation, record
isolation, alias deduplication, conflict preservation, summary and exact-contract
assertions, prohibited-service/reference scan, scope review, and
`git diff --check` passed. The container does not include n8n, so live n8n 2.29+
import remains a release-environment check.

## Known Limitations

- No AI extraction from prose.
- No cross-chapter persistent deduplication.
- No database-backed character identity resolution.
- Alias overlap does not automatically merge characters.
- Conflicting non-empty values are reported but not resolved automatically.
- Same-name characters that are actually distinct people require a future
  disambiguation mechanism.
- The current WF-006 output contains no character source unless explicitly
  extended by a non-AI upstream process.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Initial consolidated Character Knowledge Manager. |
