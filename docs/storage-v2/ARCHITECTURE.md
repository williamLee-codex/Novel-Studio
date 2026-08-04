# Storage Engine V2.1 Architecture Freeze

## Boundary

WF-005 is a domain-independent storage service and the only workflow that owns Google Drive behavior. It accepts only `storage_request`, never examines Novel, Chapter, Canon, Story Bible, Character, or Timeline objects, and returns only `storage`. WF-000 maps command results into provider-neutral storage operations; WF-002 and WF-004 retain domain ownership and contain no Drive operations.

```text
/new     → WF-002 → WF-000 boundary mapping → WF-005 → Done
/chapter → WF-004 → WF-000 boundary mapping → WF-005 → WF-006
```

## Repository-first lifecycle

`Repository.json` is the single source of truth. On the first initialization only, WF-005 may search My Drive for `小說`, create it when absent, establish the repository, and seed the template set. Once initialized, the workflow resolves the project, latest workspace version, counts, and folder IDs from the repository. It must not search Drive to calculate a version or rediscover a known folder. A successful mutation updates the repository before returning.

Example: repository `latest_version: v008` produces `v009`.

## Fixed Drive layout

```text
Google Drive/小說/<project name>/vNNN/
├── 01_Source/       ├── 02_Chapters/    ├── 03_Canon/
├── 04_Characters/   ├── 05_World/       ├── 06_Outline/
├── 07_Assets/       ├── 08_Publish/      └── 09_Backup/
```

No alternative workspace layout is valid. `README.md` and `workspace.json` are copied/rendered from the WF-005 template set. `Repository.json` lives under `小說` and is copied from its template.

## Invariants

1. Storage version is `2.1`; workspace names are monotonic `vNNN` values.
2. Repository lookup replaces project and workspace Drive searches after bootstrap.
3. Provider IDs and implementation plans never escape except through the five-field `storage` contract.
4. Template content is maintained in `workflows/WF-005/templates`, not embedded in generation code.
5. Failed operations do not publish a successful response.
