# WF-003 P02 - Workspace Persistence Contract

## Purpose

WF-003 P02 accepts the ready workspace produced by WF-003 P01 and converts it
into a storage-neutral persistence contract. It prepares records for later
persistence but does not write files, call an API, or connect to a database.

## Workflow

```text
Workflow Trigger (Accept all data)
  → Validate Workspace Contract
  → Generate Persistence Manifest
  → Generate Persistence Contract
  → Output
```

The workflow is compatible with n8n 2.29+ and uses only the core Execute
Workflow Trigger and Code nodes. Every transformation is pure JavaScript. No
credentials, external packages, APIs, databases, Google Drive, or Google Sheets
are used.

## Input contract

The workflow consumes the successful output of WF-003 P01:

```json
{
  "route": "workspace.created",
  "status": "ready",
  "workspace": {
    "workspace_uuid": "33f74ca8-b512-48ae-b0ac-f71e9c924859",
    "workspace_name": "The Glass City Workspace",
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "novel_slug": "the-glass-city",
    "novel_title": "The Glass City",
    "novel_genre": "fantasy",
    "root_folder_name": "the-glass-city",
    "folder_manifest": ["01_Source", "02_Chapters"],
    "file_manifest": ["Novel.json", "Metadata.json"],
    "workspace_version": "1.0",
    "created_at": "2026-07-31T00:00:00.000Z",
    "created_by": "Novel Studio"
  },
  "next_workflow": "WF-003-P02"
}
```

Validation requires the `workspace.created` route, `ready` status, all workspace
identity and audit fields, and non-empty folder and file manifests. Invalid
input stops at **Validate Workspace Contract** with a combined error message.

## Output contract

```json
{
  "route": "workspace.persistence.prepared",
  "status": "ready",
  "persistence": {
    "persistence_key": "workspace:33f74ca8-b512-48ae-b0ac-f71e9c924859",
    "workspace_uuid": "33f74ca8-b512-48ae-b0ac-f71e9c924859",
    "novel_uuid": "6fc48e62-f59d-4c46-93a2-1807c3cd07c2",
    "root_folder_name": "the-glass-city",
    "workspace_version": "1.0",
    "persistence_version": "1.0",
    "persistence_mode": "contract_only",
    "persistence_status": "prepared",
    "record_count": 4,
    "manifest": [
      {
        "record_type": "folder",
        "sequence": 1,
        "name": "01_Source",
        "parent": "the-glass-city"
      },
      {
        "record_type": "file",
        "sequence": 1,
        "name": "Novel.json",
        "parent": "the-glass-city"
      }
    ],
    "prepared_at": "2026-07-31T00:00:01.000Z",
    "prepared_by": "Novel Studio"
  },
  "next_workflow": "WF-003-P03"
}
```

The example manifest is abbreviated. The workflow creates one persistence
record for every folder and file supplied in the workspace contract.

## Import and test

1. In n8n 2.29 or newer, choose **Workflows → Import from File** and import
   `WF-003_P02_v1.0.json`.
2. Save the workflow; there are no credentials to configure.
3. Invoke it from WF-003 P01 or a temporary Execute Workflow node with the input
   contract above.
4. Confirm that the output is `ready`, that `record_count` equals the combined
   number of folders and files, and that the persistence key contains the
   workspace UUID.
5. Remove `workspace_uuid` and confirm validation stops execution.

## Limitations

- `contract_only` explicitly means that this part performs no physical writes.
- Manifest records describe immediate children of the workspace root; later
  workflow parts can add provider-specific paths and identifiers.
- The timestamp is generated at contract preparation time in ISO 8601 format.
