# Architecture

Browser PWA (React + Vite) talks HTTPS/REST to an Express API. Civic services (issue, report, routing, SLA, audit) persist to MongoDB. Verification is a separate service (rules + mock/external AI). Evidence blobs go to local disk or Cloudinary.

```
Citizen PWA ──REST── Express API ── Civic services ── MongoDB
                 │                      ├── Verification (rules + AI)
                 └── Officer/Admin UI   └── Object storage
```

Roles are loaded from the **trusted User record**, never from the client body.

Demo zones are labeled `isDemoData: true` and are not official jurisdiction polygons.

See `images/architecture.svg`.
