# FINAL END-TO-END QC — DJ’s ORIGINAL article

Source: `tests/samples/bitcoin-explained-to-an-adolescent-ORIGINAL.txt` — exact file DJ attached (13,159 bytes, md5 `04e34eeab6b479cd7dfd6958ad74b90c`, verified). **No stand-in used.** The source text was not edited.
Branch `content-engine-preview` · live `main` untouched · generated 11/6/2026, 2:38:28 PM CT.

## Eight-card result (actual text from the app, mobile 390px run)

| # | Card | Status | QC | Note |
|---|---|---|---|---|
| 01 | X | READY | PASS | Main point + one supporting fact, 159/280. Both sentences verbatim and accurate. |
| 02 | LinkedIn | READY | PASS | Title, main point, 4 key points from different sections, the article’s closing idea, the article’s own question. |
| 03 | Instagram | READY | PASS | Opens on the article’s question (≤125), two save-worthy rules incl. the seed-phrase warning, takeaway. |
| 04 | Facebook | READY | PASS | Question → one explained idea (miners / Proof of Work, 3 sentences in order) → takeaway → the article’s question for discussion. |
| 05 | TikTok / Reels | READY | PASS | Hook question → 3 speakable beats in source order → close; no links/arrows/quotes; ≈31s labelled estimate. |
| 06 | Substack Note | READY | PASS | Main point → the article’s core insight (scarce digital object) → closing line. Stands alone. |
| 07 | Story | READY | PASS | Question → the author’s own 30-second answer, 5 slides in source order. Was NEEDS REVIEW “out of order” before this fix. |
| 08 | CTA | NEEDS REVIEW | PASS (label correct) | Correctly NEEDS REVIEW: the article has no link and no call to action, so the card shows [ADD LINK]. Filling the link clears it (tested). |

Checks behind READY (all must pass): complete coherent sentences · every sentence & number found in the source · no repeats in the card · no private notes / instructions / internal labels · no placeholders · within limits · platform shape (IG first line ≤125, script hook+close+speakable, story in source order, Substack ≥2 sentences, CTA has a real action).

## DJ checklist

| Requirement | Result | Evidence |
|---|---|---|
| 1. Story slide ordering | PASS — fixed | Before: `NEEDS REVIEW: Slides are out of order` (see below). After: question → author’s 30-second answer, strictly in source order; node test + UI |
| 2. Meaning, context, accuracy, intent, voice | PASS with flags below | All card text is DJ’s own sentences, unchanged; the paired “today’s price won’t matter…” sentences are both left out; no sentence shown without the one it depends on |
| 3. Platform formatting, no repeats inside a card | PASS | node tests (no sentence repeated inside any card; limits) |
| 4. No private instructions / internal notes | PASS | No “FROM YOUR SOURCE”, no bare “NEVER share this.” in any card; the article’s private-key warning is kept as “Never share your private key with anyone.” (the only reworded line) |
| 5. READY only when all checks pass | PASS | 7 READY; CTA NEEDS REVIEW with reason “Unfilled placeholder ([ADD LINK])” |
| 6. Copy / Edit / Export on mobile (390px) | PASS | 8/8 copy exact text; 8/8 exports exact text; Edit focuses, types, shows EDITED, survives reload |
| 7. Preview URL | updated | https://htmlpreview.github.io/?https://github.com/alevy8-hub/-infin8-content-engine/blob/content-engine-preview/index.html |

## Flags for DJ (outputs only — the article was not changed)

1. **“Bitcoin is digital money that nobody owns or controls.”** (LinkedIn, Reels) — simplification. Nobody controls the *network*, but each holder controls their own coins with their keys (the article itself says “Whoever controls the private key controls the Bitcoin”). Consider “…that no company or government controls.”
2. **“Bitcoin is essentially the first successful attempt at creating a scarce digital object…”** (LinkedIn, Substack) — DJ’s view stated as fact. Widely held, but it is an opinion.
3. **“You can send Bitcoin directly to another person without a bank.”** — accurate; leaves out that the network still charges a fee and confirms the payment. Fine for teens. It also closes 7 of the 8 cards (it’s the strongest line in the 30-second summary). Not repeated inside any one card, but you may want more variety across cards.
4. **Article note, not in any output:** Section 3 says “Millions of computers have copies of it.” Public node counts are in the tens of thousands, and your own 30-second version says “Thousands of computers.” Consider aligning the article.
5. **Story line “There will never be more than 21 million.”** — correct (protocol cap).
6. The article is written to a dad about his daughter (“her”, “Dad”, “born in 2007”). Lines that only make sense in that frame are kept out of the cards. DJ may still want to tune the cards to his own voice.
7. **CTA:** the article has no link or call to action, so Card 08 can’t be READY until a link is added. That’s correct, not a bug.
8. Engine is still extractive and rule-based (no AI). It picks and orders DJ’s sentences; it does not paraphrase or fact-check the article.

## Story — before vs after on the ORIGINAL

**Before (commit e3e0901):**

```text
{"ok":false,"issues":["Slides are out of order"]}
SLIDE 1
Bitcoin is digital money that nobody owns or controls.

SLIDE 2
What if people could send money directly to each other without needing a bank to approve it?

SLIDE 3
A Bitcoin wallet doesn’t really “hold Bitcoin” the way your purse holds cash.

SLIDE 4
Think of your Bitcoin wallet like Venmo with one massive difference.

SLIDE 5
You can send Bitcoin directly to another person without a bank.
```

**After:**

```text
SLIDE 1
What if people could send money directly to each other without needing a bank to approve it?

SLIDE 2
Bitcoin is internet-native money.

SLIDE 3
There will never be more than 21 million.

SLIDE 4
Nobody owns the Bitcoin network.

SLIDE 5
Thousands of computers around the world verify transactions.

SLIDE 6
You can send Bitcoin directly to another person without a bank.
```

