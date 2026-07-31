# WF-003 / P01 — Novel Workspace Provisioner

## Purpose

WF-003 P01 receives canonical novel metadata from WF-002 P02 and produces a
logical Novel Studio workspace plan. It generates folder and file manifests; it
does **not** create physical folders or files and does not write to a remote
system.

## Dependencies and restrictions

- Requires the canonical metadata output of **WF-002 P02 / Output**.
- No credentials, APIs, databases, Google Drive, Google Sheets, AI, OpenAI, or
  LLM services are used.
- No external packages are required.
- Every transformation node uses plain JavaScript in an n8n Code node.
- Workspace UUID generation uses the local `uuidHelper()` implementation rather
  than a built-in cryptographic UUID method.

## Architecture

```text
Workflow Trigger (Execute Workflow Trigger; Accept all data)
→ Validate Metadata (Code)
→ Generate Folder Structure (Code)
→ Generate File Manifest (Code)
→ Generate Workspace Object (Code)
→ Output (Code)
```

## Input contract

The preferred canonical contract is:

```json
{
  "route": "novel.metadata.created",
  "metadata": {
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "created_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  }
}
```

For compatibility with the current WF-002 P02 output, the validator also accepts
`uuid`, `slug`, `title`, and `genre` as aliases and normalizes them to the
preferred `novel_*` names. When `created_by` is absent, it defaults to
`Novel Studio`.

## Generated folder structure

```text
Novel/
├── 01_Source/
├── 02_Chapters/
├── 03_Canon/
├── 04_Characters/
├── 05_World/
├── 06_Outline/
├── 07_Assets/
├── 08_Publish/
└── 09_Backup/
```

Each folder manifest entry contains `order`, `path`, and `status: planned`.
The file manifest contains starter definitions for workspace documentation,
source notes, canonical metadata, canon, characters, world-building, outline,
publishing, and backup manifests. These are definitions only—no storage API is
called.

## Output contract

Successful input produces:

```json
{
  "route": "novel.workspace.provisioned",
  "workspace_uuid": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "workspace_name": "the-glass-city-workspace",
  "folder_manifest": [
    { "order": 0, "path": "Novel/", "status": "planned" },
    { "order": 1, "path": "Novel/01_Source/", "status": "planned" }
  ],
  "file_manifest": [
    {
      "path": "Novel/README.md",
      "purpose": "Workspace overview",
      "status": "planned"
    }
  ],
  "status": "ready",
  "next_workflow": "WF-003 P02",
  "validation_errors": []
}
```

The arrays above are abbreviated. The actual output contains all ten folder
entries and nine file entries. Invalid input produces
`route: novel.workspace.invalid`, `status: invalid`, an empty `next_workflow`,
and populated `validation_errors`.

## Import instructions

1. Make `WF-003_P01_v1.0.json` available to the computer running your browser.
2. In n8n 2.29 or later, follow:

   **n8n → Workflows → Import from File → `WF-003_P01_v1.0.json`**

3. Select the file from `workflows/WF-003/P01/` and save the workflow.
4. No credentials need to be configured.

## Connection with WF-002 P02

```text
WF-002 P02 - Novel Metadata Builder
Output
↓
Execute Workflow node
↓
WF-003 P01 - Novel Workspace Provisioner
Workflow Trigger
```

Configure the Execute Workflow node to pass all input data unchanged and wait
for this sub-workflow to complete.

## Complete test procedure

1. Import and save WF-003 P01.
2. Create a temporary caller containing **Manual Trigger → Edit Fields (Set) →
   Execute Workflow**.
3. Configure Execute Workflow to call **WF-003 P01 - Novel Workspace
   Provisioner**, accept all input data, and wait for completion.
4. Put the preferred input-contract example above into the Edit Fields node and
   execute the caller.
5. Inspect every node and confirm that exactly one item flows through the six-node
   chain.
6. At **Validate Metadata**, confirm `metadata_valid: true`, an empty
   `validation_errors`, and populated `canonical_metadata`.
7. At **Generate Folder Structure**, confirm ten folder entries in the required
   order.
8. At **Generate File Manifest**, confirm nine planned file definitions.
9. At **Generate Workspace Object**, confirm a UUID-shaped `workspace_uuid`, the
   name `the-glass-city-workspace`, `status: ready`, and `next_workflow: WF-003
   P02`.
10. At **Output**, verify the complete output contract and confirm that a second
    run generates a different workspace UUID.

### Compatibility test with WF-002 P02

Use this current upstream shape:

```json
{
  "route": "novel.metadata.created",
  "target": "WF-003-P01",
  "status": "ready",
  "metadata": {
    "novel_id": "NS-NOV-000001",
    "uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "slug": "the-glass-city",
    "title": "The Glass City",
    "genre": "fantasy",
    "status": "draft",
    "created_at": "2026-07-31T00:00:00.000Z",
    "updated_at": "2026-07-31T00:00:00.000Z",
    "workflow_version": "WF-002-P02-v1"
  }
}
```

Confirm it produces the same valid workspace output and defaults `created_by` to
`Novel Studio`.

### Invalid-input test

Change `route` to `command.help` and remove `metadata.novel_title`. Confirm that
the workflow does not intentionally throw, `status` is `invalid`,
`next_workflow` is empty, and `validation_errors` contains both invalid-route and
missing-title messages.

## Known limitations

- Manifests describe a future workspace but do not create physical resources.
- The local UUID helper uses timestamp, high-resolution time, and `Math.random()`;
  it is suitable for temporary workspace identifiers but is not a cryptographic
  UUID generator. A centrally managed UUID Helper can replace its implementation
  without changing the output contract.
- File contents, checksums, sizes, and storage identifiers are deferred to later
  Parts.
- `workspace_name` is derived from the canonical novel slug and is not checked
  for collisions.

## n8n compatibility

Designed for n8n 2.29 and later. It uses only the core Execute Workflow Trigger
and Code nodes and requires no credentials, community nodes, or external modules.
