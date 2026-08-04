# WF-000 — Integration Orchestrator

WF-000 preserves the existing command routing and replaces the fragmented novel
storage chain with one execution of the WF-005 Storage Engine.

## Routes

```text
/new     → WF-002 Novel Manager → WF-005 Storage Engine → Done
/chapter → WF-004 Chapter Manager → WF-005 Storage Engine → WF-006 → … → WF-012
```

The novel creation pipeline contains one `Execute Workflow` node for
`WF-005 - Storage Engine V2`. No WF-003, WF-005A, or WF-005B execution remains.

WF-000 passes WF-002's novel metadata directly to WF-005. The
`Validate WF-005 Result` node requires the `storage.completed` route and the
`{ storage_engine_version, storage }` result contract, then records both fields
in orchestration context for downstream storage references.
