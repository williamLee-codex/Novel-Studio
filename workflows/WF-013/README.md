# WF-013 — Chapter Context Assembly v1.0

## Status and safety

WF-013 is a new, inactive (not published) read-only sub-workflow. It is not connected to WF-000 or any other workflow. It reads seven scoped Drive knowledge files and five Sheets tabs, deterministically filters and normalizes them, and returns one canonical context. It has no write, folder creation, AI, Telegram, session, or execute-next-workflow node.

## Complete node list and connection order

The workflow is one safety-oriented linear chain (the download immediately following each exact-name search is parsed before the next source):

1. When Executed by Another Workflow
2. Validate Context Input (Code)
3. Resolve Knowledge Folders (Drive search)
4. Index Knowledge Folders (Code)
5. Find StoryBible JSON → Read StoryBible JSON → Parse StoryBible JSON
6. Find Canon JSON → Read Canon JSON → Parse Canon JSON
7. Find Characters JSON → Read Characters JSON → Parse Characters JSON
8. Find World JSON → Read World JSON → Parse World JSON
9. Find Timeline JSON → Read Timeline JSON → Parse Timeline JSON
10. Find Conflicts JSON → Read Conflicts JSON → Parse Conflicts JSON
11. Find KnowledgeIndex JSON → Read KnowledgeIndex JSON → Parse KnowledgeIndex JSON
12. Read Chapter Database → Collect Chapter Database
13. Read Story Progress → Collect Story Progress
14. Read Foreshadowing Database → Collect Foreshadowing Database
15. Read Foreshadowing History → Collect Foreshadowing History
16. Read Chapter Plan → Collect Chapter Plan
17. Build Chapter Context (Code)
18. Return Chapter Context (Code)

Every arrow above is the exported `main[0]` connection; there are no hidden branches or outbound workflow calls.

## Code nodes

The exported JSON is the authoritative, importable source and contains the **complete JavaScript** in each node's `parameters.jsCode`. The Code nodes are:

- `Validate Context Input`: strict schema, route, identifiers, positive chapter number, padded chapter ID, workspace folder ID, and workspace version validation; core errors throw.
- `Index Knowledge Folders`: indexes only the three direct child folder results.
- Seven `Parse … JSON` nodes: preserve the accumulated state, use n8n's binary buffer helper, safely parse JSON, and record found/valid state without guessing or repairing data.
- Five `Collect …` nodes: turn zero-row/error outputs into empty arrays while preserving the state.
- `Build Chapter Context`: deterministic assembly, safe Sheet JSON parsing, relevance matching, foreshadow classification, limited history, planning memory, warnings, missing sources, and counts.
- `Return Chapter Context`: returns the canonical object unchanged.

## Google Drive node settings

All Drive nodes use the existing `Google Drive account` OAuth2 credential (`m8Ze5QDWBQQ0zNjj`). `Resolve Knowledge Folders` performs `fileFolder/search`, query method, return-all, always-output, and asks only for the direct children of the validated workspace ID named `03_Canon`, `04_Characters`, or `05_World` (folder MIME type, not trashed).

Each `Find … JSON` performs `fileFolder/search`, query method, exact filename, `limit: 1`, `returnAll: false`, always-output, non-folder MIME type, not trashed, and—critically—`'<resolved_subfolder_id>' in parents`. StoryBible, Canon, Timeline, Conflicts, and KnowledgeIndex are limited to resolved `03_Canon`; Characters to `04_Characters`; World to `05_World`. No query searches Drive root or omits a parent clause.

Each `Read … JSON` performs only `file/download` by the ID from its matching find node. It has always-output and continue-regular-output error handling so a missing file becomes metadata instead of stopping assembly. No Markdown, manifest, or backup path is queried.

## Google Sheets node settings

All five nodes use `googleSheets/read`, document name `御策小說發布中心 v1.0`, their exact tab name, and a server-side `novel_id` lookup value from validated input. They use the existing `Google Sheets account` credential selected through `GOOGLE_SHEETS_CREDENTIAL_ID`, enable always-output, and continue regular output on a read error. Tabs are `Chapter Database`, `Story Progress`, `Foreshadowing Database`, `Foreshadowing History`, and `Chapter Plan`; there is no `Story Bible` Sheet node.

## Zero rows and missing/invalid sources

Always Output Data plus the five collector nodes converts no Sheet rows to `[]`. Empty Story Progress produces its legal empty object/arrays; empty Foreshadowing and History produce five empty arrays; empty Chapter Plan produces null previous plan/actual/delta and an empty preview. Empty optional tabs are also listed in `context_meta.missing_sources`.

Each absent knowledge file is listed in `missing_sources`. StoryBible/Canon absence or invalid JSON gets `severity: high`; other knowledge sources get `severity: warning`. Invalid JSON is never repaired and its typed empty value is used. KnowledgeIndex is copied only to `knowledge_health`; it never participates in entity selection.

## Output contract

`Build Chapter Context` returns exactly one item with top-level `ok`, `schema_version`, `operation`, `chapter_context`, `recent_story`, `canon_context`, `story_progress`, `foreshadowing_context`, `planning_memory`, and `context_meta`. Their shapes and empty defaults match the requested v1.0 contract. `short_horizon_preview` entries are explicitly marked `is_canon: false`; previous actual is sourced only from a completed chapter or Story Progress, never from the prior plan.

## Tests A–H

Run `node tests/test_wf013.js`. The fixture suite covers normal chapter 184 intake, empty Story Progress, empty Foreshadowing/History, empty Chapter Plan, KnowledgeIndex metadata-only behavior, missing Characters warning, missing StoryBible high warning, and rejection of a blank workspace ID. It also asserts inactive export and the read-only operation allowlist.

## Unresolved issues

- The repository does not contain the Google Sheets spreadsheet ID or a stable credential ID. The export therefore resolves the document by its exact name and uses `GOOGLE_SHEETS_CREDENTIAL_ID`; an operator must ensure that environment variable points to the existing Sheets credential after import.
- Existing Chapter Database and Chapter Plan row schemas are not documented in this repository. WF-013 preserves rows and supports the explicitly named/common summary, event, and preview fields without altering another workflow. If production column names differ, map them only after contract confirmation.
- n8n publication requires an authenticated live n8n instance, which is not represented in the repository. This export is intentionally `active: false` and has **not** been published.

## Import and acceptance

Import `WF-013_Chapter_Context_Assembly_v1.0.json`, bind/verify the existing Sheets credential if required, keep the workflow disconnected, and execute Tests A–H in an isolated manual harness before publishing. No existing workflow file was modified.
