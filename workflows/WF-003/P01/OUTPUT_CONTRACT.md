# WF-003 P01 Output Contract

## Success contract

`Output` returns one item with the following structure when metadata and both
fixed manifests pass validation:

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
    "created_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  },
  "next_workflow": "WF-003-P02",
  "validation_errors": []
}
```

## Field guarantees

| Field | Type | Guarantee |
|---|---|---|
| `route` | string | `workspace.created` for success |
| `status` | string | `ready` for success |
| `workspace.workspace_uuid` | string | UUID v4-shaped value from the local `uuidHelper()` |
| `workspace.workspace_name` | string | `<novel_slug>-workspace` |
| `workspace.novel_*` | string | Canonical values normalized by Validate Metadata |
| `workspace.root_folder_name` | string | Always `Novel` |
| `workspace.folder_manifest` | string[] | Exactly the nine ordered folder names shown above |
| `workspace.file_manifest` | string[] | Exactly the nine ordered file names shown above |
| `workspace.workspace_version` | string | Always `1.0` |
| `workspace.created_at` | string | Validated upstream ISO 8601 timestamp |
| `workspace.created_by` | string | Upstream value, defaulting to `Novel Studio` |
| `next_workflow` | string | Always `WF-003-P02` for success |
| `validation_errors` | string[] | Empty for success |

## Invalid contract

Metadata or manifest validation failure returns `route: workspace.invalid`,
`status: invalid`, `next_workflow: ""`, and one or more messages in
`validation_errors`. The `workspace` field remains present for diagnostics, but
must not be dispatched downstream.
