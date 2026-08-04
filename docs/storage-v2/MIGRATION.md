# Storage V2 Migration

## Scope

This is a forward-only routing migration. Remove the repository exports for
WF-003, WF-005A, and WF-005B and import WF-005 Storage Engine V2. Update WF-000
so `/new` calls WF-002 and then WF-005 directly. WF-002 remains metadata-only.

## Existing data

Do not delete, rename, copy, or migrate existing Google Drive folders. V1 data
continues to exist unchanged. New `/new` requests create V2 `vNNN` workspaces;
there is no backfill.

## Deployment order

1. Import WF-005 and bind its Google Drive credential.
2. Validate it in a disposable Drive location/account.
3. Import the updated WF-002 and WF-000 exports.
4. Disable the deployed WF-003/WF-005A/WF-005B workflows; retain exported
   deployment backups if operational rollback policy requires them.
5. Run the validation checklist with a new title and then a repeated title.

## Rollback

Stop new requests and restore the prior deployed workflow exports and WF-000
routing. Do not remove any V2 folders created before rollback. Because no data is
migrated or overwritten, rollback is a routing operation rather than a data
conversion.
