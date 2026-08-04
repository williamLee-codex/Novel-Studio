# WF-005 — Storage Engine V2

WF-005 is Novel Studio's single Google Drive boundary. It owns storage only: it
contains no novel, chapter, Canon, character, world, timeline, or AI business
logic.

## Creation flow

`/new → WF-002 → WF-005 → Done`

For a valid WF-002 novel-metadata result, the engine:

1. finds or creates `My Drive/小說`;
2. finds or reuses `小說/<Novel Title>`;
3. scans only folders named `vNNN` and creates the next version (`v001` first);
4. creates `01_Source`, `02_Chapters`, `03_Canon`, `04_Characters`, `05_World`,
   `06_Outline`, `07_Assets`, `08_Publish`, and `09_Backup`;
5. writes `README.md` and `workspace.json` in the version folder; and
6. creates or refreshes `小說/_index.json` with the latest workspace reference.

Workspace UUIDs and novel UUIDs remain file/index metadata. They are never Drive
folder names.

## Chapter flow

`/chapter → WF-004 → WF-005 → WF-006`

The chapter route consumes WF-004's persistence operations and the existing V2
storage contract. It writes only to Drive and returns the same storage shape.
It does not generate or reinterpret chapter content.

## Contract

WF-005 returns one contract and no legacy aliases:

```json
{
  "storage": {
    "storage_version": "2.0",
    "project_folder_id": "drive-id",
    "workspace_folder_id": "drive-id",
    "workspace_version": "v001",
    "folder_map": {
      "01_Source": "drive-id",
      "02_Chapters": "drive-id"
    }
  }
}
```

The map contains all nine canonical folders. Removed V1 fields are not emitted.

## Deployment

Import `WF-005_Storage_Manager_v2.0.json`, bind the same Google Drive OAuth2
credential to every Google Drive node, and keep the workflow inactive until the
validation checklist has passed in a disposable Drive account.
