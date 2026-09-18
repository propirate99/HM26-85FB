# Verification

Transparent weighted score (max 100). Not a fake/real label.

| Signal | Weight |
| --- | ---: |
| Image appears relevant to selected category | 25 |
| Evidence captured through app flow | 15 |
| GPS exists and acceptable accuracy | 15 |
| Selected zone matches GPS-derived zone | 10 |
| Timestamp exists and is recent | 10 |
| No strong image duplicate | 15 |
| Description/category agreement | 10 |

Bands:

- 80–100 `VERIFIED_WITH_LOW_RISK`
- 60–79 `VERIFIED_BUT_REVIEWABLE`
- 40–59 `NEEDS_REVIEW`
- 0–39 `INSUFFICIENT_OR_SUSPICIOUS`

High synthetic risk sets `requiresManualReview` and does **not** auto-reject.

Engine: `backend/src/services/verification.service.js`.