## All eight cards — full text (from the app)

### 01 X — READY (159 / 280 characters)

```text
You can send Bitcoin directly to another person without a bank.

A Bitcoin wallet doesn’t really “hold Bitcoin” the way your purse holds cash.

#Bitcoin #Money
```

### 02 LinkedIn — READY (590 / 3,000 characters)

```text
Bitcoin Explained To An Adolescent

You can send Bitcoin directly to another person without a bank.

Key points:

→ Bitcoin is digital money that nobody owns or controls.

→ Never assume: “It’s crypto, therefore it’s basically Bitcoin.”

→ Bitcoin is essentially the first successful attempt at creating a scarce digital object that doesn’t require a central company to exist.

→ Bitcoin is scarce digital money. Maximum supply: 21 million BTC.

Your generation is watching money itself become technology.

How important will Bitcoin be 10, 20 or 30 years from now?

#Bitcoin #Money #Wallet
```

### 03 Instagram — READY (376 / 2,200 characters)

```text
What if people could send money directly to each other without needing a bank to approve it?

• A Bitcoin wallet doesn’t really “hold Bitcoin” the way your purse holds cash.

• Your seed phrase/private key = control of your money. Never share it. Ever.

You can send Bitcoin directly to another person without a bank.

Save this for later. ♾️

#Bitcoin #Money #Wallet #Digital
```

### 04 Facebook — READY (428 / 2,000 characters)

```text
What if people could send money directly to each other without needing a bank to approve it?

Miners use specialized computers to compete to process new groups of transactions. In exchange, successful miners can receive newly created Bitcoin plus transaction fees. This process is called: Proof of Work.

You can send Bitcoin directly to another person without a bank.

How important will Bitcoin be 10, 20 or 30 years from now?
```

### 05 TikTok / Reels — READY (596 / 2,200 characters)

```text
HOOK (0–3s):
What if people could send money directly to each other without needing a bank to approve it?

ON-SCREEN TEXT:
Bitcoin Explained To An Adolescent

SCRIPT:
Bitcoin is digital money that nobody owns or controls.
Bitcoin uses energy and computation instead of trusting one central company to keep the ledger honest.
If your Bitcoin is sitting on an exchange and the exchange controls the private keys, technically you’re trusting that company to protect your Bitcoin.

CLOSE:
You can send Bitcoin directly to another person without a bank.

≈ 31s spoken at a normal pace (rough estimate)
```

### 06 Substack Note — READY (262 / 1,000 characters)

```text
You can send Bitcoin directly to another person without a bank.

Bitcoin is essentially the first successful attempt at creating a scarce digital object that doesn’t require a central company to exist.

Your generation is watching money itself become technology.
```

### 07 Story — READY (379 / 1,200 characters)

```text
SLIDE 1
What if people could send money directly to each other without needing a bank to approve it?

SLIDE 2
Bitcoin is internet-native money.

SLIDE 3
There will never be more than 21 million.

SLIDE 4
Nobody owns the Bitcoin network.

SLIDE 5
Thousands of computers around the world verify transactions.

SLIDE 6
You can send Bitcoin directly to another person without a bank.
```

### 08 CTA — NEEDS REVIEW (140 / 600 characters)

Check: Unfilled placeholder (e.g. [ADD LINK]) — fill it in before posting

```text
Want the full breakdown of Bitcoin Explained To An Adolescent? Read it here: [ADD LINK]

Questions about Bitcoin? Drop them in the comments.
```

## What QC left out of the drafts

- Reworded for readers: “NEVER share this.” → “Never share your private key with anyone.”
- 50 lines that are fragments, list pieces, diagrams or failed QC (e.g. “If Bitcoin eventually becomes irrelevant, today’s price won’t matter.” and “If Bitcoin becomes a major global monetary asset, today’s price won’t matter in the opposite direction.”)
- Private notes found in this article: none (the article has none; detection is tested on the stand-in)

## Test runs (actual output)

### Headless Chrome, mobile 390×844, ORIGINAL article — local copy of the branch

```text
source md5 04e34eeab6b479cd7dfd6958ad74b90c bytes 13159 url http://127.0.0.1:4189/
PASS mobile 390px: 8 cards rendered — X | LinkedIn | Instagram | Facebook | TikTok / Reels | Substack Note | Story | CTA
PASS statuses — x:READY linkedin:READY instagram:READY facebook:READY reels:READY substack:READY story:READY cta:NEEDS REVIEW
PASS no private note / bad sentence in any card
source line: Drafts pulled from 257 sentences across 24 sections · Title: “Bitcoin Explained To An Adolescent”. Left out: 50 fragments or unclear lines. Facts and sentences come only from your source — review before posting.
PASS mobile COPY: all 8 cards copy their exact text (label → COPIED) — 8/8
PASS mobile EXPORT: all 8 cards download infin8-<card>.txt with exact text — 8/8 · files: infin8-cta.txt, infin8-facebook.txt, infin8-instagram.txt, infin8-linkedin.txt, infin8-reels.txt, infin8-story.txt, infin8-substack.txt, infin8-x.txt
PASS mobile EDIT: focuses the card, typing works, status → EDITED, counter updates — EDITED · 456 / 2,000 characters
PASS edit kept after reload — EDITED
PASS CTA: after the link is filled in, NEEDS REVIEW clears (→ EDITED) — EDITED
PASS no page errors

9/9 checks passed
```

### Same test against the live preview URL (after push)

```text
(not run yet)
```

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

Screenshots: `screenshots/final-01-original-mobile-full.png`, `final-02-original-story-mobile.png`, `final-03-original-cta-mobile.png`, `final-04-original-desktop-full.png`.
