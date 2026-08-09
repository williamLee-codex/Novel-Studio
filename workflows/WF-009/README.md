# WF-009 - Timeline Knowledge Manager v2

## Purpose

WF-009 receives the World Knowledge output from WF-008 and prepares canonical
Timeline Knowledge Objects only from event records explicitly present in the
input. It validates the envelope, selects and normalizes records, isolates
invalid events, generates identities, builds objects, merges execution-local
duplicates, reports conflicts, summarizes results, and returns one versioned
contract.

It does not parse prose or invent events. It uses no AI, OpenAI, LLM, embeddings,
vector store, database, Google service, external API, credential, secret,
filesystem, or external package. Missing timeline input is valid.

## Architecture

The workflow contains ten functional nodes, nine direct connections, and five
Sticky Notes:

```text
Workflow Trigger
→ Validate Timeline Route
→ Extract Timeline Input
→ Normalize Timeline Records
→ Validate Timeline Records
→ Generate Timeline UUID
→ Build Timeline Knowledge Objects
→ Deduplicate Timeline
→ Calculate Timeline Summary
→ Build Final Output
```

One Execute Workflow Trigger accepts all data. Every transformation is a
plain-JavaScript Code node. Invalid envelopes reach the error output without an
intentional exception; invalid event records do not block valid events.

## Input Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "world.created",
  "target": "WF-009",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "worlds": [],
  "invalid_world_records": [],
  "world_conflicts": [],
  "summary": {},
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

### Latest-contract difference

The actual latest WF-008 output has no timeline array, so its direct output
correctly produces an empty ready WF-009 collection. An explicit non-AI
upstream enrichment may attach an array at `context.timeline_records`,
`context.timeline`, `context.events`, top-level `timeline_records`, `timeline`,
or `events`. The first array in that priority order is used; arrays are not
combined.

## Timeline Schema

A source event may contain:

```json
{
  "event_name": "九玄宗保衛戰",
  "event_type": "battle",
  "chapter_number": 12,
  "event_order": 1,
  "aliases": ["北荒宗門戰"],
  "participants": ["林玄"],
  "locations": ["九玄宗"],
  "factions": ["九玄宗"],
  "description": "",
  "notes": "",
  "source_chapter_uuid": "CHP-a1b2c3d4"
}
```

`event_name` is required. Missing chapter number falls back to the incoming
context chapter number. Missing order uses `0`. Arrays
and strings remain empty when absent; no participants, places, factions, facts,
or chronology are inferred.

Canonical output objects contain:

```json
{
  "timeline_uuid": "TML-a1b2c3d4",
  "event_name": "九玄宗保衛戰",
  "event_type": "battle",
  "chapter_number": 12,
  "event_order": 1,
  "aliases": ["北荒宗門戰"],
  "participants": ["林玄"],
  "locations": ["九玄宗"],
  "factions": ["九玄宗"],
  "description": "",
  "notes": "",
  "novel_uuid": "NOV-a1b2c3d4",
  "workspace_uuid": "WS-a1b2c3d4",
  "source_chapter_uuid": "CHP-a1b2c3d4",
  "timeline_version": "1.0",
  "created_at": "2026-08-01T00:00:01.000Z",
  "updated_at": "2026-08-01T00:00:01.000Z",
  "created_by": "Novel Studio WF-009"
}
```

## Supported Event Types

`battle`, `breakthrough`, `death`, `birth`, `marriage`, `betrayal`, `alliance`,
`inheritance`, `mission`, `discovery`, `sect_event`, `kingdom_event`,
`world_event`, and `other` are supported. Types are lowercased; missing or
unsupported types normalize to `other`.

## Normalization and Validation

- Strings are trimmed and repeated internal whitespace collapses to one.
- Chinese characters and punctuation are otherwise preserved.
- Aliases, participants, locations, and factions become unique normalized arrays.
- Missing arrays become `[]`; supplied non-arrays make that record invalid.
- Chapter number and event order must be non-negative integers; missing values use
  the documented fallbacks, while supplied invalid values are rejected.
- Missing source chapter UUID falls back to the incoming chapter UUID.
- Missing event name makes only that record invalid.

Record errors remain internal to processing and are counted in
`summary.invalid_records`; the approved final contract does not expose a separate
invalid-record array. Canon-valid runs remain ready when some event records are
invalid.

