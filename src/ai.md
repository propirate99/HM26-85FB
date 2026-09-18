# AI disclosure — CivicVerify

AI **assists**; it does not control identity, authorization, zone access, status transitions, deadlines, escalation, audit logs, or evidence-presence checks.

## What AI is used for

- Category suggestion and image-to-category relevance
- Description summarization
- Optional duplicate text similarity assistance
- Optional before/after resolution comparison
- Optional synthetic/manipulation **risk** (never a “fake/real” verdict)

## Providers

`AIProvider` interface (`backend/src/integrations/ai.provider.js`):

| Implementation | When |
| --- | --- |
| `MockAIProvider` | Default. Reliable demo, no network. Heuristics from category + filename + metadata. |
| `ExternalAIProvider` | `AI_PROVIDER=external`. Calls an OpenAI-compatible or Yandex-style endpoint if configured. Timeouts fall back to mock. |

Every AI result stores `provider`, `model`/`version`, and `analyzedAt`.

## Failure behavior

If AI times out or errors:

1. The complaint is **still accepted**
2. AI status is `UNAVAILABLE`
3. GPS, hash, zone, and duplicate rules still run
4. Manual verification is required (`requiresManualReview: true`)

A citizen must never lose a report because a model API failed.

## Language

Do not say the system proved an image is authentic. Say **low synthetic risk**, **needs review**, or **high synthetic risk** (flag for humans). High synthetic risk **never auto-rejects** by itself.

## Custom training

Out of scope for 72 hours. Keep human review labels on reports for a future supervised dataset. Do not train a dedicated model during the hackathon.
