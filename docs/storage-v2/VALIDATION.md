# Storage Engine V2.1 Validation Checklist

## Static architecture

- [ ] WF-005 input has only `storage_request`; output has only `storage`.
- [ ] WF-005 code contains no Novel, Chapter, Canon, Story Bible, Character, or Timeline object inspection.
- [ ] WF-000, WF-002, and WF-004 contain no Google Drive nodes or Drive queries.
- [ ] Only first initialization can execute a Drive search.
- [ ] Project resolution and next `vNNN` use Repository lookup.
- [ ] Repository.json has all six required fields.
- [ ] No code node embeds README, workspace.json, Repository.json, or `_index.json` bodies.
- [ ] All three default template assets exist.
- [ ] Response contains none of `root_folder_id`, `workspace_folder_map`, `folder_id_map`, or `file_plan`.

## Live `/new`

- [ ] Run `/new <unique title>` and observe `小說/<title>/v001`.
- [ ] Verify all nine canonical folders, README.md, workspace.json, and Repository.json.
- [ ] Verify the exact five-field `storage` response with storage version 2.1.
- [ ] Repeat the title and observe the same project folder and a new `v002`.
- [ ] Confirm the second run performs no Drive search and Repository.json points to `v002`.

## Live `/chapter`

- [ ] Run `/chapter` with an existing V2.1 storage contract.
- [ ] Verify WF-004 domain output is unchanged before boundary mapping.
- [ ] Verify WF-005 performs all Drive writes and returns only `storage`.
- [ ] Verify WF-006 receives the post-storage flow.

## Non-migration guarantee

- [ ] Existing workspaces are neither renamed, copied, deleted, nor rewritten.
- [ ] Rollback is routing/configuration only.
