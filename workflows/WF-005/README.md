# WF-005 — Storage Engine V2.1

WF-005 is Novel Studio's domain-independent storage boundary and sole owner of Google Drive logic. Its complete public interface is documented in `docs/storage-v2/CONTRACT.md`.

## Workflow

- `initialize_workspace`: bootstrap `小說` and `Repository.json` once, then use repository lookup for projects and the next `vNNN` version.
- `persist_files`: execute provider-neutral directory/file operations against an existing storage contract.
- Create the exact nine-folder workspace layout without exceptions.
- Copy `README.md`, `workspace.json`, and `Repository.json` through the internal Template Engine.
- Return only `{ "storage": { ... } }`.

## Deployment

1. Import `WF-005_Storage_Manager_v2.0.json` (the stable deployment filename contains the V2.1 workflow revision).
2. Bind one Google Drive OAuth2 credential to all Drive nodes.
3. Load `templates/` into the workflow's `default` template set.
4. Initialize once in a disposable Drive and complete `docs/storage-v2/VALIDATION.md` before activation.
