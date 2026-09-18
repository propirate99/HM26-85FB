# Testing checklist

- Unauthorized citizen hitting `/api/officer/queue` → 401/403
- North officer fetching a South issue → 403
- Camera permission denial fallback
- GPS denial → `UNAVAILABLE` zone match, review flag
- Wrong zone vs GPS → mismatch flag
- Duplicate nearby attach
- `AI_PROVIDER` failure still accepts report
- Deadline passes → ESCALATED
- Invalid status transition rejected
- File too large / wrong MIME rejected
