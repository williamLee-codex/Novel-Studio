# WF-002 - Novel Manager v2

## Purpose

Novel Manager v2 consolidates novel command intake, title/genre parsing,
validation, UUID and slug generation, metadata assembly, and final routing into
one n8n workflow. It accepts the versioned `command.new` contract from WF-001
and returns canonical novel metadata for WF-005.

It performs plain-JavaScript data transformation only. It has no Telegram node,
external API, OpenAI, Google integration, database, filesystem operation,
credential, secret, package, or sequential-ID dependency.

## Architecture

The workflow contains ten functional nodes and nine direct connections:

| Section | Nodes | Responsibility |
| --- | --- | --- |
| Novel Intake | Workflow Trigger through Validate Novel Input | Validate the WF-001 envelope; extract, normalize, and validate title/genre |
| Novel Metadata | Generate Novel UUID through Normalize Novel Metadata | Generate identity, slug, timestamps, and a clean canonical object |
| Final Output | Build Final Output | Emit the exact ready or error contract |

There is one Execute Workflow Trigger in Accept-all-data mode and no internal
Execute Workflow node. Invalid input remains on the main path and reaches the
final output without an intentional exception.

## Workflow Diagram

```text
Workflow Trigger
  ↓
Validate Novel Route
  ↓
Extract Novel Input
  ↓
Normalize Novel Input
  ↓
Validate Novel Input
  ↓
Generate Novel UUID
  ↓
Generate Novel Slug
  ↓
Generate Novel Metadata
  ↓
Normalize Novel Metadata
  ↓
Build Final Output
```

## Source Workflows Merged

- `workflows/WF-002/P01/` — Create Novel Intake
- `workflows/WF-002/P02/` — Novel Metadata Builder

The original directories remain unchanged. Their README and workflow JSON files
are copied byte-for-byte into `archive/P01` and `archive/P02`. The consolidated
workflow removes the old P01 output/P02 input envelope and internal handoff.

