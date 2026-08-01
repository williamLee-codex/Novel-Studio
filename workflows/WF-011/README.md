# WF-011 - Knowledge Persistence Manager v2

## Purpose

WF-011 receives the canonical `story_bible.created` result from WF-010, validates it, produces ten deterministic persistence files, writes those files to the existing Novel Studio Google Drive workspace, verifies the nine required files, and emits one `knowledge.persistence.completed` contract.

The workflow preserves JSON knowledge objects without rewriting or inventing facts. `StoryBible.md` is a deterministic projection of the existing structured fields, not an AI summary.

## Architecture

This is one consolidated n8n workflow with 24 functional nodes and four Sticky Notes:

1. **Intake and validation** — validates the WF-010 route and Story Bible shape.
2. **Planning** — validates the workspace root, creates the exact file manifest, renders content, and validates the Drive queue.
3. **Google Drive execution** — resolves folder references, creates missing knowledge folders, searches each exact file name, and chooses create or update using reusable item processing.
4. **Verification and output** — collects every result, applies required/optional rules, calculates counts, and emits the public contract.

Only official n8n Google Drive nodes perform external work. Code nodes use plain JavaScript. No credential object, folder ID, access token, client secret, or provider secret is stored in the export.

## Workflow diagram

```text
Workflow Trigger
  -> Validate Story Bible Route
  -> Extract Story Bible Context
  -> Validate Story Bible Object
  -> Resolve Knowledge Root Folder
  -> Build Knowledge File Manifest
  -> Build File Content Payloads
  -> Build Google Drive Execution Queue
  -> Validate Execution Queue
  -> Resolve Existing Workspace Folder
  -> Prepare/expand folder operations
  -> Google Drive: Resolve or Create Knowledge Folders
  -> Collect Folder Results
  -> Prepare File Queue
  -> Google Drive: Search Exact File
  -> Route Create or Update
       -> Update Existing Knowledge File --+
       -> Create Knowledge File ----------+-> Collect Execution Results
  -> Verify Required Files
  -> Calculate Persistence Summary
  -> Build Final Output
```

## Input contract from WF-010

