# WF-004 P04 - Chapter Persistence Contract (Archive Recovery)

## Archival status

The repository snapshot used for the v2 consolidation contained P01, P02, and
P03 but did not contain a tracked `workflows/WF-004/P04/` directory or files.
This archived recovery records the P04 contract and behavior specified for the
consolidation so that the archive is complete and rollback behavior is explicit.
It does not replace or delete any deployed n8n workflow.

## Purpose

Validate the P03 Chapter Workspace contract and prepare the deferred local
persistence definition for WF-005. This workflow defines operations only and
performs no filesystem or external operation.

## Contract

Successful output uses `route: chapter.persistence.created`, targets `WF-005`,
and carries the chapter, workspace, and persistence objects. The persistence
object uses provider `local`, strategy `deferred`, status `pending`, version
`1.0`, and the eight chapter workspace operation names preserved by v2.

Invalid input returns `status: error`, `is_valid: false`, validation messages,
and null chapter, workspace, and persistence values.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-08-01 | Archive recovery from the approved P04 consolidation specification. |
