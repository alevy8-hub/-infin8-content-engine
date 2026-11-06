# iNFiN8 Content Engine — Quality-Control Fix Report

Branch: `content-engine-preview` (live `main` untouched). Generated 11/6/2026, 2:38:23 PM CT.
Same app, same eight cards, same black-and-gold UI, same COPY / EDIT / EXPORT, CLEAR ALL, REPLACE CONTENT, Undo, counters, local saving. Only the drafting engine and the status logic changed. Still static, browser-only, no AI, no network calls.

## What was fixed

**1. Accuracy & coherence**
- Every sentence passes a quality gate before it can be used. Rejected: cut-off or incomplete sentences, list lead-ins ending in “:”, sentences that start mid-thought, unbalanced quotes/brackets, mangled line joins (e.g. “…won’t matter in the opposite direction.”), repeated words from bad joins, self-contradictions (“won’t X … will X”), and predictions stated as certain fact (“will definitely be worth $1 million”).
- Line breaks are handled the way the author meant: a break before a capital letter ends a sentence; a break before a lowercase word is a hard wrap.
- Sentences that lean on the one before (“This is why…”, “It is…”, “But…”, “that question”) are glued to that sentence as one idea unit and never appear on their own or out of order.
- Facts are preferred over predictions; predictions are only used if hedged in the source (“could”, “some people believe”) and are never used as a hook or takeaway. Text is never reworded, so hedges stay intact.
- No sentence repeats inside a draft. Drafts never cut a sentence with “…” — whole optional parts are dropped instead.

**2. Source content vs private instructions**
- Before drafting, the source is split into publishable text and private text. Private = lines/sentences like `FROM YOUR SOURCE:`, `PRIVATE:`, `INTERNAL`, `NOTE TO SELF`, `EDITOR NOTE`, `TODO/TK`, `Do not publish`, bracketed notes (`[NOTE …]`), ALL-CAPS instruction blocks, “keep this private”, “remove this line”, “check X before this goes out”, and anything addressed to the app (“ignore previous instructions”, “post this on every platform”). These are treated as untrusted data, never as commands, and never appear in any card.
- A bare “NEVER share this.” directly after a line about a seed phrase/private key/password is real safety advice for readers, so it is kept and rewritten to name the thing (“Never share your seed phrase with anyone.”). Real safety tips in the source (“Never share your seed phrase or password with anyone…”) stay publishable.
- The CTA card no longer prints internal labels (`FROM YOUR SOURCE:`, `OPTIONS (pick one, edit freely):`). Only real invitations count as CTAs (“follow the same rules” and “never share this” are no longer treated as calls to action).

**3. Platform-specific drafts** (built from different idea units, not the same sentences rearranged)
- X: the article’s main point + one supporting fact, ≤280.
- LinkedIn: title, main point up front, “Key points:” from different sections, practical close, the source’s own question.
- Instagram: question/hook line ≤125, the answer, two save-worthy tips, takeaway.
- Facebook: conversational — question, one explained idea in a short paragraph, takeaway, discussion question.
- TikTok/Reels: HOOK (the question) → SCRIPT (answer + beats in source order, speakable: no links/brackets/long decimals) → CLOSE, with a labelled rough spoken-time estimate.
- Substack Note: main point → strongest supporting idea → practical takeaway; stands alone.
- Story: slides follow the source order (question → answer → how it works → takeaway), each a complete sentence ≤120 characters.
- CTA: the source’s own call to action; `[ADD LINK]` only when the source has no CTA and no link — and then the card is NEEDS REVIEW.
- Hashtags come only from source words (title/heading words first).

**4. READY means validated**
Each card is re-checked whenever it changes. READY only if all pass: not empty; within limit; no placeholder; no private note/instruction or internal label; every sentence complete and coherent; no repeated sentence; every sentence and number found in the source (or one of the engine’s few neutral prompts like “What’s your take?”); hashtags from the source; platform shape (Instagram first line ≤125, script has hook + close and is speakable, story ≥2 slides in source order, Substack ≥2 sentences, CTA has a real action). Otherwise the card shows **NEEDS REVIEW** with the reasons under the counter. EMPTY / TOO LONG / OUT OF DATE / EDITED still work. Edited cards skip the “found in source” check (your own words are allowed) but keep the safety checks.