## Input Contract from WF-001

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "context": {
    "source_workflow": "WF-001",
    "telegram_update_id": 123,
    "telegram_chat_id": 456,
    "telegram_user_id": 789,
    "command": "new",
    "argument_text": "\"The Glass City\" fantasy",
    "command_args": ["The Glass City", "fantasy"],
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

This matches the latest consolidated WF-001 Route NEW contract in the repository.
Route validation requires schema `1.0`, ready and valid status, `command.new`, an
object context, `context.command: new`, an array `command_args`, and a string
`argument_text`.

## Novel Parsing Rules

1. When `command_args` has entries, the first becomes the title and the optional
   second becomes the genre. Additional entries are ignored by this version.
2. When `command_args` is empty and trimmed `argument_text` is non-empty, the
   complete `argument_text` becomes the title and genre stays empty.
3. Values are converted to strings only after the input collection is verified.
4. Chinese characters and punctuation are preserved.
5. A genre is never inferred or invented.

## Title Normalization Rules

Leading/trailing whitespace is removed and repeated internal whitespace is
collapsed to one space. A matching pair of straight, curly, or CJK quotation
marks is removed only when it wraps the complete value. Chinese punctuation and
English capitalization inside the title remain unchanged. Title length is
measured as Unicode code points and must be 1–120 characters.

## Genre Behavior

Genre follows the same whitespace and complete-wrapper normalization. It is
optional and may be `""`; when supplied it must not exceed 40 Unicode code
points. No taxonomy, capitalization, translation, or default genre is imposed.

## UUID Rules

`uuidHelper()` uses the established local Math.random-based UUID fallback. The
first eight hexadecimal characters are prefixed with `NOV-`, for example
`NOV-a1b2c3d4`. No cryptographic UUID API, sequential counter, database, external
package, or API is used. `novel_id` remains `null` until a persistence layer can
assign an authoritative identifier.

## Slug Rules

English/ASCII titles are NFKD-normalized, lowercased, separated with hyphens,
trimmed, and limited to 80 characters. `The Glass City` becomes
`the-glass-city`. When no safe ASCII slug remains—such as a Chinese-only title—
the fallback is `novel-<UUID suffix>`. Transliteration is deliberately not
attempted.

## Metadata Rules

Valid creation produces:

- `novel_status: draft`;
- schema `1.0` and workflow `2.0` internally;
- one ISO 8601 instant shared by `created_at` and `updated_at`;
- `created_by: Novel Studio WF-002`;
- numeric Telegram update/chat/user IDs with safe zero fallbacks; and
- the original string `received_at` from WF-001.

Normalize Novel Metadata retains only final novel and Telegram context fields;
route flags, raw values, parsing fields, and validation internals do not leak.

## Final Output Contract

Successful output:

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "novel.metadata.created",
  "target": "WF-005",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "novel": {
    "novel_uuid": "NOV-a1b2c3d4",
    "novel_id": null,
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "novel_status": "draft",
    "created_at": "2026-08-01T00:00:01.000Z",
    "updated_at": "2026-08-01T00:00:01.000Z",
    "created_by": "Novel Studio WF-002"
  },
  "context": {
    "telegram_update_id": 123,
    "telegram_chat_id": 456,
    "telegram_user_id": 789,
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

Invalid output keeps the same version, route, target, and Telegram context, sets
`status: error`, `is_valid: false`, includes every validation message, and sets
`novel: null`.

## Invalid-Input Behavior

Route and content errors accumulate. Missing titles, titles over 120 characters,
genres over 40 characters, wrong routes/statuses, invalid upstream contracts,
and malformed context fields reach Build Final Output without intentionally
throwing. UUID, slug, and metadata generation are skipped when invalid.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-002/WF-002_Novel_Manager_v2.0.json`.
3. Confirm ten nodes, nine direct connections, and one Accept-all-data Workflow
   Trigger.
4. Save the workflow. No credentials require configuration.
5. Run the required contract tests before connecting production callers.

## Connection Instructions

Configure WF-001's NEW route caller to invoke **WF-002 - Novel Manager v2**, pass
the entire contract, and wait for completion. The output targets WF-005.

The current legacy WF-005 export expects its novel values under `metadata`
(or as top-level aliases), whereas the approved v2 contract uses `novel`. Until
WF-005 is consolidated for the v2 envelope, configure the WF-005 caller boundary
to map `novel` to `metadata` without changing the values. This deployment mapping
preserves existing WF-005 behavior without leaking legacy aliases into the v2
canonical output.

## Testing

| Case | Expected result |
| --- | --- |
| Chinese title plus `修仙` in `command_args` | Ready; both values preserved |
| `The Glass City`, `fantasy` | Ready; slug `the-glass-city` |
| One Chinese title entry | Ready; empty genre and safe fallback slug |
| Empty `command_args`, non-empty `argument_text` | Ready; full fallback title |
| Both sources empty | Error; missing-title message; null novel |
| Route `command.help` | Error; null novel |
| Title of 121 characters | Error; maximum-length message |
| Wrapping CJK/curly/straight quotes | Wrapper removed; content preserved |

### Validation Report

Validated on 2026-08-01: JSON parsing, ten-node/nine-connection structure,
single passthrough trigger, no internal Execute Workflow node, all seven required
contract cases, Chinese and quoted-title preservation, UUID/slug/timestamp and
field-order assertions, invalid-path null output, archive byte equality,
forbidden-reference scan, scope check, and `git diff --check` passed. The
container does not include n8n, so live UI import remains a release-environment
check.

## Migration from P01 and P02

Old:

```text
WF-002 P01 → Execute Workflow → WF-002 P02
```

New:

```text
WF-002 - Novel Manager v2
```

The caller should invoke only the consolidated workflow. Import and contract-test
v2, update WF-001 NEW to the new workflow, configure the temporary WF-005
boundary mapping described above, and keep the old chain inactive during the
rollback window. Do not delete the old workflows from n8n.

## Rollback Instructions

1. Stop new calls to Novel Manager v2.
2. Restore WF-001's NEW target to WF-002 P01.
3. Restore the P01-to-P02 call with its prior deployment configuration.
4. Restore the prior P02-to-WF-005 mapping.
5. Execute Chinese, English, and missing-title smoke tests.
6. Use `archive/P01` and `archive/P02` for comparison or re-import while
   retaining the original repository directories.

## Known Limitations

- No transliteration is performed for non-ASCII titles.
- Only the first two `command_args` values are used.
- Uniqueness is probabilistic until a persistence layer enforces it.
- `novel_id` is intentionally null.
- Duplicate-title detection, persistence, and lifecycle transitions are deferred.
- Current legacy WF-005 needs the documented boundary mapping for the v2
  `novel` envelope.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Consolidated novel intake and metadata generation. |
