# Security

- Backend verifies Google ID tokens; roles and `assignedZoneId` come only from MongoDB User documents.
- Zone officers cannot read another zone’s issue by changing a URL id.
- HTTP-only JWT cookie; CORS limited to `CLIENT_URL`.
- Rate limit citizen report creation.
- Upload size/type whitelist.
- Public API strips names, emails, exact GPS (approximate label only).
- Never commit `.env`, OAuth secrets, or AI keys.

Demo login is **off** unless `DEMO_AUTH=true`.