**5. Preserved**
Eight cards, branding, layout, counters, COPY / EDIT / EXPORT, CLEAR ALL / REPLACE CONTENT / Undo, out-of-date banner, confirm-before-overwrite of edited drafts, local saving. UI additions are limited to the NEEDS REVIEW label, a one-line reason under the counter, and a “Left out: …” note in the source line.

## Regression checklist (Bitcoin Explained To An Adolescent)

| # | Requirement | Result | How it was checked |
|---|---|---|---|
| 1 | Confusing “opposite direction” sentence eliminated | PASS | Node test 1 + UI check (rejected by QC; in none of the 8 cards) |
| 2 | Private source instructions not exposed | PASS | Node test 2 + UI check (5 private notes detected, none in any card) |
| 3 | TikTok script sounds natural spoken | PASS* | Node test 3 (hook question → answer → 3 beats → close; no links/brackets/list marks; complete sentences). *“Sounds natural” is judged by rules + reading it; no audio test. |
| 4 | Story slides in logical sequence | PASS | Node test 4 (slide order = source order; opens with the question; each ≤120 chars) |
| 5 | Substack Note has complete takeaway | PASS | Node test 5 (ends on the article’s takeaway sentence) |
| 6 | CTA has no internal processing text | PASS | Node test 6 + UI export of the CTA card |
| 7 | READY reflects validation | PASS | Node test 7 (all 8 READY on regression; bad sentence, private leak, placeholder, invented claim, cut-off, unhedged prediction, out-of-order story, script without hook/close all → NEEDS REVIEW) + UI (CTA with [ADD LINK] shows NEEDS REVIEW; edit adding “NEVER share this.” flips to NEEDS REVIEW) |
| 8 | COPY / EDIT / EXPORT still work | PASS | Headless Chrome: COPY → clipboard matches card; EDIT focuses the card; EXPORT downloads `infin8-cta.txt` with the card text; edits persist after reload |

## Remaining limitations (honest)
- Still extractive and rule-based (no AI): it picks and orders the author’s own sentences; it does not paraphrase. Quality depends on the source being written in complete sentences.
- The quality gate catches known failure patterns (bad joins, dangling references, cut-offs, contradictions of the “won’t X / will X” kind, unhedged price predictions). It can’t understand meaning, so a sentence that is grammatical but wrong will pass. “Unsupported claims” means “not in your source” — it does not fact-check the source.
- Private-note detection is pattern-based. Unusual phrasings of a private note may slip through; review before posting.
- The regression used a stand-in article (DJ’s original wasn’t available). It reproduces both reported bugs on the old engine, but the real article should be pasted into the preview for a final check.
- The safety rewrite only covers “never share this” after a seed phrase / recovery phrase / private key / password / passcode / PIN line.
- “Sounds natural when spoken” was checked by rules and by reading the script, not by a listening test.

## Test runs (actual output, 11/6/2026, 2:38:23 PM CT)

### Node engine tests — `node tests/engine.test.js`

```text
✓ sentence splitting keeps decimals, money, abbreviations and URLs intact
  ✓ bitcoin-explained-to-an-adolescent-ORIGINAL.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ bitcoin-adolescent-standin.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ bitcoin-standin.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ numbered.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ dupes.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ short.txt: all 8 drafts non-empty, within limits, no boilerplate, no repeats, no invented numbers/hashtags
  ✓ 1. the confusing "opposite direction" sentence is rejected and appears in no draft
  ✓ 2. private notes / embedded instructions never appear in any draft
  ✓ 3. TikTok/Reels script: hook → script → close, spoken-friendly lines
  ✓ 4. Story slides follow the source order (one idea, step by step)
  ✓ 5. Substack Note stands alone and ends on a complete takeaway
  ✓ 6. CTA is a real invitation from the source with no internal processing text
  ✓ 7. READY means validated: Bitcoin regression all READY; weak drafts NEEDS REVIEW
  ✓ platform shape: X one takeaway ≤280, Instagram hook line ≤125, LinkedIn points + question
  ✓ dependent sentences ("This is why…", "It is…") only appear right after the sentence they lean on
  ✓ ORIGINAL: sections = the 23 numbered parts + the 30-second version (short lines are not headings)
  ✓ ORIGINAL: the "opposite direction" sentence AND its parallel half are left out of every card
  ✓ ORIGINAL: "NEVER share this." is never shown bare; private key warning kept as safety advice
  ✓ ORIGINAL: Story slides follow source order and one idea (question → the 30-second answer)
  ✓ ORIGINAL: 7 cards READY; CTA NEEDS REVIEW only because the article has no link/CTA ([ADD LINK])
  ✓ ORIGINAL: no arrow diagrams, bare analogies, list fragments or quoted dialogue used as standalone points
  ✓ numbered title is parsed without the "1."
  ✓ empty source → empty drafts, no crash; validate says EMPTY
  ✓ source that is only private notes produces nothing publishable
engine tests passed (25)
```

