# WF-001A — Session Manager MVP v2

`WF-001A_Session_Manager_MVP.json` is the current n8n 2.29.10 workflow. Its workflow ID is `wf001a-session-manager-mvp`.

The export intentionally does not create an Execute Workflow Trigger. Add its Code and Switch nodes to the existing workflow, where the existing node named `Execute Workflow Trigger` connects to `Validate Input` as recorded in `connections`.

The workflow supports only `save_session` and `read_session`. It stores sessions temporarily in an in-memory `Map`, keyed by `telegram_chat_id`, and its exported node list contains only built-in Code and Switch nodes.

Previous WF-001A exports are retained unchanged in `archive/`.
