# ApiDog Setup (Global Connect Ethiopia)

## Files

- `apidog/global-connect-ethiopia.openapi.json`: Import this into ApiDog.
- `scripts/export_openapi.py`: Re-generate OpenAPI after endpoint changes.

## Export OpenAPI

Run from repository root:

```powershell
python scripts/export_openapi.py
```

## Import Into ApiDog

1. Open ApiDog.
2. Create new project (or open existing team project).
3. Choose Import -> OpenAPI/Swagger -> File.
4. Select `apidog/global-connect-ethiopia.openapi.json`.
5. Confirm base URL as `http://127.0.0.1:8000` (or your dev server URL).
6. Save and share project with teammates.

## Current Endpoint Groups

- Authentication
- Users
- Organizers
- Vendors
- Proposals

All routes are already prefixed under `/api/v1` in the exported spec.

## Recommended Team Workflow

1. Backend updates endpoint/schema.
2. Run `python scripts/export_openapi.py`.
3. Re-import updated file into ApiDog.
4. Review contract changes with frontend team.
