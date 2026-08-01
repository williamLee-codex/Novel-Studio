# WF-001 / P02 — Command Router

## Purpose

Part 02 receives the routing envelope emitted by **WF-001 P01 / Router Output**
and dispatches it to one of four command-specific outputs. It performs routing
only. It contains no business logic, database access, OpenAI integration,
Telegram node, reply behavior, credentials, or secrets.

## Architecture

This independently importable workflow contains six nodes:

```text
Workflow Trigger (Execute Workflow Trigger)
└── Switch: {{$json.route}}
    ├── command.new     → Route NEW
    ├── command.status  → Route STATUS
    ├── command.help    → Route HELP
    └── command.invalid → Route INVALID
```

Each branch ends at its own **Set** node. Part 02 does not execute a downstream
workflow.

## Import steps

1. Make `WF-001_P02_v1.0.json` available to the computer running your browser.
2. In n8n 2.29 or later, follow:

   **n8n → Workflows → Import from File → `WF-001_P02_v1.0.json`**

3. Select the file from `workflows/WF-001/P02/` and save the imported workflow.
4. Leave the workflow inactive until its caller is configured. No credentials
   need to be selected.

## Connection with P01

P01 and P02 remain independently importable. To connect them in n8n, add an
**Execute Sub-workflow** node after **Router Output** in the deployed copy of P01,
select **WF-001 P02 - Command Router**, pass the input data through unchanged,
and wait for the sub-workflow to finish. Do not copy P02 nodes into P01.

This repository deliverable does not modify P01 and does not add the caller node
for you. The first node of P02 is **Workflow Trigger**, an **Execute Workflow
Trigger**, so it receives the item passed by the caller.

## Expected input

P02 expects exactly one P01 routing envelope per item:

```json
{
  "route": "command.new",
  "next_workflow": "WF-002",
  "is_valid": true,
  "validation_error": "",
  "payload": {
    "workflow_id": "WF-001",
    "source_part": "P01",
    "command": "new",
    "arguments": ["The Glass City"]
  }
}
```

The Switch reads only `route`. Each terminal Set node forwards `payload` without
changing its contents.

## Expected output

Valid branches produce the following shape:

```json
{
  "route": "command.new",
  "target": "WF-002",
  "status": "ready",
  "payload": {}
}
```

The target is `WF-002` for `command.new`, `WF-003` for `command.status`, and
`WF-004` for `command.help`. The invalid branch produces:

```json
{
  "route": "command.invalid",
  "target": "",
  "status": "invalid",
  "validation_error": "Unsupported command: /unknown",
  "payload": {}
}
```

In both examples, `{}` represents the original input `payload`, not a newly
created empty object.

## Testing steps

Because **Execute Workflow Trigger** must be called by another workflow, create a
temporary test workflow containing a **Manual Trigger**, an **Edit Fields (Set)**
node, and an **Execute Sub-workflow** node targeting P02. Configure the caller to
pass all input fields, paste one mock item below into the Set node, execute the
caller, and inspect the corresponding terminal node in P02.

### Mock: `command.new`

```json
{
  "route": "command.new",
  "next_workflow": "WF-002",
  "is_valid": true,
  "validation_error": "",
  "payload": { "command": "new", "arguments": ["The Glass City"] }
}
```

Verify that only **Route NEW** runs and returns `target: "WF-002"` and
`status: "ready"`.

### Mock: `command.status`

```json
{
  "route": "command.status",
  "next_workflow": "WF-003",
  "is_valid": true,
  "validation_error": "",
  "payload": { "command": "status", "arguments": [] }
}
```

Verify that only **Route STATUS** runs and returns `target: "WF-003"` and
`status: "ready"`.

### Mock: `command.help`

```json
{
  "route": "command.help",
  "next_workflow": "WF-004",
  "is_valid": true,
  "validation_error": "",
  "payload": { "command": "help", "arguments": [] }
}
```

Verify that only **Route HELP** runs and returns `target: "WF-004"` and
`status: "ready"`.

### Mock: `command.invalid`

```json
{
  "route": "command.invalid",
  "next_workflow": "",
  "is_valid": false,
  "validation_error": "Unsupported command: /unknown",
  "payload": { "command": "unknown", "arguments": [] }
}
```

Verify that only **Route INVALID** runs and returns an empty `target`,
`status: "invalid"`, and the original `validation_error`.

## Known limitations

- Only the four exact, case-sensitive route strings documented above are
  handled. An item with a missing or different `route` does not match an output.
- P02 trusts P01's validation and payload shape; it does not revalidate or modify
  business data.
- Terminal nodes describe future targets but do not invoke WF-002, WF-003, or
  WF-004.
- Outputs remain on separate branches and are not merged into a common terminal
  node.
