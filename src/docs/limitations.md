# Limitations

- Demo zones are **not** official Mysuru administrative boundaries.
- Camera and GPS depend on browser permissions; denial routes to manual review, not a silent fail.
- GPS and photos of screens can be spoofed; we combine signals and still allow human review.
- AI image/synthetic assessment is probabilistic and optional.
- No WhatsApp/SMS, no native apps, no real government SSO.
- Local disk storage is for demo; use Cloudinary/S3 for a shared deploy.
- Escalation job is an in-process interval (not a durable worker queue).
