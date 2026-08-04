# Repository.json Specification

## Authority and location

`小說/Repository.json` is the authoritative storage catalog. A deployment may cache its parsed value in WF-005 workflow static data, but the cache is an implementation detail and must be refreshed whenever the repository is written. Drive search is permitted only to bootstrap an uninitialized repository.

## Required schema

```json
{
  "storage_version": "2.1",
  "workspace_version": "v009",
  "latest_version": "v009",
  "workspace_count": 9,
  "project_folder_id": "drive-project-id",
  "workspace_folder_ids": { "v009": "drive-workspace-id" },
  "projects": {}
}
```

The six named fields are mandatory. `projects` is the lookup table keyed by opaque `project_key`; each entry repeats `project_folder_id`, `workspace_version`, `latest_version`, `workspace_count`, and `workspace_folder_ids`. Folder IDs must be non-empty provider identifiers and version keys must match `^v\d{3}$`.

## Update algorithm

1. Load the repository and locate `projects[project_key]`.
2. Read `latest_version`; never list Drive workspaces.
3. Increment it exactly once and create the corresponding workspace.
4. Add the new folder ID, update both version fields and counts, then write `Repository.json` atomically.
5. Return `storage` only after the repository write succeeds.
