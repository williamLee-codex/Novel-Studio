# WF-010 - Story Bible Manager v2

## Purpose

WF-010 receives the successful `timeline.created` contract from WF-009 and assembles the structured canon, character, world, timeline, and conflict data already available in that contract into one versioned Story Bible. It does not parse prose, infer facts, resolve conflicts, call an external service, or persist data.

Empty knowledge sections are valid. A route-level contract error returns an error envelope with `story_bible: null`; an invalid record inside an otherwise valid collection is removed, reported, and does not block the remaining records.

## Architecture

The workflow is one self-contained n8n workflow with 14 functional nodes and four Sticky Notes:

1. **Intake** validates the WF-009 envelope and extracts identifiers and available collections.
2. **Knowledge Normalization** canonicalizes each section, filters invalid collection items, preserves conflicts, and deterministically sorts timeline entries.
3. **Story Bible Assembly** generates the Story Bible identity, sections, index, and summary.
4. **Output** emits only the public `story_bible.created` contract.

All transformations use plain JavaScript Code nodes. The workflow has one Execute Workflow Trigger, configured to accept all incoming data, and has no credentials or integration nodes.

## Workflow diagram

```text
Workflow Trigger
  -> Validate Timeline Route
  -> Extract Story Context
  -> Extract Knowledge Collections
  -> Normalize Canon Section
  -> Normalize Character Section
  -> Normalize World Section
  -> Normalize Timeline Section
  -> Validate Knowledge Sections
  -> Generate Story Bible UUID
  -> Build Story Bible Sections
  -> Build Story Bible Index
  -> Calculate Story Bible Summary
  -> Build Final Output
```

## Input contract from WF-009

The repository's WF-009 v2 output is authoritative. Its canonical output carries timeline objects at the top-level `timeline` field and identifiers in `context`:

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
  "summary": {},
  "context": {
    "canon_uuid": "CAN-example",
    "novel_uuid": "NOV-example",
    "workspace_uuid": "WS-example",
    "chapter_uuid": "CH-example",
    "chapter_number": 1,
    "chapter_title": "第一章"
  }
}
```

WF-009 does not currently guarantee that canon, character, or world collections are forwarded. Consequently, a direct canonical WF-009 output creates those sections as empty. WF-010 also accepts the optional extension fields below when an orchestrator preserves them; it never manufactures missing data.

Route validation requires schema `1.0`, route `timeline.created`, `status: ready`, `is_valid: true`, a context object, non-empty novel/workspace/chapter identifiers, and a non-negative integer chapter number.

## Supported knowledge source fields

The first available value in each priority list is used:

| Section | Supported fields |
|---|---|
| Canon | `context.canon`, `canon`, `context.canon_records`, `canon_records` |
| Characters | `context.characters`, `characters`, `context.character_records`, `character_records` |
| World | `context.worlds`, `worlds`, `context.world_records`, `world_records` |
| Timeline | `context.timeline`, `timeline`, `context.timeline_records`, `timeline_records` |
| Character conflicts | `context.character_conflicts`, `character_conflicts` |
| World conflicts | `context.world_conflicts`, `world_conflicts` |
| Timeline conflicts | `context.timeline_conflicts`, `timeline_conflicts` |

Missing canon becomes `{}`. Missing collections and conflict lists become `[]`.

## Canon section schema

```json
{
  "canon_uuid": "",
  "canon_type": "",
  "canon_version": "",
  "chapter_uuid": "",
  "chapter_number": 0,
  "chapter_title": "",
  "entries": []
}
```

Available canonical values are preserved. `entries` is always an array; null, primitive, or array entries are removed and reported. When canon is absent the section remains `{}` and its index count is zero.

## Character section behavior

Characters must be supplied as an array. Object records are preserved in source order without generating IDs, merging identities, rewriting language, or performing cross-chapter resolution. Nulls, arrays, and primitive items are removed and recorded under `invalid_knowledge_records` with section `characters`.

## World section behavior

World knowledge must be supplied as an array. Object records are preserved in source order without generating IDs, merging records, or changing terminology. Invalid items are removed and reported with section `world`.

## Timeline sorting rules

Timeline objects are preserved and sorted by:

1. `chapter_number` ascending;
2. `event_order` ascending;
3. `event_name` using JavaScript string ordering.

Missing or invalid numeric sort values sort as zero. The workflow does not generate timeline IDs. Invalid items are removed and reported with section `timeline`.

## Conflict preservation

Character, world, and timeline conflicts are preserved in distinct arrays. WF-010 neither reconciles nor suppresses conflicts. Invalid conflict items are removed and reported using their respective conflict section name.

## Invalid-record behavior

Every removed collection item produces:

```json
{
  "section": "characters",
  "source_index": 1,
  "validation_errors": ["Character record must be an object"],
  "original_record": "invalid"
}
```

Individual invalid records do not make the envelope invalid. A malformed section container is treated as an empty collection and adds a section-level record with `source_index: -1`. Only failures of the input envelope make the final workflow output an error.

## Story Bible object schema

```json
{
  "story_bible_uuid": "BIB-a1b2c3d4",
  "novel_uuid": "NOV-example",
  "workspace_uuid": "WS-example",
  "story_bible_version": "1.0",
  "sections": {
    "overview": {
      "novel_uuid": "NOV-example",
      "workspace_uuid": "WS-example",
      "latest_chapter_uuid": "CH-example",
      "latest_chapter_number": 1,
      "latest_chapter_title": "第一章"
    },
    "canon": {},
    "characters": [],
    "world": [],
    "timeline": [],
    "conflicts": {
      "character_conflicts": [],
      "world_conflicts": [],
      "timeline_conflicts": []
    }
  },
  "index": {},
  "summary": {},
  "created_at": "2026-08-01T00:00:00.000Z",
  "updated_at": "2026-08-01T00:00:00.000Z",
  "created_by": "Novel Studio WF-010"
}
```

`story_bible_uuid` uses the non-sequential `BIB-xxxxxxxx` Math.random fallback. It is generated only for a valid route-level contract. Creation and update timestamps are the same ISO 8601 value.

## Story Bible index schema

```json
{
  "canon_count": 0,
  "character_count": 0,
  "world_count": 0,
  "timeline_count": 0,
  "character_conflict_count": 0,
  "world_conflict_count": 0,
  "timeline_conflict_count": 0,
  "invalid_knowledge_count": 0
}
```

Canon counts as one object only when a non-empty canonical object exists. Other counts are collection lengths after invalid items are removed.

## Summary schema

```json
{
  "sections_created": 5,
  "knowledge_objects_total": 0,
  "conflicts_total": 0,
  "invalid_records_total": 0,
  "has_canon": false,
  "has_characters": false,
  "has_world": false,
  "has_timeline": false
}
```

`knowledge_objects_total` is the sum of canon, character, world, and timeline counts. `conflicts_total` is the sum of all three conflict counts.

## Empty-input behavior

When the route-level envelope is valid, empty or absent knowledge collections are successful input. WF-010 creates a Story Bible with empty `characters`, `world`, and `timeline` arrays, an empty canon object, zero counts, and `status: ready`.

## Final output contract

Successful output:

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "story_bible.created",
  "target": "WF-011",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "story_bible": {},
  "invalid_knowledge_records": [],
  "context": {
    "canon_uuid": "",
    "novel_uuid": "",
    "workspace_uuid": "",
    "chapter_uuid": "",
    "chapter_number": 0,
    "chapter_title": ""
  }
}
```

