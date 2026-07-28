---
name: AI proxy token output ceiling
description: The Replit AI proxy enforces a hard output cap (~350 tokens) regardless of max_completion_tokens. Any endpoint generating more than ~1400 chars of JSON will be truncated and fail to parse.
---

## Rule
Production Replit AI proxy caps output at ~350 tokens (~1400 chars) regardless of `max_completion_tokens`.

**Why:** Observed across generate-swot, ai-populate, generate-readiness. Dev is slightly more permissive than production — failures appear only after deployment.

**How to apply:**
- Never request more than 4 items per AI call when each item has 4-5 fields.
- For bulk generation split into N parallel calls — one per group/quadrant/category.
- Pattern that works: `Promise.all([call1, call2, call3, call4])` each returning 4 items.
- Keep string fields under 90 chars. Use `max_completion_tokens: 800` per call.
- Wrap each JSON.parse in try/catch so one failure doesn't kill the whole response.

## Long-form free text (speeches, manifestos)
Same ceiling applies to long prose, not just JSON. To produce a complete
multi-hundred-word document, split it into logical sections (e.g. speech =
opening/body/close; manifesto = preamble + 4 pillars + pledge), generate each in
its own `chat.completions` call via `Promise.all`, then assemble server-side.
Enforce completeness: if any section returns "", fail with 502 rather than
returning a document with holes as success.

## Model note
`gpt-5-mini` silently returns empty string content on some parallel calls (content = "" with no error). Use `gpt-5.1` for all parallel AI calls. Observed on rebuttal endpoint: FACTUAL COUNTER and BRIDGE & PIVOT returned "" while FIRM DENIAL returned valid JSON in the same `Promise.all`.
