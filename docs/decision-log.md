# Decision Log (25% of Total Score)

**Team:** CivicVerify (`HM26-85FB`) | **Sub-problem:** Verification & Routing | **Date:** 20 Sept 2026

## Q1. What approach did we take, and what did we reject?

**Our approach:** Trust score = A weighted 7-signal composite blending location-bound camera capture, hardware GPS accuracy (≤25m), spatial duplicate proximity, and Gemini vision triage, routing scores <40 to rejection, 40–70 to zonal review, and >70 to priority dispatch.

Citizens capture incidents strictly through an in-app live camera with tamper-resistant GPS coordinates, horizontal accuracy, and device timestamps. Our backend executes a two-stage deduplication filter (50m spatial radius and Levenshtein title matching), pairs it with a Gemini vision model to verify category and hazard severity, and factors in reporter trust reputation. Low-confidence submissions or boundary discrepancies automatically route to the ward sanitary inspector's review queue rather than being dropped.

**Alternative we considered and rejected:** Mandatory OTP phone authentication and Aadhaar e-KYC before submitting any complaint.

This seemed attractive initially because it guaranteed identity accountability, eliminated automated bot spam, and provided clean audit trails for municipal ward officers.

## Q2. Why did we reject it? The trade-off

| Dimension | Our approach (Evidence Scoring) | Rejected alternative (Mandatory OTP / KYC) |
|---|---|---|
| **Citizen Adoption** | Instant filing in <30s without account hurdles | High drop-off (>60%) from SMS latency & privacy fears |
| **Offline / 4G Reliability** | Local queue stores evidence; syncs when online | Fails in low-connectivity ward edges without SMS |
| **Build Effort in 72h** | Focused on spatial indexing, vision, & RBAC | Heavy SMS gateway integration & fallback handling |
| **Spam / Sybil Resistance** | Sensor proofs (live camera + GPS + dedup radius) | Strong cryptographic identity verification |

Reporting friction and offline reliability at the MCC–panchayat boundary decided our choice; requiring phone verification locks out daily-wage workers, migrants, and citizens in low-signal pockets. The cost we knowingly accepted is that bad actors with real phones can submit false reports that land in our 40–70 human-review band, consuming officer triage bandwidth.

## Q3. What breaks at the scale of all of Mysuru?

Mysuru comprises 65 municipal wards and surrounding peri-urban gram panchayats, generating 600+ tonnes of solid waste daily, surging to 800+ TPD with 3,500+ daily grievances during the 10-day Dasara festival.

| What breaks first | Why (with a rough number) | How we'd fix it |
|---|---|---|
| **Spatial Duplicate Check** | Checking 15,000+ open Dasara items via O(N) distance loops degrades insert throughput (>2.4s) | Migrate to MongoDB 2dsphere index with geohash-7 cell bucketing (<50m bounds) |
| **Zonal Review Queue** | 3,500 reports/day floods 7 zonal officers with ~700 manual audits/day | Auto-cluster contiguous micro-hotspots so officers verify an entire block at once |
| **Vision Model Latency** | Burst uploads of 5MB camera photos saturate vision API rate limits | Client-side canvas compression (max 1024px) with asynchronous BullMQ queues |

The single change we would make first is replacing brute-force spatial scans with geohash indexing, because insert latency directly stalls offline client sync queues across all 65 wards.
