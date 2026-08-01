# WF-008 - World Knowledge Manager v2

## Purpose

WF-008 receives the Character Knowledge output from WF-007 and prepares
canonical World Knowledge Objects only from world records explicitly present in
the input. It validates the contract, normalizes and validates records
independently, generates IDs, builds objects, deduplicates same-type/same-name
records, reports conflicts, and returns a stable collection contract.

It does not inspect prose, character names, or chapter titles to invent settings.
It uses no AI, OpenAI, LLM, embeddings, vector store, database, Google service,
external API, credential, secret, filesystem, or external package. Missing world
data is a valid empty collection.

## Architecture

The workflow contains 11 functional nodes, ten direct connections, and five
Sticky Notes:

```text
Workflow Trigger
→ Validate Character Route
→ Extract Canon Context
→ Extract World Input
→ Normalize World Records
→ Validate World Records
→ Generate World IDs
→ Build World Knowledge Objects
→ Deduplicate World Records
→ Calculate World Summary
→ Build Final Output
```

One Execute Workflow Trigger accepts all incoming data. The remaining nodes are
plain-JavaScript Code nodes. Canon-level failures reach the final error output;
invalid world records are isolated and never block valid records.

## Input Contract from WF-007

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

The actual latest WF-007 output context does not include world arrays. Its direct
output therefore produces a valid empty WF-008 collection. WF-008 supports the
approved optional source fields below when an explicit, non-AI upstream process
attaches them. It never derives a location, faction, or realm from character
records or prose.

## Supported World Source Fields

The first array found in this order is used:

1. `context.world_records`
2. `context.world`
3. `context.world_entries`
4. top-level `world_records`
5. top-level `worlds`
6. `canon.world_records`
7. `canon.world`

If no field is an array, `world_records` is `[]`. Sources are not concatenated,
preventing duplicate ingestion across aliases.

## Supported World Types

`region`, `location`, `faction`, `sect`, `kingdom`, `dynasty`, `race`, `system`,
`law`, `history`, `organization`, `building`, `battlefield`, `forbidden_area`,
`realm`, `resource`, `environment`, and `other` are supported. Type values are
lowercased. Missing or unsupported values normalize to `other` rather than
inventing a classification.

## World Input Schema

```json
{
  "name": "九玄宗",
  "world_type": "sect",
  "parent_name": "",
  "region": "北荒",
  "description": "",
  "leader": "林淵",
  "members": [],
  "related_factions": [],
  "related_locations": [],
  "rules": [],
  "history": "",
  "status": "",
  "first_appearance_chapter": 1,
  "aliases": ["九玄仙宗"],
  "notes": "",
  "source_chapter_uuid": "CHP-a1b2c3d4"
}
```

Only `name` is required. Optional facts remain empty, empty arrays, or null when
not supplied.

## Normalization Rules

- Strings are trimmed and repeated internal whitespace collapses to one.
- Chinese characters and punctuation are otherwise preserved.
- Type is lowercased and unsupported/missing values become `other`.
- Aliases, members, related factions, related locations, and rules become arrays
  of unique, non-empty normalized strings.
- A missing array field becomes `[]`; a supplied non-array is record-invalid.
- Missing notes and scalar facts become empty strings.
- First appearance is a positive integer or `null` when absent; other supplied
  values are invalid.
- Missing source chapter UUID falls back to incoming context chapter UUID.
- Leaders, members, places, laws, history, and relationships are never inferred.

## Validation Rules

The envelope requires schema `1.0`, `characters.created`, ready/valid state, an
object context, four non-empty domain/Canon UUIDs, and a non-negative integer
chapter number.

Each record requires a 1–150-character name, supported normalized type, arrays
for all collection fields, and a positive-integer/null first appearance. Invalid
records retain:

```json
{
  "source_index": 2,
  "validation_errors": ["World name is required."],
  "original_record": {"world_type": "sect"}
}
```

Record-level invalidity does not change the ready state when the incoming
character contract is valid.

## World ID Rules

Only valid records receive `WLD-xxxxxxxx`. The helper uses the established local
Math.random UUID fallback, never a cryptographic UUID API, sequential database
ID, package, or external service.

## World Knowledge Object

