# WF-002 / P01 — Create Novel Intake

## Purpose

WF-002 P01 receives the `command.new` result from WF-001 P02, safely validates
its routing envelope, extracts and normalizes a novel title and optional genre,
and emits a stable `context` contract for WF-002 P02. It performs intake only;
it does not create the novel or call external systems.

## Dependencies

- Requires WF-001 P02 **Route NEW** output.
- No credentials required.
- No external services required.

## Architecture

The workflow is independently importable and contains exactly six nodes:

```text
Workflow Trigger (Execute Workflow Trigger; Accept all data)
→ Validate Route (Code)
→ Extract Novel Input (Code)
→ Normalize Novel Input (Code)
→ Validate Novel Input (Code)
→ Create Intake Output (Set)
```

All validation failures are returned as data. They do not intentionally throw an
unhandled workflow error.

## Input contract

The workflow accepts the complete **Route NEW** item from WF-001 P02:

```json
{
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "payload": {
    "workflow_id": "WF-001",
    "source_part": "P01",
    "telegram_update_id": 0,
    "telegram_chat_id": 0,
    "telegram_user_id": 0,
    "command": "new",
    "argument_text": "",
    "command_args": [],
    "received_at": ""
  }
}
```

Only `payload.command_args` is treated as the parsed argument array. The workflow
does not read or emit a field named `arguments`.

## Output contract

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
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "received_at": ""
  }
}
```

For invalid input, `status` is `invalid`, `target` is an empty string, and
`validation_errors` contains one or more messages. Telegram identifiers and the
received timestamp are preserved from the incoming payload, including on invalid
items.

## Import instructions

1. Make `WF-002_P01_v1.0.json` available to the computer running your browser.
2. In n8n 2.29 or later, follow:

   **n8n → Workflows → Import from File → `WF-002_P01_v1.0.json`**

3. Select the file from `workflows/WF-002/P01/` and save it.
4. No credentials need to be configured.

## Exact connection point

Connect the deployed workflows at exactly this point:

```text
WF-001 P02
Route NEW
↓
Execute Workflow node
↓
WF-002 P01 - Create Novel Intake
Workflow Trigger
```

Configure the Execute Workflow node to pass the **Route NEW** item unchanged and
wait for the sub-workflow to complete. This deliverable does not modify WF-001
P02; the connection is made in the deployed n8n workflow.

## Testing instructions

Create a temporary n8n test caller with **Manual Trigger → Edit Fields (Set) →
Execute Workflow**. Select **WF-002 P01 - Create Novel Intake**, pass all data,
and run each mock below. Inspect **Create Intake Output** after every execution.

### Test 1 — Chinese title and genre

```json
{
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "payload": {
    "command": "new",
    "command_args": ["被退婚後，我覺醒神級宗門系統", "修仙"],
    "argument_text": "\"被退婚後，我覺醒神級宗門系統\" 修仙"
  }
}
```

Expected: `novel_title` is `被退婚後，我覺醒神級宗門系統`, `novel_genre` is
`修仙`, `is_valid` is `true`, and `status` is `ready`.

### Test 2 — English title and genre

```json
{
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "payload": {
    "command": "new",
    "command_args": ["The Glass City", "fantasy"],
    "argument_text": "\"The Glass City\" fantasy"
  }
}
```

Expected: `novel_title` is `The Glass City`, `novel_genre` is `fantasy`, and
`is_valid` is `true`.

### Test 3 — Missing title

```json
{
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "payload": {
    "command": "new",
    "command_args": [],
    "argument_text": ""
  }
}
```

Expected: `is_valid` is `false`, `status` is `invalid`, `target` is empty, and
`validation_errors` contains `Novel title is required.`

### Test 4 — Invalid route

```json
{
  "route": "command.help",
  "target": "WF-004",
  "status": "ready",
  "payload": {
    "command": "new",
    "command_args": ["A Valid Title"],
    "argument_text": "A Valid Title"
  }
}
```

Expected: `is_valid` is `false`, `status` is `invalid`, `target` is empty, and
`validation_errors` contains `Invalid route: expected command.new.`

Also test `/new 被退婚後，我覺醒神級宗門系統` behavior by supplying an empty
`command_args` array and `argument_text` set to `被退婚後，我覺醒神級宗門系統`.
The full trimmed text becomes the title and the genre remains empty.

## Validation rules

- `route` must equal `command.new`.
- `status` must equal `ready`.
- `payload` must be an object and `payload.command` must equal `new`.
- The normalized novel title is required and must contain 1–120 Unicode
  characters.
- The normalized genre is optional and may contain at most 40 Unicode characters.
- Leading and trailing whitespace is removed and repeated internal whitespace is
  collapsed.
- Matching quotation marks are removed only when they wrap the entire title.
  Chinese characters and internal punctuation are otherwise preserved.
- A genre is never inferred from `argument_text`.

## Known limitations

- Only the first two `command_args` entries are used; additional entries are
  ignored.
- When `command_args` is empty, all non-empty `argument_text` becomes the title,
  so this fallback cannot distinguish a genre.
- The workflow trusts the Telegram identifier and timestamp values supplied by
  WF-001.
- WF-002 P02 is referenced only as a future routing target and is not created or
  executed by this Part.

## n8n compatibility

Designed for n8n 2.29 and later. The Execute Workflow Trigger explicitly uses
**Accept all data** (`inputSource: passthrough`). The workflow contains no
credentials, secrets, external-service nodes, or community nodes.
