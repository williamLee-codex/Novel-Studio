# Storage Engine V2 Validation Checklist

## Static

- [ ] WF-003, WF-005A, and WF-005B exports are absent.
- [ ] WF-000 creation stages are exactly WF-002 then WF-005.
- [ ] WF-002 contains no Google Drive node and targets WF-005.
- [ ] WF-005 is the only new-storage workflow containing Google Drive nodes.
- [ ] WF-005 returns only the `storage` top-level contract.
- [ ] No returned V1 aliases or execution plans are present.

## Live `/new`

- [ ] Run `/new <unique novel title>` successfully.
- [ ] `小說` is found or created under My Drive.
- [ ] `<unique novel title>` is created under `小說`.
- [ ] `v001` is created under the title (not a UUID).
- [ ] All nine canonical folders exist under `v001`.
- [ ] `README.md` and `workspace.json` exist under `v001`.
- [ ] `_index.json` exists under `小說` and references the new `v001`.
- [ ] The response has `storage_version: 2.0` and all nine folder IDs.

## Reuse and sequencing

- [ ] Run `/new <same novel title>` again.
- [ ] The same project folder is reused.
- [ ] `v002` is created without changing `v001`.
- [ ] `_index.json` points to `v002` while retaining the novel entry.
- [ ] No legacy Drive folder is deleted or migrated.

## Chapter regression boundary

- [ ] Run `/chapter` with an existing V2 storage contract.
- [ ] WF-004 business output is unchanged.
- [ ] WF-005 performs the Drive write and returns the V2 storage contract.
- [ ] WF-006 receives the post-storage flow.
