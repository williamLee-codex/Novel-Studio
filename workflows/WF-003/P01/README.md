# WF-003 / P01 — Novel Workspace Provisioner

## Purpose

WF-003 P01 receives canonical novel metadata from WF-002 P02 and produces a
validated logical workspace contract. It creates manifests as data only; it does
not create physical folders or files.

## Restrictions

- No credentials, API calls, database writes, Drive, Sheets, AI, OpenAI, or LLM.
- No external packages or community nodes.
- Every transformation uses plain JavaScript in an n8n Code node.
- Workspace UUIDs use the existing local `uuidHelper()` implementation rather
  than a built-in cryptographic UUID method.

## Architecture

```text
Workflow Trigger (Execute Workflow Trigger; Accept all data)
→ Validate Metadata (Code)
→ Generate Folder Structure (Code)
→ Generate File Manifest (Code)
→ Generate Workspace Object (Code)
→ Output (Code; validates both fixed manifests)
```

## Input contract

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

For compatibility with the current WF-002 P02 output, `uuid`, `slug`, `title`,
and `genre` are accepted as aliases. Missing `created_by` defaults to
`Novel Studio`.

## Fixed manifests

`folder_manifest` always contains these nine strings in this exact order:

```text
01_Source
02_Chapters
03_Canon
04_Characters
05_World
06_Outline
07_Assets
08_Publish
09_Backup
```

`file_manifest` always contains these nine strings in this exact order:

```text
Novel.json
Metadata.json
README.md
StoryBible.md
CharacterIndex.json
CanonIndex.json
WorldIndex.json
Outline.md
PublishLog.json
```

The **Output** Code node compares both arrays to independent expected constants.
A mismatch changes the output to `workspace.invalid` and prevents downstream
dispatch.

## Output contract

The complete normative contract is in [`OUTPUT_CONTRACT.md`](OUTPUT_CONTRACT.md).
A concrete successful output is stored in
[`examples/output.success.json`](examples/output.success.json).

Successful executions return:

```json
{
  "route": "workspace.created",
  "status": "ready",
  "workspace": {
    "workspace_uuid": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
    "workspace_name": "the-glass-city-workspace",
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "root_folder_name": "Novel",
    "folder_manifest": ["01_Source", "02_Chapters", "...", "09_Backup"],
    "file_manifest": ["Novel.json", "Metadata.json", "...", "PublishLog.json"],
    "workspace_version": "1.0",
    "created_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  },
  "next_workflow": "WF-003-P02",
  "validation_errors": []
}
```

Invalid metadata or a manifest mismatch returns `route: workspace.invalid`,
`status: invalid`, an empty `next_workflow`, and diagnostic
`validation_errors`.

## Import and connection

1. In n8n 2.29 or later, select **Workflows → Import from File**.
2. Import `workflows/WF-003/P01/WF-003_P01_v1.0.json` and save it.
3. No credentials need to be configured.
4. Connect the deployed workflows as follows:

```text
WF-002 P02 - Novel Metadata Builder / Output
↓
Execute Workflow node (pass all data; wait for completion)
↓
WF-003 P01 - Novel Workspace Provisioner / Workflow Trigger
```

## Complete test procedure

1. Create a caller with **Manual Trigger → Edit Fields (Set) → Execute Workflow**.
2. Select **WF-003 P01 - Novel Workspace Provisioner**, pass all data, and wait
   for completion.
3. Paste the input-contract example into Edit Fields and execute the caller.
4. Verify **Validate Metadata** returns `metadata_valid: true` and no errors.
5. Verify **Generate Folder Structure** returns exactly the nine ordered folder
   names documented above.
6. Verify **Generate File Manifest** returns exactly the nine ordered file names.
7. Verify **Generate Workspace Object** contains every required workspace field
   and a UUID v4-shaped value.
8. Verify **Output** matches `examples/output.success.json`, except that the
   generated `workspace_uuid` changes per execution.
9. Execute twice and confirm the two workspace UUID values differ.
10. Change `route` to `command.help`; verify `workspace.invalid`, `invalid`, an
    empty `next_workflow`, and an invalid-route validation message.

The repository validation harness additionally executes all five Code nodes with
both the preferred input and the current WF-002 P02 alias format. Validation
proof is captured in `docs/execution-success.svg`; it is a local JavaScript
contract-test result, not an n8n editor screenshot.

## Known limitations

- The manifests describe future resources and do not create files or folders.
- The local UUID helper uses time and `Math.random()` and is not cryptographically
  secure. It preserves the established helper and avoids external dependencies.
- No collision check is possible without persistence.
- WF-003 P02 is only named in the contract and has not been created.

## n8n compatibility

Designed for n8n 2.29 and later using only Execute Workflow Trigger and Code
nodes. The trigger uses `inputSource: passthrough` (Accept all data).
