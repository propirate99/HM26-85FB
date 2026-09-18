# Database

MongoDB with GeoJSON Points and a `2dsphere` index on issue and report locations.

Collections: User, Zone, IssueCategory, CivicIssue, Report, Evidence, IssueEvent, Notification, SystemConfig.

Indexes on CivicIssue:

- `{ location: "2dsphere" }`
- `{ zoneId: 1, status: 1 }`
- `{ categoryId: 1, status: 1 }`
- `{ deadline: 1, status: 1 }`
- `{ publicId: 1 }` unique

Report unique: `{ citizenId: 1, issueId: 1 }` (sparse when issueId set).

See models in `backend/src/models/`.
