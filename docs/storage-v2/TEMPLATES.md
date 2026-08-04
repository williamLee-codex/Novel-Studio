# WF-005 Template Engine Specification

## Assets

The version-controlled default template set is:

- `workflows/WF-005/templates/README.md`
- `workflows/WF-005/templates/workspace.json`
- `workflows/WF-005/templates/Repository.json`

Deployment initializes these assets as WF-005's `default` template set. The engine copies a selected template and substitutes `{{path.to.value}}` tokens from storage-owned template context. Missing sets or templates are fatal. Callers cannot supply template bodies.

## Rules

- Generation code must not contain file bodies or construct README, workspace, index, or repository documents.
- Templates are UTF-8, immutable during an execution, and copied before upload.
- Adding a future generated file requires a new template asset and template-set registration; it must not add an inline string builder.
- `Repository.json` uses `{{repository_json}}` for the serialized validated repository.
- `_index.json` is retired in V2.1; `Repository.json` replaces it as the only catalog.
