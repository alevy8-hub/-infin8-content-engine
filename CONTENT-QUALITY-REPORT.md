# Content-quality report: “Bitcoin Explained To An Adolescent” (ORIGINAL)

Branch `content-engine-preview` only. Nothing is merged, deployed, or changed on Pages. main = `b2b6b6e`.
Source: `tests/samples/bitcoin-explained-to-an-adolescent-ORIGINAL.txt`, md5 `04e34eeab6b479cd7dfd6958ad74b90c` (unchanged).

**Two separate verdicts:**
- **Technical:** READY / NEEDS REVIEW comes from the engine’s validator. It checks length limits, placeholders, private notes, fragments, that every sentence appears in the source, numbers and hashtags, repeats, and platform shape.
- **Editorial:** PASS / FAIL is a human-style reading for usefulness on that platform, meaning preserved, and nothing invented. A card can pass one verdict and not the other. The CTA is the example.

## Summary

| # | Card | Technical | Editorial | Last line (ending) |
|---|------|-----------|-----------|--------------------|
| 1 | X | READY | PASS | You can’t exactly text somebody: $50,000 of gold. You can send Bitcoin. That is why one popular Bitcoin thesis is: Gold for the internet generation. |
| 2 | LinkedIn | READY | PASS | Your generation is watching money itself become technology. |
| 3 | Instagram | READY | PASS | Your wallet gives you control through cryptographic keys. |
| 4 | Facebook | READY | PASS | Nobody owns the Bitcoin network. |
| 5 | TikTok / Reels | READY | PASS | Thousands of computers around the world verify transactions. |
| 6 | Substack Note | READY | PASS (flag) | AI is changing knowledge work. And Bitcoin is one of the largest experiments ever attempted in changing money itself. Understanding that experiment while you’re 19? That’s worth learning. |
| 7 | Story | READY | PASS | You can send Bitcoin directly to another person without a bank. |
| 8 | CTA | NEEDS REVIEW (only: [ADD LINK] needs your link) | PASS | Read the full breakdown: [ADD LINK] |

All 8 endings are now different. Before this change, “You can send Bitcoin directly to another person without a bank.” ended about 7 of the 8 cards. Now it ends only the Story, where it is the payoff of the author’s 30-second version.

## Why the CTA failed, exactly

1. **Why it was NEEDS REVIEW:**
   - The article contains no URL and no call-to-action sentence. Nothing matches the engine’s CTA patterns (subscribe, follow, share, link in bio, etc.).
   - The engine never invents URLs, so it printed `[ADD LINK]`.
   - The validator refuses READY while any `[ADD …]` placeholder is in a card.
   - That behaviour is correct, and it is kept.
2. **Why it was also editorially weak:**
   - With no source CTA, the old fallback used only two generic templates: “Want the full breakdown of …? Read it here: [ADD LINK]” and “Questions about Bitcoin? Drop them in the comments.”
   - Nothing in it came from the article, so it gave the reader no reason to act.
   - The reason text (“Unfilled placeholder…”) didn’t say why the placeholder was there.

**What changed:**
- **Article’s own advice:** when there’s no source CTA, the card now leads with an imperative, educational line from the article: rule #5, “Learn before you speculate. Bitcoin rewards curiosity. Crypto punishes carelessness.”
- **Article’s own question:** next comes the article’s discussion question, with a neutral comment prompt.
- **Labelled link slot:** last comes `Read the full breakdown: [ADD LINK]`.
- **New reason text:** “[ADD LINK] needs your link — the source has no URL and the engine never invents one. Paste your link or delete that line.”
- **Still NEEDS REVIEW until resolved:** the card becomes EDITED once the link is pasted (tested in the browser). It becomes READY if the link line is deleted (tested in node).

## Other changes, all in `engine.js`

- **Endings:** `generateAll` records each card’s closing line. Later cards strongly down-weight a closing that another card already used. When every conclusion line is taken, they may close on a late body line (hedged lines allowed, predictions never). Story is generated first, because its ending is fixed by the author’s own step-by-step run. Output order is unchanged.
- **Meaning and uncertainty:**
  - Hedged outlooks (may, might, could, one popular thesis) are allowed as closings and quoted word for word.
  - Unhedged predictions are still blocked.
  - Sweeping absolutes (nobody, everyone, impossible …) are down-weighted unless the sentence names what is meant (the network, a company, a government, a bank).
  - So the cards say “Nobody owns the Bitcoin network”, not “digital money that nobody owns or controls”.
- **Context:**
  - A contrast line now stays with its setup, e.g. “You can’t text $50,000 of gold.” + “You can send Bitcoin.”, and “you don’t need thousands of dollars” + “start with $5”. This stops dangling half-ideas such as a closing that ends on “And you don’t need thousands of dollars.”
  - A unit now holds up to 4 sentences.
  - A unit never ends on a setup line that needs the next sentence.
- **Platform shape:**
  - X: picks the strongest short multi-beat unit.
  - LinkedIn: opens on a question, then Key points.
  - Openers rotate between the article’s two hook questions.
  - Substack: insight + supporting line + a reflective closing.
  - Story: the author’s own run, capped by slide count.
  - CTA: as described above.

## Full text of the 8 cards (generated from the ORIGINAL, unedited)

### X: READY · editorial PASS

Punchy three-beat contrast (gold vs Bitcoin). Keeps the author’s hedge “one popular Bitcoin thesis”, so it isn’t stated as fact.

```
You can’t exactly text somebody: $50,000 of gold. You can send Bitcoin. That is why one popular Bitcoin thesis is: Gold for the internet generation.

#Bitcoin #Money
```

