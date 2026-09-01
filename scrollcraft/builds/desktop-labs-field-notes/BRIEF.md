# BRIEF — Desktop Labs · Field Notes

**Self-authored, not interviewed.** This run is fully autonomous (cloud agent,
no reachable human mid-task). The eight answers below are written in the brand's
voice, grounded in the site's existing copy ("I build cool things & a
respectable amount of nonsense", "DIY engineer mixing hardware, software &
design", the OpenPage e-reader build log) and the owner's one standing
instruction: "you have full freedom of Developer design here go crazy go wild
be unique."

---

## Step 0: the eight answers

1. **Vibe in three to five words, plus references.**
   "Workshop notebook, earnest, a bit ridiculous." References: a patent drawing
   plate, a cyanotype blueprint, the inside cover of a field notebook.

2. **The scroll journey, in their words.**
   "First they should get that a person makes things here, not a studio. Then
   why I bother. Then show them one real build properly, not a card grid, the
   actual thing. Then the honest numbers behind it. Then ask them what I should
   build next, that idea box matters to me. End quiet, with a way to write to
   me."

3. **The energy curve.**
   "Calm open, warm middle, one loud moment when the build shows up, then wind
   right down. The end should feel like closing a notebook."

4. **Feel, stage by stage, and the ONE moment.**
   Stage feelings are the curve below. The one moment: "the page goes dark blue
   like a blueprint and my e-reader draws itself while you scroll. That is the
   thing people should tell someone about."

5. **One thing no site they have seen does.**
   "Scrolling literally draws the schematic of a thing I actually built, with
   the dimension lines and callouts arriving like someone is drafting it in
   front of you."

6. **How far from premium-minimal.**
   Editorial, with one playful streak. Not premium-minimal (this is a human's
   bench, not a luxury brand), not brutalist, not maximalist. A printed feature
   about a workshop.

7. **One unbroken world, or distinct scenes?**
   Distinct scenes. Chapters, like a zine or a lab notebook. Hard page turns
   are honest here; a continuous flight is not how a notebook reads.