The repository WF-010 output is the source of truth:

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "story_bible.created",
  "target": "WF-011",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "story_bible": {
    "story_bible_uuid": "BIB-example",
    "novel_uuid": "NOV-example",
    "workspace_uuid": "WS-example",
    "story_bible_version": "1.0",
    "sections": {
      "overview": {},
      "canon": {},
      "characters": [],
      "world": [],
      "timeline": [],
      "conflicts": {
        "character_conflicts": [],
        "world_conflicts": [],
        "timeline_conflicts": []
      }
    },
    "index": {},
    "summary": {},
    "created_at": "",
    "updated_at": "",
    "created_by": "Novel Studio WF-010"
  },
  "invalid_knowledge_records": [],
  "context": {
    "canon_uuid": "",
    "novel_uuid": "NOV-example",
    "workspace_uuid": "WS-example",
    "chapter_uuid": "CH-example",
    "chapter_number": 1,
    "chapter_title": "第一章"
  },
  "existing_root_folder_id": "runtime-drive-folder-id",
  "workspace_folder_map": {}
}
```

`existing_root_folder_id` and the optional `workspace_folder_map` are runtime persistence inputs rather than fields created by WF-010. The caller must add them without modifying the Story Bible. All other fields match the latest WF-010 contract.

## Validation

Route validation requires schema `1.0`, route `story_bible.created`, ready/valid status, a Story Bible object with non-empty Story Bible, novel, and workspace UUIDs, sections, and context. Object validation additionally requires overview, canon, and conflicts objects; character, world, and timeline arrays; index and summary objects; and an invalid-record array.

Validation never intentionally throws. Missing `existing_root_folder_id` rejects execution before Drive writes and records a human-readable error.

## Required folder structure

WF-011 uses the existing novel root and never creates another novel root:

```text
<existing workspace root>/
├── 03_Canon/
│   └── Knowledge/
├── 04_Characters/
├── 05_World/
├── 06_Outline/
└── 09_Backup/
```

The workflow resolves folder IDs from `workspace_folder_map` when supplied and prepares missing folder operations beneath `existing_root_folder_id`. A required parent that cannot be resolved is reported as a failed operation; it is never silently replaced with the Drive root.

## `existing_root_folder_id` setup

Pass `existing_root_folder_id` as a top-level input string. It must be the Drive folder ID of the existing novel workspace, not a folder URL and not the global “My Drive” identifier. The workflow also accepts it from `context.existing_root_folder_id` for orchestrator compatibility.

An optional map can avoid repeated folder resolution:

```json
{
  "workspace_folder_map": {
    "03_Canon": "drive-id",
    "03_Canon/Knowledge": "drive-id",
    "04_Characters": "drive-id",
    "05_World": "drive-id",
    "06_Outline": "drive-id",
    "09_Backup": "drive-id"
  }
}
```

Do not commit real folder IDs into the workflow export or README.

## Required files and placement

| Required | Relative path | Content type |
|---|---|---|
| Yes | `03_Canon/Knowledge/StoryBible.json` | `application/json` |
| Yes | `03_Canon/Knowledge/StoryBible.md` | `text/markdown` |
| Yes | `03_Canon/Knowledge/Canon.json` | `application/json` |
| Yes | `04_Characters/Characters.json` | `application/json` |
| Yes | `05_World/World.json` | `application/json` |
| Yes | `03_Canon/Knowledge/Timeline.json` | `application/json` |
| Yes | `03_Canon/Knowledge/Conflicts.json` | `application/json` |
| Yes | `03_Canon/Knowledge/KnowledgeIndex.json` | `application/json` |
| Yes | `03_Canon/Knowledge/KnowledgePersistenceManifest.json` | `application/json` |
| No | `09_Backup/StoryBible.backup.json` | `application/json` |

The manifest always contains exactly nine required operations and one optional backup operation. Every operation uses `create_or_update_file`, `replace_existing`, a positive stable sequence, and `pending` initial status.

## JSON content rules

- `StoryBible.json`: the complete Story Bible, formatted with two-space indentation.
- `Canon.json`, `Characters.json`, `World.json`, `Timeline.json`, and `Conflicts.json`: their corresponding Story Bible sections, unchanged and formatted with two-space indentation.
- `KnowledgeIndex.json`: Story Bible/novel/workspace IDs, index, summary, invalid records, and update timestamp.
- `KnowledgePersistenceManifest.json`: persistence ID, knowledge IDs, `google_drive` provider, folder reference, sanitized file manifest, timestamps, and workflow version `2.0`.
- `StoryBible.backup.json`: identical content to `StoryBible.json`.

Timeline JSON is deterministically ordered by chapter number, event order, then event name, matching the Story Bible rendering contract. No knowledge fields are summarized or inferred.

## `StoryBible.md` generation rules

The Markdown contains fixed Overview, Canon, Characters, World, Timeline, and Conflicts headings. It:

- prints existing overview identifiers and latest chapter fields;
- renders canon and conflicts as JSON fenced blocks;
- prints only supplied character name, identity, realm, first appearance, and alive status;
- groups supplied world records by `world_type` and prints existing name, region, leader, and status;
- orders timeline entries by chapter, event order, and event name;
- writes `本節目前無資料。` for an empty section.

It does not call AI, rewrite prose, resolve conflicts, or invent placeholder facts.

## File operation schema

```json
{
  "operation_id": "KNOWLEDGE-FILE-001",
  "operation_type": "create_or_update_file",
  "file_name": "StoryBible.json",
  "relative_path": "03_Canon/Knowledge/StoryBible.json",
  "parent_folder_reference": "03_Canon/Knowledge",
  "content_type": "application/json",
  "content": "{}",
  "required": true,
  "overwrite_strategy": "replace_existing",
  "sequence": 1,
  "status": "pending"
}
```

Queue IDs, operation IDs, relative paths, and sequences must be unique. Required operations need a non-empty file name and parent reference. Only JSON and Markdown MIME types are accepted.

## Google Drive credential setup

After import, manually select an existing Google Drive OAuth2 credential on every Google Drive node. The committed export intentionally has no `credentials` property. Grant only the Drive permissions required to search, create folders, upload files, and update existing files in the configured workspace.

Never paste OAuth tokens, client secrets, or credential IDs into Code nodes, expressions, input contracts, or error messages.

## Create-or-update behavior

For each queue item, WF-011 searches by exact file name and exact parent folder. A matching file is updated/replaced; otherwise a new file is uploaded. The queue pattern reuses search, create, and update nodes rather than defining a provider node for every manifest entry. Drive nodes continue through their regular output on error so verification can report failures.

Duplicate-name behavior is deliberately limited to exact name within the resolved folder. Folder resolution failures never fall back to an arbitrary root.

## Verification rules

- All nine required files successful: `persistence_status: completed`, `status: ready`, `is_valid: true`.
- Any required file failed or absent: `partial_failure`, error, and invalid.
- Route, object, queue, or root validation failure: `rejected` and no arbitrary writes.
- Optional backup failure alone: the required persistence result remains completed, while the backup failure remains in `files` and summary counts.

The summary reports total, required, optional, successful, failed, skipped, successful-required, and failed-required file counts.

## Final output contract

```json
{
  "schema_version": "1.0",
  "workflow_version": "2.0",
  "route": "knowledge.persistence.completed",
  "target": "WF-012",
  "status": "ready",
  "is_valid": true,
  "validation_errors": [],
  "persistence": {
    "persistence_id": "KPS-xxxxxxxx",
    "provider": "google_drive",
    "persistence_status": "completed",
    "story_bible_uuid": "",
    "novel_uuid": "",
    "workspace_uuid": "",
    "existing_root_folder_id": "",
    "knowledge_root_folder_id": "",
    "knowledge_root_folder_url": "",
    "executed_at": ""
  },
  "summary": {
    "total_files": 10,
    "required_files": 9,
    "optional_files": 1,
    "successful_files": 10,
    "failed_files": 0,
    "skipped_files": 0,
    "successful_required_files": 9,
    "failed_required_files": 0
  },
  "files": [],
  "context": {}
}
```

Failures retain the persistence metadata, summary, and operation results, but use `status: error`, `is_valid: false`, and `rejected` or `partial_failure`. Invalid outputs expose an empty public context.

## Error handling

Drive credential, permission, quota, missing-parent, search, upload, and update failures are converted to concise file results. Each result contains operation ID, name, path, status, resource ID/URL when available, error message, and ISO execution timestamp. Independent items continue where safe. OAuth tokens and credential internals are never returned.

## Import guide

1. Import `WF-011_Knowledge_Persistence_Manager_v2.0.json` into n8n 2.29 or newer.
2. Confirm the workflow name and its single passthrough Execute Workflow Trigger.
3. Select a Google Drive OAuth2 credential on each official Drive node.
4. Supply a non-production test workspace ID and folder map.
5. Execute the test matrix below before publishing.

## Publish instructions

Connect the successful WF-010 output to WF-011, augment it with runtime folder configuration, save, test, and publish. Route `knowledge.persistence.completed` to WF-012 only after verifying the deployment credential and Drive permissions. Retain the previous published version until create/update and rollback behavior has been tested.

## Testing

1. Populated Story Bible: nine required files and the backup succeed; status completed.
2. Empty knowledge sections: all files are still generated and empty sections remain empty.
3. Missing root ID: rejected without Drive placement.
4. One required failure: remaining operations continue and result is partial failure.
5. Backup-only failure: ready status with recorded optional failure.
6. Existing exact-name files: update without same-folder duplicates.
7. Missing credential: captured errors, no unhandled Code-node error.
8. Permission denial: file failures and required counts agree.
9. Invalid route: rejected.
10. n8n 2.29+ import: supported nodes, one trigger, selectable credentials, no embedded secret, and no crypto error.

## Known limitations

- No persistent folder mapping database.
- `existing_root_folder_id` may be required and is required by this export unless provided in context.
- No binary assets.
- No Google Sheets.
- No historical version database.
- Existing file search is limited to exact file name and folder.
- Concurrent writes are not locked.
- Markdown is deterministic and not AI-generated.
- Google Drive API quota and permission limits apply.

## Version history

| Version | Date | Changes |
|---|---|---|
| 2.0 | 2026-08-01 | Initial consolidated Knowledge Persistence Manager with deterministic files, reusable Drive queue processing, required-file verification, and stable WF-012 output. |

## Validation report

The export is JSON-parseable and designed for n8n 2.29+. Static validation covers functional node count, one passthrough trigger, official Google Drive node usage, connection targets, unique manifests/queues, plain-JavaScript syntax, prohibited integrations, absence of credentials and hardcoded folder IDs, and repository scope. Live create/update behavior, credential errors, and permission errors remain deployment-environment tests because this repository container has no n8n runtime or Google Drive OAuth credential.