### LinkedIn: READY · editorial PASS

Structured: title, question opener, 4 “Key points”, closing line, discussion question. Note: the “Never assume: …” point quotes a misconception as a warning, word for word from the article.

```
Bitcoin Explained To An Adolescent

Why does money need a middleman?

Key points:

→ A Bitcoin wallet doesn’t really “hold Bitcoin” the way your purse holds cash.

→ Never assume: “It’s crypto, therefore it’s basically Bitcoin.”

→ Bitcoin is essentially the first successful attempt at creating a scarce digital object that doesn’t require a central company to exist.

→ Bitcoin is scarce digital money. Maximum supply: 21 million BTC.

Your generation is watching money itself become technology.

How important will Bitcoin be 10, 20 or 30 years from now?

#Bitcoin #Money #Wallet
```

### Instagram: READY · editorial PASS

Caption: hook question, 2 skimmable bullets (wallet, seed-phrase safety), wallet-control closing, save prompt.

```
What if people could send money directly to each other without needing a bank to approve it?

• A Bitcoin wallet doesn’t really “hold Bitcoin” the way your purse holds cash.

• Your seed phrase/private key = control of your money. Never share it. Ever.

Your wallet gives you control through cryptographic keys.

Save this for later. ♾️

#Bitcoin #Money #Wallet #Digital
```

### Facebook: READY · editorial PASS

Discussion post: question, one explained idea (miners / Proof of Work), a precise framing (“Nobody owns the Bitcoin network”, not “nobody controls Bitcoin”), the article’s own question.

```
Why does money need a middleman?

Miners use specialized computers to compete to process new groups of transactions. In exchange, successful miners can receive newly created Bitcoin plus transaction fees. This process is called: Proof of Work.

Nobody owns the Bitcoin network.

How important will Bitcoin be 10, 20 or 30 years from now?
```

### TikTok / Reels: READY · editorial PASS

Spoken script, ~34s: hook, 3 beats (energy/computation, exchange custody, scarce digital object), close.

```
HOOK (0–3s):
What if people could send money directly to each other without needing a bank to approve it?

ON-SCREEN TEXT:
Bitcoin Explained To An Adolescent

SCRIPT:
Bitcoin uses energy and computation instead of trusting one central company to keep the ledger honest.
If your Bitcoin is sitting on an exchange and the exchange controls the private keys, technically you’re trusting that company to protect your Bitcoin.
Bitcoin is essentially the first successful attempt at creating a scarce digital object that doesn’t require a central company to exist.

CLOSE:
Thousands of computers around the world verify transactions.

≈ 34s spoken at a normal pace (rough estimate)
```

### Substack Note: READY · editorial PASS (flag)

Works on its own: insight, supporting line, the author’s reflective closing. Flag: “while you’re 19” is the author’s reader-specific framing. It’s kept as written, but you may want to edit it for a general audience.

```
Bitcoin is essentially the first successful attempt at creating a scarce digital object that doesn’t require a central company to exist.

Before Bitcoin, digital things were easy to copy.

AI is changing knowledge work. And Bitcoin is one of the largest experiments ever attempted in changing money itself. Understanding that experiment while you’re 19? That’s worth learning.
```

### Story: READY · editorial PASS

Progressive slides follow the article’s own “30-second version” in order, from question to payoff.

```
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

### CTA: NEEDS REVIEW — [ADD LINK] needs your link — the source has no URL and the engine never invents one. Paste your link or delete that line. · editorial PASS

Actionable invitation drawn from the article (rule #5), the article’s own discussion question, and a clearly labelled link slot. Nothing invented.

```
Learn before you speculate. Bitcoin rewards curiosity. Crypto punishes carelessness.

How important will Bitcoin be 10, 20 or 30 years from now? Drop your answer in the comments.

Read the full breakdown: [ADD LINK]
```

## Remaining editorial flags (not fixed by design: the engine only extracts and does not rewrite)

- **Repeated body sentence:** “Bitcoin is essentially the first successful attempt at creating a scarce digital object…” appears in LinkedIn, Reels and Substack. It is the article’s central thesis. Making Substack avoid it produced an incoherent note (Halving → AI), so it was left in.
- **Shared opening questions:** the article has two hook questions, so 5 cards share 2 openers: “What if people could send money…?” and “Why does money need a middleman?”.
- **Lines that also appear mid-Story:** “Nobody owns the Bitcoin network.” and “Thousands of computers…” end FB and Reels, and also appear as Story slides 4–5, though not as the Story’s ending.
- **The article’s own formatting:** the X card’s “You can’t exactly text somebody: $50,000 of gold.” keeps the author’s colon. You may want to smooth it when you post.

## Tests actually run

- `node tests/engine.test.js`: 29/29 passed. New tests:
  - Endings are unique per card, on both the ORIGINAL and the stand-in.
  - The CTA has the invitation, the question and the link slot, has no invented URL, and becomes READY when the link is filled or the line is removed.
  - No flattened absolutes or predictions.
  - Each card has its own platform shape.
- `ce-qc-test.mjs`: stand-in UI, 20/20 passed. Check 7 was updated to the new CTA reason wording.
- `ce-final-e2e.mjs` on the ORIGINAL at mobile 390px: 9/9 passed.
  - Statuses: 7 READY + CTA NEEDS REVIEW.
  - COPY 8/8 exact, EXPORT 8/8 exact.
  - EDIT → EDITED, kept after reload.
  - Filling the CTA link → EDITED.
  - No page errors.
- Screenshots, mobile and desktop: taken with the run and kept beside this branch (not committed, so the repo stays light).
