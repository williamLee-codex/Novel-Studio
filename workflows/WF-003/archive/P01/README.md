# WF-003 P01 - Novel Workspace Provisioner

## Purpose

This n8n sub-workflow turns validated novel metadata into the logical workspace
contract used by later WF-003 parts. It plans the standard folder and file
manifests only; it does not create folders or files in a storage system.

## Workflow

```text
Workflow Trigger (Accept all data)
  → Validate Metadata
  → Generate Folder Structure
  → Generate File Manifest
  → Generate Workspace Object
  → Output
```

All five transformation nodes are Code nodes containing only JavaScript. The
workflow uses no credentials, APIs, databases, Google services, external
packages, or cryptographic APIs.

## Input

Pass either a `metadata` object or the equivalent fields at the top level:

```json
{
  "metadata": {
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "created_by": "Novel Studio"
  }
}
```

For compatibility with WF-002 P02, `uuid`, `slug`, `title`, and `genre` are
accepted as aliases for their `novel_*` equivalents. `created_by` defaults to
`Novel Studio`. Validation stops execution with a descriptive error when a
required normalized value is empty.

## Output

A successful execution returns exactly this shape (generated values are shown
as empty strings):

```json
{
  "route": "workspace.created",
  "status": "ready",
  "workspace": {
    "workspace_uuid": "",
    "workspace_name": "",
    "novel_uuid": "",
    "novel_slug": "",
    "novel_title": "",
    "novel_genre": "",
    "root_folder_name": "",
    "folder_manifest": [
      "01_Source",
      "02_Chapters",
      "03_Canon",
      "04_Characters",
      "05_World",
      "06_Outline",
      "07_Assets",
      "08_Publish",
      "09_Backup"
    ],
    "file_manifest": [
      "Novel.json",
      "Metadata.json",
      "README.md",
      "StoryBible.md",
      "CharacterIndex.json",
      "CanonIndex.json",
      "WorldIndex.json",
      "Outline.md",
      "PublishLog.json"
    ],
    "workspace_version": "1.0",
    "created_at": "",
    "created_by": ""
  },
  "next_workflow": "WF-003-P02"
}
```

`workspace_uuid` is a locally generated UUID v4-shaped identifier using the
project's `Math.random()` fallback approach and no cryptographic UUID API.
`workspace_name` is `<novel_title> Workspace`, `root_folder_name` is the novel
slug, and `created_at` is the workspace creation time in ISO 8601 format.

## Import and test

1. In n8n 2.29 or newer, select **Workflows → Import from File** and import
   `WF-003_P01_v1.0.json`.
2. Save the imported workflow. No credentials need configuration.
3. Call it from an Execute Workflow node and pass the example input above.
4. Confirm all six nodes execute once and that Output matches the documented
   contract.
5. Run it again and confirm that `workspace_uuid` and `created_at` are newly
   generated.
6. Remove `novel_title` and confirm Validate Metadata stops with a missing-field
   error.

## Compatibility and limitations

- Designed for n8n 2.29+ with the core Execute Workflow Trigger and Code nodes.
- The trigger uses `inputSource: passthrough`, displayed as **Accept all data**.
- The manifests are plans only; physical workspace provisioning belongs to a
  later workflow part.
- The UUID fallback is not cryptographically secure and should not be used as a
  security token.
