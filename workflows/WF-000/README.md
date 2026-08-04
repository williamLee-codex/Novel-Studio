# WF-000 — Integration Orchestrator

WF-000 preserves the existing command routing and replaces the fragmented novel
storage chain with Storage Engine V2.

## Routes

```text
/new     → WF-002 Novel Manager → WF-005 Storage Engine → Done
/chapter → WF-004 Chapter Manager → WF-005 Storage Engine → WF-006 → … → WF-012
```

The `/new` expected-stage journal is `WF-002`, `WF-005`. Both storage call sites
reference the single `WF-005 - Storage Engine V2` workflow. No WF-003, WF-005A,
or WF-005B execution remains.

WF-000 passes WF-002's novel metadata directly to WF-005 and validates the
returned V2 `storage` object. It records that contract in orchestration context
for downstream storage references without introducing legacy aliases.