## Timeline ID Rules

Only valid records receive `TML-xxxxxxxx`. The helper uses the established local
deterministic `novel_uuid + chapter + event order + normalized event name` hash, sequential database
ID, package, or external service. Version is `1.0`; created/updated timestamps
share one ISO 8601 instant per object; creator is `Novel Studio WF-009`.

## Deduplication

The execution-local primary key is normalized `event_name + chapter_number`
(case-insensitive name comparison while preserving first spelling). The first
record is the base. Later duplicates merge unique aliases, participants,
locations, and factions. Empty scalar values may be filled, but existing
non-empty values are never overwritten.

Scalar disagreements become `timeline_conflicts` records containing event name,
chapter number, field, existing value, incoming value, and source index. The
first value remains canonical.

## Output Contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "timeline.created",
  "target": "WF-010",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "timeline": [],
  "timeline_conflicts": [],
  "summary": {
    "source_records": 0,
    "valid_records": 0,
    "invalid_records": 0,
    "timeline_objects_created": 0,
    "duplicates_merged": 0,
    "conflicts_detected": 0,
    "type_counts": {
      "battle": 0,
      "breakthrough": 0,
      "death": 0,
      "birth": 0,
      "marriage": 0,
      "betrayal": 0,
      "alliance": 0,
      "inheritance": 0,
      "mission": 0,
      "discovery": 0,
      "sect_event": 0,
      "kingdom_event": 0,
      "world_event": 0,
      "other": 0
    }
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

Invalid envelope input uses the same route/target, error/invalid state, empty
event/conflict arrays, a zero summary with empty type counts, and empty context.

## Empty-Input Behavior

An absent source or empty array is ready and valid. Timeline and conflict arrays
are empty, all summary totals are zero, all 14 type counts are present as zero,
and source context is preserved. No event is derived from world or chapter data.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-009/WF-009_Timeline_Knowledge_Manager_v2.0.json`.
3. Confirm ten functional nodes, nine direct connections, five Sticky Notes, and
   one Accept-all-data Workflow Trigger.
4. Save it; no credentials require configuration.
5. Run valid, duplicate, missing-name, unsupported-type, empty, and invalid-route
   tests before connecting WF-010.

## Connection Instructions

Configure WF-008 or an explicit non-AI enrichment boundary to call WF-009 with
the full `world.created` contract and wait for completion. The enrichment may
attach one supported event array without altering context. Route successful
`timeline.created` output to WF-010 when available.

## Testing

1. Valid Chinese battle event → ready, one `TML-` object, battle count one.
2. Duplicate event key → one object; arrays merge; duplicate count increases.
3. Duplicate scalar conflict → first retained and conflict reported.
4. Missing event name → invalid count increases; Canon-valid workflow stays ready.
5. Unsupported event type → `other` and other count one.
6. Empty/absent source → ready/valid empty timeline.
7. Invalid route → error/invalid, empty result/context.
8. Verify array normalization, fallbacks, UUID, synchronized timestamps, summary,
   type counts, and exact terminal fields.

### Validation Report

Validated on 2026-08-01: JSON parsing, ten-functional-node/nine-connection and
five-note structure, one passthrough trigger, Code-node syntax/execution, valid,
duplicate, conflict, missing-name, unsupported-type, empty, and invalid-route
cases, Chinese preservation, summary/type counts, exact contract,
prohibited-service/reference scan, scope review, and `git diff --check` passed.
The container does not include n8n, so live n8n 2.29+ import remains a
release-environment check.

## Limitations

- No AI or prose-based event extraction.
- No cross-chapter persistent timeline deduplication.
- No database-backed event identity or chronology resolution.
- Conflicting non-empty scalar values are reported but not automatically resolved.
- Event order is local metadata, not a global calendar or causal graph.
- Invalid-record details are counted but not exposed by the approved output schema.
- The current WF-008 output carries no timeline source unless explicitly extended
  by a non-AI upstream process.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Initial consolidated Timeline Knowledge Manager. |

## Cross-run identity key

Timeline UUIDs are deterministic from `novel_uuid`, chapter number, event order, and normalized event name. A retry of the same chapter/event therefore addresses the same Timeline identity.