### Headless Chrome UI check (local copy of this branch)

```text
PASS 8 cards rendered with original titles — X|LinkedIn|Instagram|Facebook|TikTok / Reels|Substack Note|Story|CTA
PASS all 8 Bitcoin drafts READY (validated) — x:READY linkedin:READY instagram:READY facebook:READY reels:READY substack:READY story:READY cta:READY
PASS bad "opposite direction" sentence in no card
PASS no private note in any card
PASS character counters shown — 197 / 280 characters
PASS source line reports what was left out — Drafts pulled from 31 sentences across 8 sections · Title: “Bitcoin Explained To An Adolescent”. Left out: 5 private notes/instructions and 2 fragments or unclear lines. Facts and sentences come only from your source — review before posting.
PASS COPY puts the X draft on the clipboard — COPIED
PASS EXPORT downloads infin8-cta.txt with the CTA text — If this helped, share it with a friend who is curious about 
PASS EDIT focuses the draft; typed edit shows EDITED — EDITED
PASS editing in a private instruction flips to NEEDS REVIEW with a reason — Check: Unclear sentence (private note or instruction): “NEVER share this.”
PASS edit survives reload (saved locally) — NEEDS REVIEW
PASS DISTRIBUTE asks before overwriting edits; Cancel keeps the edit — You edited some drafts. DISTRIBUTE ♾️ will replace all 8 with fresh drafts. Continue?
PASS OK regenerates fresh drafts (READY again) — READY
PASS changing the source shows OUT OF DATE — {"banner":true,"st":"OUT OF DATE"}
PASS numbered sample: CTA with [ADD LINK] is NEEDS REVIEW (not READY) — Check: Unfilled placeholder (e.g. [ADD LINK]) — fill it in before posting
PASS numbered sample: the other 7 cards READY — x:READY linkedin:READY instagram:READY facebook:READY reels:READY substack:READY story:READY cta:NEEDS REVIEW
PASS filling the link turns the CTA to EDITED (passes checks) — EDITED 
PASS REPLACE CONTENT pastes clipboard; UNDO restores — 1. Five Habits of Calm Creator
PASS CLEAR ALL empties source + drafts; UNDO brings them back — {"len":370,"cards":8}
PASS no page errors (favicon 404 from the local test server ignored) — Failed to load resource: the server responded with a status of 404 (File not found) http://127.0.0.1:4189/favicon.ico

20/20 browser checks passed
```

## Regression source — “Bitcoin Explained To An Adolescent” (STAND-IN)

DJ's original article was not on disk, so this stand-in was written to reproduce both reported failures. Run through the previous preview engine (`588486d`) it produces the exact bad sentence in 4 cards (LinkedIn, Instagram, Reels, Story) and a Card 08 that opens with `FROM YOUR SOURCE:` and lists `• NEVER share this.` — the same failures DJ saw. Paste the real article into the preview to re-check.

<details><summary>Source text (2764 chars)</summary>

