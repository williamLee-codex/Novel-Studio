# WF-002 / P02 — Novel Metadata Builder

## Purpose

WF-002 P02 receives a valid Novel Intake object from WF-002 P01 and transforms it
into the canonical Novel Metadata object used by Novel Studio. This Part is a
pure transformation workflow: it does not persist data or call an external
service.

## Dependencies

- Requires the valid output of **WF-002 P01 / Create Intake Output**.
- No credentials or secrets are required.
- No API, database, Google Drive, or Google Sheets service is required.

## Architecture

```text
Workflow Trigger (Execute Workflow Trigger; Accept all data)
→ Validate Intake
→ Generate Metadata
→ Generate UUID
→ Generate Slug
→ Create Novel Object
→ Output
```

The workflow contains seven connected processing nodes and one non-executable
Sticky Note. Validation failures are returned as an invalid output instead of
being intentionally thrown as unhandled errors.

## Input contract

```json
{
  "route": "novel.create.intake",
  "target": "WF-002-P02",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "context": {
    "source_workflow": "WF-002",
    "source_part": "P01",
    "telegram_update_id": 0,
    "telegram_chat_id": 0,
    "telegram_user_id": 0,
    "novel_title": "被退婚後，我覺醒神級宗門系統",
    "novel_genre": "修仙",
    "received_at": "2026-07-31T00:00:00.000Z"
  }
}
```

The validator requires `route: novel.create.intake`, `target: WF-002-P02`,
`status: ready`, an object `context`, and a non-empty string `novel_title`. It
also rejects an intake explicitly marked with `is_valid: false`.

## Output contract

Valid input produces:

```json
{
  "route": "novel.metadata.created",
  "target": "WF-003-P01",
  "status": "ready",
  "validation_errors": [],
  "metadata": {
    "novel_id": "NS-NOV-000001",
    "uuid": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
    "slug": "novel-xxxxxxxx",
    "title": "被退婚後，我覺醒神級宗門系統",
    "genre": "修仙",
    "status": "draft",
    "created_at": "2026-07-31T00:00:00.000Z",
    "updated_at": "2026-07-31T00:00:00.000Z",
    "workflow_version": "WF-002-P02-v1"
  }
}
```

For invalid intake, the workflow emits `route: novel.metadata.invalid`, an empty
`target`, `status: invalid`, and one or more `validation_errors`. This explicit
invalid contract is an extension of the required success contract.

## Metadata generation

- `novel_id` uses the reserved `NS-NOV` prefix and the initial sequence value
  `000001`.
- `uuid` is generated locally with `crypto.randomUUID()`.
- Latin titles are normalized to lowercase ASCII slugs with hyphens.
- When the runtime cannot derive a safe ASCII slug (including Chinese-only
  titles), the workflow emits `novel-xxxxxxxx`, where `xxxxxxxx` is the first
  eight hexadecimal characters of the generated UUID.
- Both timestamps are created from the same `new Date().toISOString()` value.
- New novels start in `draft` status.
- `workflow_version` is `WF-002-P02-v1`.

Reserved prefixes for future canonical objects are:

| Object | Prefix |
|---|---|
| Novel | `NS-NOV` |
| Character | `NS-CHR` |
| Chapter | `NS-CHP` |
| Bible | `NS-BIB` |
| World | `NS-WLD` |
| Scene | `NS-SCN` |
| Video | `NS-VID` |

## Import instructions

1. Make `WF-002_P02_v1.0.json` available to the computer running your browser.
2. In n8n 2.29 or later, follow:

   **n8n → Workflows → Import from File → `WF-002_P02_v1.0.json`**

3. Select the file from `workflows/WF-002/P02/` and save the workflow.
4. No credentials need to be configured.

## Connection with WF-002 P01

```text
WF-002 P01 - Create Novel Intake
Create Intake Output
↓
Execute Workflow node
↓
WF-002 P02 - Novel Metadata Builder
Workflow Trigger
```

Configure the Execute Workflow node to pass all input data unchanged and wait
for the sub-workflow to complete. P02's Workflow Trigger is explicitly configured
for **Accept all data**.

## Testing

Create a temporary caller containing **Manual Trigger → Edit Fields (Set) →
Execute Workflow**. Target **WF-002 P02 - Novel Metadata Builder**, pass all input
data, and use the input-contract example above.

Verify at **Output** that:

1. `route`, `target`, and `status` equal `novel.metadata.created`, `WF-003-P01`,
   and `ready`.
2. `metadata.novel_id` matches `NS-NOV-000001`.
3. `metadata.uuid` is a UUID and differs across executions.
4. The Chinese title produces a slug matching `novel-[a-f0-9]{8}`.
5. `metadata.title` and `metadata.genre` match the intake values.
6. Both timestamps are valid ISO 8601 values and are equal.
7. `metadata.status` is `draft` and `workflow_version` is `WF-002-P02-v1`.

Repeat with title `The Glass City`; verify the slug is `the-glass-city`.

For a failure-path test, change `route` to `command.help`. Verify that the output
has `route: novel.metadata.invalid`, `target: ""`, `status: invalid`, and an
invalid-route message in `validation_errors`.

## Known limitations

- Without persistence or a sequence service, this version emits the initial
  `NS-NOV-000001` value for every execution. A later persistence Part must assign
  collision-free sequential IDs while retaining the `NS-NOV-######` format.
- Pinyin transliteration is unavailable without an external library or service.
  Chinese-only titles therefore use the deterministic-per-UUID fallback format.
- Slug collision detection is deferred until a persistence layer exists.
- The UUID and timestamps are generated even for invalid input, but invalid data
  is clearly marked and has no downstream target.
- This Part does not create or execute WF-003 P01.

## n8n compatibility

Designed for n8n 2.29 and later. It uses core Execute Workflow Trigger, Code,
Edit Fields (Set), and Sticky Note nodes only. It contains no credentials,
secrets, community nodes, or external-service nodes.
