# iNFiN8 Content Engine — V0.3 (preview, quality-control fix)

**Create Once. Distribute iNFiN8. ♾️**

Static app for GitHub Pages. No AI, no paid services, no API keys, no network calls.

## What it does
- Paste one source → **DISTRIBUTE ♾️** → 8 platform drafts (X, LinkedIn, Instagram, Facebook, TikTok/Reels, Substack Note, Story, CTA)
- **CLEAR ALL** (with Undo) and **REPLACE CONTENT** (pastes from clipboard, or empties the field for one paste on mobile)
- Edit, Copy, Export (.txt) each draft; everything saves locally in the browser
- Per-draft character count vs. platform limit; READY only when the draft passes quality checks, otherwise NEEDS REVIEW (with the reason); EDITED / OUT OF DATE / TOO LONG / EMPTY
- Warns before DISTRIBUTE overwrites drafts you edited; flags drafts when the source changes

## How drafting works (`engine.js`)
Extractive only — it never invents facts, numbers, titles, offers or links.
1. Separates publishable text from private notes and embedded instructions (`FROM YOUR SOURCE:`, `PRIVATE:`, `NOTE TO SELF`, `EDITOR NOTE`, `[NOTE …]`, “ignore previous instructions”, …). Those are untrusted data and never reach a draft.
2. Detects the title and section headings, list items and questions; splits sentences safely (decimals, $ amounts, e.g./U.S., URLs); removes duplicates.
3. Quality gate: drops incomplete, cut-off, mangled, self-contradicting sentences and predictions stated as certain fact.
4. Groups sentences that depend on the one before (“This is why…”) into idea units so nothing appears out of context.
5. Builds each platform from different units (main point, hook question, key points per section, takeaway) and formats per platform.
6. `validate()` decides READY vs NEEDS REVIEW (coherence, source match, numbers, hashtags, limits, placeholders, private notes, platform shape).

See `QC-REPORT.md` for what was fixed and the regression results.

The time-saved figure is a labelled rough estimate (≈5 min per hand-written draft), not a measurement.

## Tests
`node tests/engine.test.js`