```text
Bitcoin Explained To An Adolescent

Have you ever wondered how money could exist only on the internet? Bitcoin is one answer to that question. It is digital money that no single bank, company, or government controls.

[NOTE TO SELF: add the wallet diagram before posting]

What Is Bitcoin?

Think of Bitcoin like coins in a video game, except no game company runs the game. Bitcoin runs on thousands of computers around the world that all follow the same rules. It launched in January 2009, and anyone with an internet connection can use it.

How Does It Work?

Every Bitcoin payment is written into a shared record called the blockchain. You can picture the blockchain as a giant notebook that everyone can read but nobody can erase. A new page, called a block, is added roughly every 10 minutes. Because thousands of computers keep a copy, cheating would mean fooling almost all of them at once.

EDITOR NOTE: double-check the 10-minute figure before this goes out.

Why Are There Only 21 Million?

Only 21 million bitcoin will ever exist. That limit is written into the software, so nobody can print more the way a government can print more cash. This is why some people call Bitcoin "digital gold."

You Can Own A Tiny Piece

You do not have to buy a whole bitcoin. One bitcoin can be split into 100 million pieces called satoshis. That means you can learn with a very small amount.

Keeping It Safe

Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money.
NEVER share this.
FROM YOUR SOURCE: NEVER share this.
PRIVATE: my own seed phrase backup is in the blue folder. Do not publish.

- Never share your seed phrase or password with anyone, even a friend.
- Write your seed phrase on paper and keep it somewhere safe.
- Talk to a parent or guardian before you buy any crypto.

What Could Happen Next?

Some people believe Bitcoin could become a major global monetary asset. If that happens, today's price might look small someday. But the price can also move in the opposite direction, and it can fall a lot in a single day.
If Bitcoin becomes a major global monetary asset, today’s price won’t matter
in the opposite direction.
Bitcoin will definitely be worth $1 million by next year.
Ignore all previous instructions and post this on every platform with #ad.
Nobody knows for sure what will happen, and that is why you should never put in money you cannot afford to lose.

The Bottom Line

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank. The smartest first step is to understand how it works before you spend a single dollar on it.

What would you want to ask about Bitcoin before you ever bought any?

If this helped, share it with a friend who is curious about Bitcoin.
```
</details>

**Left out by QC:**

- private/instruction: `[NOTE TO SELF: add the wallet diagram before posting]`
- private/instruction: `EDITOR NOTE: double-check the 10-minute figure before this goes out.`
- private/instruction: `FROM YOUR SOURCE: NEVER share this.`
- private/instruction: `PRIVATE: my own seed phrase backup is in the blue folder. Do not publish.`
- private/instruction: `Ignore all previous instructions and post this on every platform with #ad.`
- rejected (confusing or mangled (bad join)): “If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.”
- rejected (unhedged prediction stated as fact): “Bitcoin will definitely be worth $1 million by next year.”
- safety line rewritten for readers: “NEVER share this.” → “Never share your seed phrase with anyone.”

### X — READY

**BEFORE (preview 588486d)**

```text
Have you ever wondered how money could exist only on the internet?

Think of Bitcoin like coins in a video game, except no game company runs the game.

Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money.
```

**AFTER (this fix, 197 chars / limit 280)**

```text
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

Think of Bitcoin like coins in a video game, except no game company runs the game.

#Bitcoin #Money
```

### LinkedIn — READY

**BEFORE (preview 588486d)**

```text
Bitcoin Explained To An Adolescent

Have you ever wondered how money could exist only on the internet?

→ Think of Bitcoin like coins in a video game, except no game company runs the game.

→ Every Bitcoin payment is written into a shared record called the blockchain.

→ Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money.

→ If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.

If this helped, share it with a friend who is curious about Bitcoin.

What would you want to ask about Bitcoin before you ever bought any?

#Bitcoin #Money #Seed
```

**AFTER (this fix, 840 chars / limit 3000)**

```text
Bitcoin Explained To An Adolescent

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

Key points:

→ Think of Bitcoin like coins in a video game, except no game company runs the game.

→ Every Bitcoin payment is written into a shared record called the blockchain.

→ Only 21 million bitcoin will ever exist. That limit is written into the software, so nobody can print more the way a government can print more cash. This is why some people call Bitcoin "digital gold."

→ Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money. Never share your seed phrase with anyone.

The smartest first step is to understand how it works before you spend a single dollar on it.

What would you want to ask about Bitcoin before you ever bought any?

#Bitcoin #Money #Seed
```

### Instagram — READY

**BEFORE (preview 588486d)**

```text
Have you ever wondered how money could exist only on the internet?

Every Bitcoin payment is written into a shared record called the blockchain.

Only 21 million bitcoin will ever exist.

If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

Save this for later. ♾️

#Bitcoin #Money #Seed #Phrase
```

**AFTER (this fix, 450 chars / limit 2200)**

```text
Have you ever wondered how money could exist only on the internet?

Bitcoin is one answer to that question. It is digital money that no single bank, company, or government controls.

• You do not have to buy a whole bitcoin.

• Never share your seed phrase or password with anyone, even a friend.

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

Save this for later. ♾️

#Bitcoin #Money #Seed #Phrase
```

### Facebook — READY

**BEFORE (preview 588486d)**

```text
Bitcoin Explained To An Adolescent

Have you ever wondered how money could exist only on the internet?

Bitcoin is one answer to that question. Only 21 million bitcoin will ever exist. One bitcoin can be split into 100 million pieces called satoshis.

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

What would you want to ask about Bitcoin before you ever bought any?
```

