# WF-000 — Integration Orchestrator v3.0

Wave 2 implements only the `new` novel entry flow for n8n 2.29.10:

```text
Execute Workflow Trigger
  → Validate New Command
  → Read Session (WF-001A)
  → Session Not Found?
      true  → Create Session → Save Session (WF-001A) → Return
      false → Return
```

The workflow accepts `new` (or `/new`) and a finite numeric
`telegram_chat_id`. `Read Session` and `Save Session` call the existing
`wf001a-session-manager-mvp` workflow synchronously. When no session exists,
the orchestrator creates this initial session:

```json
{
  "state": "awaiting_novel_name",
  "novel_uuid": "",
  "chapter_uuid": "",
  "data": {}
}
```

Both the existing-session and newly-created-session paths return:

```json
{
  "telegram_message": "請輸入小說名稱："
}
```

Chapter, Character, StoryBible, Knowledge, World, and Publish flows are not
included in Wave 2.
