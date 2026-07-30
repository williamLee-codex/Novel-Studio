# WF-001 / P01 — Telegram Command Intake

## Purpose

Part 01 is the entry point for Telegram requests to Novel Studio. It is a small,
independently importable n8n workflow with five nodes:

1. **Telegram Trigger** receives new Telegram messages.
2. **Initialize Variables** normalizes Telegram identifiers, message text, and
   intake metadata.
3. **Parse Telegram Command** extracts a lowercase command and arguments. Quoted
   arguments such as `"working title"` remain a single item.
4. **Validate Command** accepts `/new`, `/status`, and `/help`, then identifies
   the workflow that will eventually handle the command.
5. **Router Output** creates a stable envelope for a downstream router.

Invalid or unsupported messages are not discarded. They leave **Router Output**
with `route` set to `command.invalid`, `is_valid` set to `false`, and a human-readable
`validation_error`.

## Import and connection

1. Download or otherwise make `WF-001_P01_v1.0.json` available to the computer
   running your browser.
2. In n8n 2.29 or later, use this exact navigation path:

   **n8n → Workflows → Import from File → `WF-001_P01_v1.0.json`**

   Select the file from `workflows/WF-001/P01/` when the file picker opens.
   Import this JSON file directly; do not import the containing directory or the
   README.
3. Open **Telegram Trigger** and select a Telegram API credential for the Novel
   Studio bot. The exported workflow deliberately contains no credential or secret.
4. Save and activate the workflow so n8n can register the Telegram webhook.
5. Connect **Router Output** to the first node of a future routing part. Treat its
   fields as the Part 01 interface:
   - `route`: `command.new`, `command.status`, `command.help`, or `command.invalid`
   - `next_workflow`: `WF-002`, `WF-003`, `WF-004`, or an empty string
   - `is_valid` and `validation_error`: validation result
   - `payload`: normalized Telegram context, command, and arguments

The `next_workflow` values are routing contracts only; Part 01 does not create or
invoke those workflows. No Part 02 behavior is included here.

## Test

### Telegram end-to-end test

1. In n8n, open the imported workflow and select **Listen for test event** on
   **Telegram Trigger**.
2. Send `/new "The Glass City" fantasy` to the configured bot.
3. Inspect **Router Output** and verify:
   - `route` is `command.new`;
   - `next_workflow` is `WF-002`;
   - `is_valid` is `true`;
   - `payload.arguments` is `["The Glass City", "fantasy"]`.
4. Repeat with `/help` and `/status`; expect `command.help` and `command.status`.
5. Send `hello` and then `/unknown`; both should produce `command.invalid`, an
   empty `next_workflow`, and a non-empty `validation_error`.

### Test without Telegram

To exercise the processing nodes without registering a webhook, temporarily pin
the following item as the output of **Telegram Trigger**, then execute from
**Initialize Variables**:

```json
{
  "update_id": 1001,
  "message": {
    "text": "/new \"The Glass City\" fantasy",
    "chat": { "id": 2002 },
    "from": { "id": 3003 }
  }
}
```

Remove the pinned data before activating the production workflow.
