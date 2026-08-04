# Storage Engine V2 Architecture

## Boundary

WF-005 is the sole owner of Google Drive storage behavior. WF-002 produces novel
metadata; WF-004 produces chapter data; WF-006 and later workflows retain their
knowledge responsibilities. Storage must not create or transform domain data.

## Runtime topology

```text
/new     → WF-002 → WF-005 → Done
/chapter → WF-004 → WF-005 → WF-006
```

WF-000 has one Execute Workflow dependency for storage: **WF-005 — Storage
Engine V2**. The creation path no longer invokes a workspace planner, folder
manager, and file writer as separate workflows.

## Drive layout

```text
My Drive/
└── 小說/
    ├── _index.json
    └── <Novel Title>/
        └── vNNN/
            ├── README.md
            ├── workspace.json
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

A project folder is reused by exact novel title. Workspace names use a monotonic
three-digit version and never a UUID. IDs remain metadata in `workspace.json`
and `_index.json`.

## Public contract

The only returned top-level key is `storage`. Its stable V2 fields are
`storage_version`, `project_folder_id`, `workspace_folder_id`,
`workspace_version`, and `folder_map`. Provider execution plans and V1 aliases
are private implementation details and never cross the workflow boundary.
