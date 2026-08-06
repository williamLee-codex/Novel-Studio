# WF-001A — Session Manager MVP

`WF-001A_Session_Manager_MVP.json` is the current n8n 2.29.10 workflow. Its workflow ID is `wf001a-session-manager-mvp`.

The workflow supports only `save_session` and `read_session`. It stores sessions temporarily in an in-memory `Map`, keyed by `telegram_chat_id`, and uses only built-in Execute Workflow Trigger, Code, and Switch nodes.

Previous WF-001A exports are retained unchanged in `archive/`.