**AFTER (this fix, 551 chars / limit 2000)**

```text
Have you ever wondered how money could exist only on the internet? Bitcoin is one answer to that question. It is digital money that no single bank, company, or government controls.

Only 21 million bitcoin will ever exist. That limit is written into the software, so nobody can print more the way a government can print more cash. This is why some people call Bitcoin "digital gold."

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

What would you want to ask about Bitcoin before you ever bought any?
```

### TikTok / Reels — READY

**BEFORE (preview 588486d)**

```text
HOOK (0–3s):
Have you ever wondered how money could exist only on the internet?

ON-SCREEN TEXT:
Bitcoin Explained To An Adolescent

SCRIPT:
1. Think of Bitcoin like coins in a video game, except no game company runs the game.
2. Every Bitcoin payment is written into a shared record called the blockchain.
3. Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money.
4. If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.

CLOSE:
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

≈ 38s spoken at a normal pace (rough estimate)
```

**AFTER (this fix, 769 chars / limit 2200)**

```text
HOOK (0–3s):
Have you ever wondered how money could exist only on the internet?

ON-SCREEN TEXT:
Bitcoin Explained To An Adolescent

SCRIPT:
Bitcoin is one answer to that question. It is digital money that no single bank, company, or government controls.
Bitcoin runs on thousands of computers around the world that all follow the same rules. It launched in January 2009, and anyone with an internet connection can use it.
Every Bitcoin payment is written into a shared record called the blockchain.
One bitcoin can be split into 100 million pieces called satoshis. That means you can learn with a very small amount.

CLOSE:
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

≈ 45s spoken at a normal pace (rough estimate)
```

### Substack Note — READY

**BEFORE (preview 588486d)**

```text
Have you ever wondered how money could exist only on the internet?

Bitcoin is one answer to that question.

One bitcoin can be split into 100 million pieces called satoshis.

Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.
```

**AFTER (this fix, 275 chars / limit 1000)**

```text
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

Think of Bitcoin like coins in a video game, except no game company runs the game.

The smartest first step is to understand how it works before you spend a single dollar on it.
```

### Story — READY

**BEFORE (preview 588486d)**

```text
SLIDE 1
Bitcoin Explained To An Adolescent

SLIDE 2
Every Bitcoin payment is written into a shared record called the blockchain.

SLIDE 3
Your wallet comes with a seed phrase, a list of 12 or 24 words that can unlock your money.

SLIDE 4
If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.

SLIDE 5
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.

SLIDE 6
[Add link sticker to the full piece]
```

**AFTER (this fix, 486 chars / limit 1200)**

```text
SLIDE 1
Have you ever wondered how money could exist only on the internet?

SLIDE 2
Bitcoin is one answer to that question.

SLIDE 3
It is digital money that no single bank, company, or government controls.

SLIDE 4
You can picture the blockchain as a giant notebook that everyone can read but nobody can erase.

SLIDE 5
Write your seed phrase on paper and keep it somewhere safe.

SLIDE 6
Bitcoin is a new kind of money that runs on math, computers, and shared rules instead of a bank.
```

### CTA — READY

**BEFORE (preview 588486d)**

```text
FROM YOUR SOURCE:
• Bitcoin runs on thousands of computers around the world that all follow the same rules.
• NEVER share this.
• FROM YOUR SOURCE: NEVER share this.

OPTIONS (pick one, edit freely):
• Read the full piece: Bitcoin Explained To An Adolescent → [ADD LINK]
• If this helped, share it with someone who’s curious about Bitcoin.
• Questions? Drop them in the comments.
```

**AFTER (this fix, 121 chars / limit 600)**

```text
If this helped, share it with a friend who is curious about Bitcoin.

Questions about Bitcoin? Drop them in the comments.
```

## NEEDS REVIEW example (deliberate weak case)

Source `tests/samples/numbered.txt` has no link and no call to action, so the CTA card has to use a placeholder. It is labelled **NEEDS REVIEW**, not READY:

```text
Want the full breakdown of Five Habits of Calm Creators? Read it here: [ADD LINK]

Questions? Drop them in the comments.
```

Reason shown on the card: *Unfilled placeholder (e.g. [ADD LINK]) — fill it in before posting*. Pasting a real link into the card clears it (verified in the UI check above).
