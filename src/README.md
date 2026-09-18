# Mysuru CivicVerify

See it. Verify it. Resolve it.

CivicVerify is a lightweight, evidence-first civic complaint platform for a Mysuru hackathon demo. A citizen submits location-bound evidence. The system checks whether the evidence is **relevant, consistent, duplicate, and trustworthy**, then routes **one verified civic issue** to the responsible officer.

CivicVerify does not publish your personal information. It verifies evidence and tracks resolution.

This is a **72-hour MVP** (browser PWA), not a production government system. Demo zones are **not** official MCC/jurisdiction boundaries.

## Demo promise

> A citizen submits location-bound evidence. CivicVerify checks whether the evidence is relevant, consistent, duplicate, and trustworthy—then routes one verified civic issue to the responsible officer.

Language we use (and do **not** overclaim):

- Verified with low risk
- Likely relevant
- Needs review
- Suspicious evidence
- Insufficient evidence

We do **not** claim a complaint is “real” or that an image is definitely human-created. GPS can be denied or spoofed. AI-generated-image detection is probabilistic.

## Quick start

```bash
# MongoDB (Docker)
docker compose up -d

# Install
npm install

# Copy env (never commit real secrets)
cp .env.example .env
cp .env.example frontend/.env
# Then copy the same backend vars into backend/.env, or export them.

# Seed demo zones, officers, and issues
npm run seed

# Run API + PWA
npm run dev
```

- PWA: http://localhost:5173
- API health: http://localhost:5000/api/health

### Demo accounts (when `DEMO_AUTH=true`)

| Role | Email |
| --- | --- |
| Citizen | `citizen@demo.civicverify` |
| North zone officer | `north.officer@demo.civicverify` |
| South zone officer | `south.officer@demo.civicverify` |
| Main authority | `authority@demo.civicverify` |

Use **Demo login** on the login page. Google login works when `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` are set; the backend verifies the credential and never trusts role/zone from the browser.

## What the MVP includes

- Google (or demo) login for citizens and authorized officers
- Mobile-friendly report stepper: problem → location → camera → review
- In-app camera capture (gallery upload disabled on citizen reports)
- Browser GPS + evidence metadata (coords, timestamp, capture method, evidence ID)
- Multi-signal verification score + duplicate detection
- Citizen **report** vs operational **civic issue**
- Configurable demo zone routing
- Officer queue, status workflow, audit timeline
- Deadlines, escalation job, resolution evidence
- Public issue feed with privacy protection

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + Vite together |
| `npm run build` | Production frontend build |
| `npm run lint` | ESLint frontend + backend |
| `npm run seed` | Demo data |

## Docs

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Database](docs/database.md)
- [Verification](docs/verification.md)
- [Duplicate detection](docs/duplicate-detection.md)
- [Security](docs/security.md)
- [Setup](docs/setup.md)
- [Limitations](docs/limitations.md)
- [Demo flow](docs/demo-flow.md)
- [Testing](docs/testing.md)
- [AI disclosure](ai.md)
- [External resources](resource.md)

## License

Hackathon demo. Not affiliated with Mysuru City Corporation.
