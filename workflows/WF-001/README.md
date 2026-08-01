# WF-001 - Telegram Command Manager v2

## Purpose

Telegram Command Manager v2 consolidates Telegram message intake, command
parsing, validation, and downstream routing into one n8n workflow. It replaces
the internal P01-to-P02 sub-workflow handoff with direct node connections while
preserving Telegram identifiers, quoted command values, `command_args`,
`received_at`, human-readable validation, command routes, and downstream targets.

The Telegram Trigger is the workflow's only external boundary. No OpenAI,
Google service, database, filesystem, package, secret, or other API is used.

## Architecture

The workflow contains nine functional nodes:

| Section | Nodes | Responsibility |
| --- | --- | --- |
| Telegram Intake | Telegram Trigger, Initialize Telegram Context | Receive a message and safely normalize Telegram fields |
| Command Parsing | Parse Telegram Command, Validate Telegram Command | Parse command syntax/quotes and determine route validity |
| Command Routing | Switch Command Route | Select one of three supported routes or the fallback |
| Outputs | Route NEW, Route STATUS, Route HELP, Route INVALID | Emit a clean, versioned terminal contract |

There is no Execute Workflow node and no Execute Workflow Trigger. All business
transformations use plain JavaScript Code nodes. The Switch node performs only
route selection.

## Workflow Diagram

```text
Telegram Trigger
  ↓
Initialize Telegram Context
  ↓
Parse Telegram Command
  ↓
Validate Telegram Command
  ↓
Switch Command Route
  ├── command.new ─────▶ Route NEW
  ├── command.status ──▶ Route STATUS
  ├── command.help ────▶ Route HELP
  └── fallback ────────▶ Route INVALID
```

## Source Workflows Merged

- `workflows/WF-001/P01/` — Telegram Command Intake
- `workflows/WF-001/P02/` — Command Router

Both original directories remain unchanged. Their README and JSON files are
copied byte-for-byte into `archive/P01` and `archive/P02` for repository-level
rollback and comparison. The consolidated workflow removes the old intermediate
envelope and P02 Workflow Trigger.

## Telegram Credential Setup

The committed JSON intentionally contains no `credentials` object or secret.
After import:

1. Open **Telegram Trigger**.
2. Select an existing Telegram API credential, or create one through n8n's
   credential manager.
3. Do not paste a bot token into a Code node, field expression, README, or export.
4. Save the workflow and test it before publishing.

This deployment-time binding keeps credential values out of Git while retaining
the standard `n8n-nodes-base.telegramTrigger` configuration.

## Supported Commands

| Telegram input | Route | Target |
| --- | --- | --- |
| `/new <values>` | `command.new` | `WF-002` |
| `/status` | `command.status` | `WF-003` |
| `/help` | `command.help` | `WF-004` |
| Unsupported or malformed input | `command.invalid` | Empty |

Commands are normalized to lowercase. A Telegram bot suffix is accepted, so
`/help@NovelStudioBot` is equivalent to `/help`.

## Input Behavior

Telegram Trigger listens only for the `message` update type. Initialize Telegram
Context emits:

- `workflow_id: WF-001`;
- `workflow_version: 2.0`;
- numeric `telegram_update_id`, `telegram_chat_id`, and `telegram_user_id`;
- string `telegram_text`; and
- `received_at` as a UTC ISO 8601 timestamp.

Missing nested Telegram objects or message text use safe zero/empty fallbacks and
do not throw.

## Command Parsing Rules

1. Input must begin with `/` and a command token.
2. The command may contain letters, digits, underscores, or hyphens and is
   lowercased.
3. A bot suffix after `@` is accepted and excluded from `command`.
4. Text following the command becomes trimmed `argument_text`.
5. Whitespace separates values unless enclosed in matching single or double
   quotes.
6. Quoted text stays one `command_args` entry; quote delimiters are removed.
7. Escaped characters inside a quoted value are retained without the escape
   marker.
8. An unclosed quote is malformed: `parse_success` is false and no partial
   `command_args` are emitted.

Example:

```text
/new "被退婚後，我覺醒神級宗門系統" 修仙
```

produces:

```json
{
  "command": "new",
  "argument_text": "\"被退婚後，我覺醒神級宗門系統\" 修仙",
  "command_args": ["被退婚後，我覺醒神級宗門系統", "修仙"],
  "parse_success": true
}
```

