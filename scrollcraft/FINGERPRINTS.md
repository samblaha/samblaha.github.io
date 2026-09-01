# Fingerprints

Every site you build with **scrollcraft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| desktop-labs-field-notes | Chaptered editorial | No bar; margin folio (wordmark + chapter number/title, inverts on dark plates) | Title page: type on warm paper, zine contents block, no media | flow · flow+reveal+parallax · flow (silent intertitle) · pin 4.2 (bespoke draw) · flow+count · flow (live panel) · flow colophon; 7 acts ≈ 12vh | Colophon plate, smallest type on the site, contact as running text, holds | Self-drawing SVG blueprint of a real device (stroke-dashoffset off --sc-p; dims, then callouts; dwell reveals a margin note) | Technical drawing: hand-authored SVG, warm paper + one cyanotype plate | 4500 |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Chaptered editorial** grammar, with the margin folio and title-page hero.
- **Cyanotype-plate peak**: a dark drawing plate as the single inversion on a paper page.
- **The self-drawing blueprint** signature move, and the dwell-triggered margin annotation.
- **Colophon close** with the CTA as running text.
- 7 acts at ≈ 12vh with exactly one pinned act and zero scrub.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scrollcraft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