8. **What assets do they already have?**
   None. No photography, no footage, no logo files in the repo. One real build
   with real specs (OpenPage on the LilyGo T5 4.7" S3). No KIE key in the
   environment, so nothing is generated; the world must be authored in markup.

---

## The feeling curve

One line per act: the emotion, then what on screen causes it.

```
1  Curiosity    a title page, ink on warm paper, a contents block like a zine
2  Recognition  the manifesto in his own words, a pull quote in italic serif
3  Hush         the page hard-cuts to a near-empty Prussian-blue plate  (authored silence)
4  Delight      the e-reader draws itself under the reader's hand, callouts land   (PEAK)
5  Confidence   the real numbers count up inside a spec sheet, no adjectives
6  Belonging    the idea box asks them what to build next, and it is live
7  Calm         a colophon in the smallest type on the site, the ask is one line
```

No two adjacent acts share a feeling. The hush (act 3) exists so the peak has
something to arrive from.

## The peak

> "The screen turned into a blueprint and his e-reader drew itself while I
> scrolled, down to the dimension lines."

Lives in act 4 (Chapter 02 · The Build). It gets the largest span on the page
by a visible margin (4.2vh pinned; nothing else is pinned at all), the only
dark ground on the page, and the silence of act 3 in front of it.

## The completed tell-someone sentence

> "It's the site where scrolling draws the blueprint of the thing he built."

The signature move and the tell-someone sentence are the same moment, by
design.

## Authored silence

Act 3: the Chapter 02 intertitle plate. Deliberately near-empty (chapter folio
line only, on the first dark ground of the page). The verification pass should
read stillness there as intent. It is a flow act, so the dead-scroll detector
excludes it by design; noted here so nobody "fixes" it.

---

## Step 1 answers

1. **What is this, who is it for?** A personal maker portfolio (Desktop Labs).
   For people who might use, copy, or commission the builds, and for the owner's
   future collaborators.
2. **What must the visitor believe by the end?** "This person really builds
   things, carefully, and I could be part of the next one."
3. **What does the visitor do next?** Drop an idea in the Idea Box. One label,
   used everywhere: **"Drop an idea"**. (The mailto in the colophon is running
   text, not the CTA, per the grammar.)
4. **What do they already have?** One real build log with real figures. Nothing
   visual. Real numbers available: 4.7" display, 540 × 960 portrait buffer, 16
   grayscale levels, ESP32-S3, 16 MB flash, 8 MB PSRAM.
5. **Art direction.** Technical drawing (worlds.md §8), the one non-photographic
   world that reads premium because it is honest about being a diagram. Realized
   as hand-authored SVG rather than generated raster, which is more honest
   still: the drawing is real markup of a real device. Ground: warm paper.
   Peak chapter inverts to a cyanotype plate (Prussian blue, bone lines).

## The journey

```
1  Arrival      a title page: this is a person's notebook, not a product site
2  Conviction   why he builds, in his words
3  Turn         the page goes dark: something is about to be shown properly
4  Proof        the build, drawn to scale in front of them          (peak)
5  Substance    the numbers that make it real
6  Invitation   they get to point the workshop at the next thing
7  Sign-off     the colophon, and one quiet way to reach him
```

## Grammar: chaptered editorial (§2.2)

Why the other seven lost:

- **Filmic one-shot**: needs scrub video as its anchor; no footage exists and
  none can be generated. Also carries the burden of proof now.
- **Live surface**: the product is physical builds, not software; there is no
  surface to run.
- **Continuous world**: requires worldflight legs (video); no assets, and a
  notebook is scenes, not one place (interview Q7).
- **Typographic poster**: viable with no assets, but it throws away the one
  strong asset that does exist: a real device that can be drawn. The blueprint
  needs a chapter structure to sit in.
- **Gallery / catalog**: one finished build is not a collection; a gallery of
  one object is an apology.
- **Split stage**: there is no two-sided argument here.
- **Rhythmic cutlist**: bans pinning and holds; the peak is a held drawing.
  Wrong energy for "calm open, wind down close".

Grammar consequences honored: no fixed nav bar (a margin folio instead, chapter
number and title updating as chapters pass); the hero is a title page with no
media above the fold; hard ground cuts between chapters, no continuous drift;
no magnet, no spotlight, no pinned crossfade type act; the close is a colophon
with the contact as running text.

## Signature move

**The self-drawing blueprint.** A hand-authored SVG technical drawing of the
OpenPage e-reader whose strokes are drawn by scroll (stroke-dashoffset driven
from the act's `--sc-p` in page JS, staggered by part: body, screen, controls,
ports), then dimension lines extend, then leader callouts land with real specs.
One embodiment seasoning on top: hold still mid-drawing for a moment and a
small margin annotation appears ("rev. B. rev. A is a coaster now."). Bespoke
`data-lab-draw` attributes, engine untouched. Publishes `data-sc-verify-state`
so the harness can see the timeline.

## Fingerprint gate

`/workspace/scrollcraft/FINGERPRINTS.md` is empty (first build in this
registry). Nothing to clear; the row is appended after shipping.

## The score

| # | Beat | Act | Device | Why this one |
|---|------|-----|--------|--------------|
| 1 | Arrival | Title page | `flow` + stagger | A title page is read, not performed; type on paper |
| 2 | Conviction | Ch 01 Manifesto | `flow` + `reveal` (rule wipe) + `parallax` (margin ornament) | Prose carries it; the wipe is the page turn |
| 3 | Turn | Ch 02 intertitle | `flow`, near-empty dark plate | Authored silence before the peak |
| 4 | Proof (PEAK) | Ch 02 The Build | `pin` (span 4.2) + bespoke draw | The drawing needs the frame held while the hand draws it |
| 5 | Substance | Ch 03 The Numbers | `flow` + `count` on real figures | Numbers that land as they arrive; every one is real |
| 6 | Invitation | Ch 04 Idea Box | `flow` + live giscus panel | The panel is the content; motion would be noise |
| 7 | Sign-off | Colophon | `flow`, smallest type | The close resolves and holds |

Families used: flow+in, reveal, parallax, pin, count, plus the bespoke draw.
Five kit families. One pinned act, zero scrub. The editorial grammar's base
texture is flow, per its leans-on list; variety inside the flows comes from
reveal, parallax, and count. Total length ≈ 11–12 viewport-heights (giscus
panel height varies), outside the 13.6–13.8 fingerprint band.

Page ground stops (hard cuts, one warm family plus the one inverted plate):
paper #F6EEDF → deeper paper #EFE4CE → Prussian blue #14224E (ch 02 only) →
paper #F6EEDF → paper #EFE4CE → ink #1B1710 (colophon).

Accent: one hue, two stops (permitted for hard-cut light/dark pages):
cobalt #2743E0 on paper grounds, ice #A9BCFF on the dark plates.
Type: Archivo (display) + Newsreader (text). Two families.

---

## Feel check (post-verification, cold pass)

Felt, one word per act, from a cold top-to-bottom scroll (recorded), before
rereading the curve above: tidy · warm · held-breath · satisfying · sure ·
invited · settled.

Diff against the intended curve: aligned act for act. The peak read as the
peak on the contact sheet (largest visual change on the page, largest scroll
span) and had the silent intertitle in front of it. One honest deviation: act
6's "belonging" is contingent on the giscus repo/category IDs being filled in
(pre-existing setup step, see GISCUS-SETUP.md); until then the panel shows only
a sign-in prompt, which reads as "invited" but not yet "belonging". No
structural change was made from the feel pass.
