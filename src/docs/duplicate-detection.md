# Duplicate detection

Runs **before** creating a new civic issue.

1. Fast geo candidates with category radius (garbage 100m, streetlight 50m, pothole 75m, drain 75m).
2. Score: distance 0.35 + category 0.20 + text 0.20 + image 0.20 + time 0.05.

Decisions:

- 80–100 strong duplicate (prefer attach)
- 55–79 possible — citizen chooses attach / create / review
- 0–54 create new issue

Never auto-merge on borderline confidence.
