# External resources

## Required

- MongoDB Atlas or local MongoDB (`docker compose up -d`)
- Google Cloud project + OAuth Web client ID (optional if `DEMO_AUTH=true`)
- Deployment: Render, Railway, Fly.io, or similar
- GitHub repository

## Recommended

- Cloudinary / S3 / Supabase Storage for images (MVP default: local `backend/uploads`)
- Map tiles: OpenStreetMap via Leaflet (default, no key)
- AI API provider (optional; mock is default)

## References

- [Google Identity Services — web overview](https://developers.google.com/identity/oauth2/web/guides/overview)
- [MongoDB 2dsphere indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/)
- Camera: `MediaDevices.getUserMedia`
- Location: Geolocation API (permission-dependent)

## Optional later

- Email / SMS / WhatsApp notifications
- Official Mysuru GIS layers
- Error tracking and monitoring
