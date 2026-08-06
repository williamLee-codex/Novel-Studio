# WF-001A — Session Manager

- `WF-001A_Session_Manager_v1.0.json` is the untouched legacy workflow.
- `WF-001A_Session_Manager_v2.0.json` is the current publishable workflow (`wf001a-session-manager-v2`).

Version 2.0 accepts one item with `operation`, numeric Telegram IDs, `novel_uuid`, `chapter_uuid`, and `session_data`. Every route returns `{ ok, operation, session, error }`.