```json
{
  "world_uuid": "WLD-a1b2c3d4",
  "world_name": "九玄宗",
  "world_type": "sect",
  "aliases": ["九玄仙宗"],
  "parent_name": "",
  "region": "北荒",
  "description": "",
  "leader": "林淵",
  "members": [],
  "related_factions": [],
  "related_locations": [],
  "rules": [],
  "history": "",
  "status": "",
  "first_appearance_chapter": 1,
  "notes": "",
  "novel_uuid": "NOV-a1b2c3d4",
  "workspace_uuid": "WS-a1b2c3d4",
  "source_canon_uuid": "CANON-a1b2c3d4",
  "source_chapter_uuid": "CHP-a1b2c3d4",
  "source_chapter_number": 1,
  "world_version": "1.0",
  "created_at": "2026-08-01T00:00:01.000Z",
  "updated_at": "2026-08-01T00:00:01.000Z",
  "created_by": "Novel Studio WF-008"
}
```

Creation and update timestamps share one ISO 8601 instant per object.

## Deduplication Rules

The execution-local key is normalized `world_type + world_name`
(case-insensitive name comparison while preserving first spelling). Different
world types never merge automatically. For duplicates:

- the first valid record is the base;
- aliases, members, factions, locations, and rules merge uniquely;
- empty scalar fields may be filled from later records;
- conflicting non-empty scalar fields retain the first value; and
- every disagreement becomes a `world_conflicts` entry.

## Conflict Behavior

```json
{
  "world_name": "九玄宗",
  "world_type": "sect",
  "field": "leader",
  "existing_value": "林淵",
  "incoming_value": "陳玄",
  "source_index": 1
}
```

Conflicts are reported but not automatically resolved and do not invalidate a
contract-valid run.

## Final Output Contract

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
  "summary": {
    "source_records": 0,
    "valid_records": 0,
    "invalid_records": 0,
    "world_objects_created": 0,
    "duplicates_merged": 0,
    "conflicts_detected": 0,
    "type_counts": {
      "region": 0,
      "location": 0,
      "faction": 0,
      "sect": 0,
      "kingdom": 0,
      "dynasty": 0,
      "race": 0,
      "system": 0,
      "law": 0,
      "history": 0,
      "organization": 0,
      "building": 0,
      "battlefield": 0,
      "forbidden_area": 0,
      "realm": 0,
      "resource": 0,
      "environment": 0,
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

Invalid envelope input keeps route/target, uses error/invalid state, empty arrays,
a zero summary with empty type counts, and `context: {}`.

## Empty-Input Behavior

No source or an empty source array is ready and valid. `worlds` stays empty,
`world_objects_created` is zero, and all supported type counts are present as
zero. No setting is inferred from chapter or character data.

## Invalid-Record Behavior

Invalid world records appear only in `invalid_world_records`. Valid records in
the same execution continue through ID generation, object construction,
deduplication, and output. Summary counts distinguish source, valid, invalid,
unique-created, merged, conflict, and per-type totals.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-008/WF-008_World_Knowledge_Manager_v2.0.json`.
3. Confirm 11 functional nodes, ten direct connections, five Sticky Notes, and
   one Accept-all-data Workflow Trigger.
4. Save it; no credentials require configuration.
5. Run empty, valid, invalid-record, duplicate, conflict, and type tests.

## Connection Instructions

Configure WF-007 or an explicit non-AI enrichment boundary to call WF-008 with
the complete `characters.created` envelope. An enrichment boundary may attach
one supported world array without altering the Canon context. Route successful
`world.created` output to WF-009 when available.

## Testing

1. Valid 九玄宗 sect → one `WLD-` object, sect count one, ready.
2. Empty/absent source → ready/valid empty worlds.
3. Missing name → isolated invalid record; workflow remains ready.
4. Duplicate sect aliases → one world, merged aliases, duplicate count one.
5. Conflicting leaders → first retained and conflict recorded.
6. Unsupported type → `other` and other count one.
7. String first appearance → invalid record.
8. Same name with two types → two separate worlds.
9. Invalid route → error/invalid, empty results/context.
10. Verify exact fields, ISO timestamps, summary/type counts, and no intermediates.

### Validation Report

Validated on 2026-08-01: JSON parsing, 11-functional-node/ten-connection and
five-note structure, one passthrough trigger, Code-node syntax/execution, all
nine required behavior cases, Chinese preservation, array normalization, record
isolation, type-aware deduplication, conflict preservation, summary/type counts,
exact contract, prohibited-service/reference scan, scope review, and
`git diff --check` passed. The container does not include n8n, so live n8n 2.29+
import remains a release-environment check.

## Known Limitations

- No AI extraction from prose.
- No cross-chapter persistent deduplication.
- No database-backed world identity resolution.
- Different world types are not merged automatically.
- Conflicting scalar values are reported but not resolved automatically.
- No relationship graph generation in v2.0.
- Same-type/same-name entities that are actually distinct require future
  disambiguation.
- The current WF-007 output carries no world source unless explicitly extended
  by a non-AI upstream process.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Initial consolidated World Knowledge Manager. |
