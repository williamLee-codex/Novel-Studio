# WF-000 — Integration Orchestrator v3.0

Wave 1 provides the publishable n8n 2.29.10 workflow skeleton only:

```text
Execute Workflow Trigger
  → Validate Request
  → Switch (Command Route)
  → Return Result
```

`Validate Request` normalizes `command` (or the legacy `route` input alias) and
accepts `new`, `chapter`, `status`, and `help`. Invalid input is routed through
the same result boundary with validation details.

No Session, Storage, or Character layer is included in Wave 1. The workflow
contains no workflow-execution action node; its only workflow trigger is the
current `Execute Workflow Trigger` node.
