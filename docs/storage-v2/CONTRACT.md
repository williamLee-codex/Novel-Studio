# Storage Contract V2.1

## Input

WF-005 reads exactly one top-level field:

```json
{
  "storage_request": {
    "operation": "initialize_workspace",
    "project_key": "opaque-project-key",
    "project_name": "display folder name",
    "template_set": "default"
  }
}
```

`persist_files` uses an existing `storage` value plus provider-neutral `operation_data` containing `directory_name`, `subdirectories`, and `{name, content}` files. Domain objects and domain vocabulary are forbidden at the WF-005 boundary.

## Output

```json
{
  "storage": {
    "storage_version": "2.1",
    "project_folder_id": "drive-id",
    "workspace_folder_id": "drive-id",
    "workspace_version": "v001",
    "folder_map": {}
  }
}
```

The response has no other top-level keys. The legacy `root_folder_id`, `workspace_folder_map`, `folder_id_map`, `file_plan`, repository internals, template context, and provider execution details are forbidden.