## Final Output Contracts

All branches emit only the versioned envelope and context shown below. No
intermediate parsing fields leak into the terminal contract.

### NEW

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
    "telegram_update_id": 0,
    "telegram_chat_id": 0,
    "telegram_user_id": 0,
    "command": "new",
    "argument_text": "",
    "command_args": [],
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

### STATUS and HELP

STATUS uses `route: command.status`, `target: WF-003`, and `command: status`.
HELP uses `route: command.help`, `target: WF-004`, and `command: help`. Both keep
the same ready envelope and context field order as NEW.

### INVALID

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "command.invalid",
  "target": "",
  "status": "invalid",
  "is_valid": false,
  "validation_errors": ["Unsupported command: /unknown"],
  "context": {
    "source_workflow": "WF-001",
    "telegram_update_id": 0,
    "telegram_chat_id": 0,
    "telegram_user_id": 0,
    "command": "unknown",
    "argument_text": "",
    "command_args": [],
    "received_at": "2026-08-01T00:00:00.000Z"
  }
}
```

## Invalid Command Behavior

Non-command text, malformed syntax, unmatched quotes, and unsupported commands
all reach Route INVALID through the Switch fallback. The validator preserves a
human-readable singular `validation_error` internally; Route INVALID exposes it
as the only entry in `validation_errors`. Validation never intentionally throws.

## Import Guide

1. Use n8n 2.29 or later.
2. Import `workflows/WF-001/WF-001_Telegram_Command_Manager_v2.0.json`.
3. Confirm Telegram Trigger and eight downstream functional nodes appear.
4. Bind the Telegram credential manually as described above.
5. Save and execute the required command tests before publishing.

## Publish Instructions

Only one active Telegram Trigger may own a given bot/webhook configuration.
Deactivate the old WF-001 P01 Telegram workflow before activating v2, bind the
credential, publish v2, and send `/help` to verify delivery. Keep P01 and P02
available but inactive during the rollback window. Do not delete the old n8n
workflows.

## Testing

| Input | Expected result |
| --- | --- |
| `/help` | HELP, WF-004, ready, valid, empty `command_args` |
| `/status` | STATUS, WF-003, ready |
| `/new "被退婚後，我覺醒神級宗門系統" 修仙` | NEW, WF-002, two preserved `command_args` entries |
| `/new 我的小說` | NEW with one `command_args` entry |
| `/unknown` | INVALID, empty target, invalid |
| `hello` | INVALID with command-syntax guidance |
| `/help@NovelStudioBot` | Parsed as `help` and routed to HELP |
| `/new "unfinished` | INVALID without an exception |

### Validation Report

Validated on 2026-08-01: JSON parsing, nine-node structure, all connections and
four Switch outputs, seven required command cases plus malformed/missing message
cases, numeric Telegram identifiers, ISO timestamp, quoted-value parsing,
terminal field isolation, archive byte equality, forbidden-node/reference scan,
scope check, and `git diff --check` passed. The container does not include n8n,
so live UI import and manual credential selection remain release-environment
checks.

## Migration from P01 and P02

Old:

```text
WF-001 P01 → Execute Workflow → WF-001 P02
```

New:

```text
WF-001 - Telegram Command Manager v2
```

No internal sub-workflow call is required. Import and test v2, deactivate the old
Telegram Trigger, bind the same credential to v2, update operational references,
and publish v2. Downstream routes and targets remain stable.

## Rollback Instructions

1. Deactivate/unpublish Chapter Manager v2's Telegram Trigger.
2. Reactivate WF-001 P01 with the prior Telegram credential.
3. Restore its P01-to-P02 routing configuration if deployment-specific settings
   were removed.
4. Send `/help` and `/new 我的小說` to verify the restored chain.
5. Use `archive/P01` and `archive/P02` for file comparison or re-import while
   retaining the original directories.

## Known Limitations

- Only `new`, `status`, and `help` are supported.
- Quoting supports matching single or double quotes but not nested quote syntax.
- Telegram captions, edited messages, callback queries, and non-message updates
  are outside v2 scope.
- Numeric fallback `0` denotes a missing Telegram identifier.
- The workflow routes contracts but does not invoke downstream workflows itself.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-08-01 | Consolidated Telegram intake, parsing, validation, and routing. |
