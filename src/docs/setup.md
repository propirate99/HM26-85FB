# Setup

Prerequisites: Node 20+, npm 10+, Docker (or MongoDB URI).

```bash
docker compose up -d
cp .env.example .env
# backend reads process env; from repo root you can:
export $(grep -v '^#' .env | xargs)
npm install
npm run seed
npm run dev
```

Frontend Vite loads `frontend/.env` (`VITE_*`). Copy those lines from `.env.example`.

Google Cloud: create an OAuth **Web** client, add `http://localhost:5173` to authorized JavaScript origins, set both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`.

Verify:

```bash
npm run build
npm run lint
curl http://localhost:5000/api/health
```