Invalid route-level output uses the same schema, route, and target with `status: error`, `is_valid: false`, collected `validation_errors`, `story_bible: null`, an empty invalid-record array, and `context: {}`.

## Import guide

1. In n8n 2.29 or newer, select **Import from File**.
2. Import `WF-010_Story_Bible_Manager_v2.0.json`.
3. Confirm the workflow name is **WF-010 - Story Bible Manager v2**.
4. Confirm the Execute Workflow Trigger accepts all incoming data.
5. Save and publish after completing the tests below.

No credential binding or environment configuration is required.

## Connection instructions

Configure the orchestrator or WF-009 caller to execute only this consolidated workflow after a successful `timeline.created` result. Pass the complete WF-009 item unchanged so top-level timeline and conflict fields remain available. Route WF-010's `story_bible.created` output to WF-011 when that downstream workflow is available.

## Testing

Minimum contract tests:

1. Canon plus one character, world, and timeline object: all index counts are one and `knowledge_objects_total` is four.
2. Empty collections: a valid Story Bible is created with empty sections.
3. Mixed valid and invalid characters: valid objects remain and the invalid item is reported.
4. Out-of-order timeline objects: chapter, order, then name sorting is applied.
5. Supplied conflicts: all lists and counts are preserved.
6. Missing `novel_uuid`: error output with `story_bible: null`.
7. Incorrect route: error output.
8. Import in n8n 2.29+: no missing nodes, expression-security errors, crypto errors, external credentials, or extra triggers.

## Known limitations

- No AI summarization.
- No prose extraction.
- No persistent cross-chapter merge.
- No database-backed identity resolution.
- Conflicts are preserved but not automatically resolved.
- No Markdown document generation in v2.0.
- No automatic persistence in this workflow.
- The canonical WF-009 contract currently forwards timeline knowledge but does not guarantee canon, character, or world collections; an orchestrator must preserve those optional fields when a combined Story Bible is required.

## Version history

| Version | Date | Changes |
|---|---|---|
| 2.0 | 2026-08-01 | Initial consolidated Story Bible Manager with contract validation, section normalization, conflict preservation, indexing, and summary generation. |

## Validation report

The export is designed for n8n 2.29+ and contains one passthrough Execute Workflow Trigger, 13 plain-JavaScript Code nodes, and four Sticky Notes. Repository validation covers JSON parsing, connection integrity, Code-node execution for the documented cases, prohibited-node/reference scans, scope checks, and `git diff --check`. Live n8n UI import remains a deployment-environment verification step.
