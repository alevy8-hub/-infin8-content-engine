# iNFiN8 Content Engine — V0.2 (preview)

**Create Once. Distribute iNFiN8. ♾️**

Static app for GitHub Pages. No AI, no paid services, no API keys, no network calls.

## What it does
- Paste one source → **DISTRIBUTE ♾️** → 8 platform drafts (X, LinkedIn, Instagram, Facebook, TikTok/Reels, Substack Note, Story, CTA)
- **CLEAR ALL** (with Undo) and **REPLACE CONTENT** (pastes from clipboard, or empties the field for one paste on mobile)
- Edit, Copy, Export (.txt) each draft; everything saves locally in the browser
- Per-draft character count vs. platform limit; EDITED / OUT OF DATE status
- Warns before DISTRIBUTE overwrites drafts you edited; flags drafts when the source changes

## How drafting works (`engine.js`)
Extractive only — it never invents facts, numbers, titles, offers or links.
1. Detects the title and section headings (strips `1.`, `#`, `**` marks), list items and questions.
2. Splits sentences safely (decimals like 0.00000001, $ amounts, e.g./U.S., URLs).
3. Removes duplicate sentences and repeats of the title.
4. Scores every sentence across the **whole** article and picks points from every section.
5. Formats per platform; missing links show as `[ADD LINK]`.

The time-saved figure is a labelled rough estimate (≈5 min per hand-written draft), not a measurement.

## Tests
`node tests/engine.test.js`
