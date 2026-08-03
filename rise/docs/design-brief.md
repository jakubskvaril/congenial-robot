# Realm — art direction brief

**For Claude Design. Version 1.0 · 3 Aug 2026**

You are art-directing a working application, not designing from scratch. The app
is built, tested and deployed; the maths, the level system and the interaction
model are settled. What is *not* settled is the illustration quality of the map.
That is the whole job.

Read section 9 first — it lists the specific things that are currently weak and
that this pass exists to fix.

---

## 1. What the product is

A personal tracker for three investment positions, dressed as a medieval map.
Instead of a chart you see your money as a **castle, walls and a horde** that
physically grow as the portfolio grows. The goal is a single feeling: *I want to
look at this, because something got built.*

Three spheres, fixed:

| Sphere | Role in the portfolio | Instrument |
|---|---|---|
| **Castle** | safety, liquidity | ČSOB pension fund |
| **Walls** | core, global equity | Vanguard FTSE All-World UCITS ETF (Acc) — VWCE |
| **Horde** | offensive satellite | Xtrackers MSCI World IT UCITS ETF 1C — XDWT |

Map composition: castle in the middle, walls in a ring around it, the horde
**outside the walls** — a camp in the field. The metaphor holds: you protect the
castle, you hold the walls, the horde rides out and comes back with plunder or
comes back beaten.

**Two of the three spheres start at zero.** The empty state is not an edge case,
it is the default state. It has to look good and it has to invite: a surveyed
ditch with stakes, and a button that says *Build the first stretch*.

The interface language is **English**. Money is in **CZK** — the positions are
funded in crowns — formatted `80,000 CZK`. Dates are `31 Jul 2026`.

---

## 2. What to produce

Two deliverables, both static:

### A. The art-direction frame
One static view of the main screen in the target style. Show a *healthy* realm —
castle around level 4, walls around level 3, horde around level 2, in profit, in
daylight. Include in the same frame:

- the illuminated cartouche with the initial and the title **REALM**, top left;
- the hover card ("cartouche") for the Castle — name, instrument, big value
  number, paid in, gain, return p.a., sparkline, and a progress bar reading
  *140,285 CZK short of Cathedral*;
- the summary table below the map, three rows plus a total, as a hand-ruled
  ledger — no boxes, no shadows;
- the marginalia in the bottom corners: archer left, merchant right.

### B. The gradation sheet
The walls in four states side by side, so the progression is legible at a glance:

`Marked Out → Palisade → Low Wall → Battlements`

Same camera, same crop, same lighting in all four. Only the structure changes.
Reference plates for these exact four states are in `reference/02` through `05`.

---

## 3. Composition

One SVG, `viewBox="0 0 1600 1000"`, isometric top-down. Layers from the bottom:

1. **Parchment** — paper grain, vignetting at the edges, frayed/burnt edges
2. **Frame** — vermilion illustrated border; in the bottom corners the
   **marginalia**: archer bottom left, merchant on a bench bottom right. They
   react to state: on a loss the merchant holds his head and his purse is
   spilled; on a gain he counts coins. *This is the signature element of the
   whole app.*
3. **Terrain** — hills, a river, woods, roads leading to the gate
4. **Horde** — camp outside the walls, bottom left near the woods
5. **Walls** — an irregular octagonal ring (not a circle, not a square)
6. **Castle** — inside the ring, on a rise
7. **Atmosphere** — clouds, birds, sunbeams, lit windows at night
8. **Cartouche** — illuminated initial and the title, top left

Fixed geometry currently in the build, if you want to match it exactly:

- ring centre `[800, 470]`, vertices
  `[790,292] [966,322] [1074,428] [1046,596] [858,656] [654,646] [528,540] [556,356]`
- gate on the bottom edge at roughly `[756, 651]`
- castle keep foot at `[800, 492]`
- horde camp centred `[292, 764]`, roughly 170×80 units
- frame band 36 units on three sides, 120 at the bottom to host the marginalia

---

## 4. Style

The binding reference is **inspiration 2, "Scatford"** (see section 8):
illuminated manuscript, strong ink outlines, flat colour areas with no
gradients, an illustrated border, marginalia in the corners. Inspirations 1
and 3 are only references for architecture and isometry, not for finish.

- Every shape carries an ink outline in `--inkoust`, 1.5–2 px,
  `stroke-linejoin: round`.
- **No gradients** except the sky.
- **No CSS shadows.** Shadows are drawn as areas of a darker shade, the way
  they are in an illustration.
- Repeated elements (soldiers, crenellations, trees) go through `<symbol>` +
  `<use>` — the scene has a hard budget of **1,500 SVG nodes** and currently
  sits at 1,172 at maximum level. Anything you add has to fit in the remainder.

### Palette — nine colours, plus nothing

```css
--pergamen:        #F2E7CE;   /* parchment ground */
--pergamen-stin:   #DFCBA4;   /* vignetting, shadows on paper */
--inkoust:         #23180F;   /* ALL outlines, all text */
--kamen:           #B9AE99;   --kamen-stin: #7C7361;
--strecha:         #B14A32;   --strecha-stin: #8A3320;
--louka:           #7C9A4A;   --les: #3F5A2F;
--voda:            #79A7B5;
--zlato:           #C79A2B;   /* level-ups and key numbers only */
--rumelka:         #D2542C;   /* frame, marginalia, losses */
```

### Typography

- **Display:** `Cinzel` — map title, sphere names, level-up seals. Sparingly,
  at large sizes, letter-spacing +0.08em.
- **Body:** `EB Garamond` — labels, chronicle, laws.
- **Numbers and dates:** `IBM Plex Mono`, tabular figures, **every number in
  the app without exception**.

That last point is a deliberate contradiction and the main visual risk:
medieval illumination plus modern monospace figures. It reads as a realm's
account book — and, more to the point, it means numbers never wobble and
columns line up. **Do not set numbers in a serif, however much more "in style"
it would look.**

---

## 5. The game system, so the illustration serves it

Two independent axes. This is the core of the concept and the illustration has
to make both readable.

**Absolute value in CZK builds structures.** Eight levels per sphere. More
money = bigger, taller, better fortified.

**Percentage return drives prosperity and small details.** Higher return = more
life, light, detail, banners.

### Levels

| Lvl | Threshold | Castle | Walls | Horde |
|---:|---:|---|---|---|
| 0 | 0 | Bare Plain | Marked Out | Empty Camp |
| 1 | 1 | Timber Keep | Palisade | Scouts |
| 2 | — | Stone Keep (80k) | Low Wall (40k) | Company (20k) |
| 3 | — | Fortified Manor (150k) | Battlements (80k) | Archers (45k) |
| 4 | — | High Tower (250k) | Portcullis Gate (160k) | Cavalry (80k) |
| 5 | — | Cathedral (400k) | First Cannon (250k) | Siege Engines (150k) |
| 6 | — | Gilded Dome (600k) | Artillery (400k) | War Drums (250k) |
| 7 | — | Royal Seat (1M) | Second Ring (600k) | Army (400k) |

Inside a level things still grow continuously: wall height interpolates,
crenellation count is `min(48, floor(value / 2000))`, figures are
`min(40, floor(value / 5000))`. **So even a 5,000 CZK contribution is visible
on the map.** Keep that legible — it is the whole reward loop.

### Weather drives from percentage return

| Return | Sky | Palette | Details |
|---|---|---|---|
| below −10% | storm clouds, rain | saturation 0.7, cooler | flags drooping, empty roads |
| −10 to 0% | overcast | saturation 0.85 | fewer banners |
| 0 to +10% | clear | base | ordinary traffic |
| +10 to +25% | sunbeams | greens richer | carts on the roads, a market |
| above +25% | golden hour | gold accents | fireworks on level-up |

### Small details — one per percentage point

Each sphere has an array of **30 predefined details** at fixed coordinates,
revealed in a fixed order: `count = clamp(floor(return_pct × 100), 0, 30)`.
Deterministic — the same return always draws the same map. When the return
falls, details disappear from the end, and that is intentional: it is
immediately visible.

Castle details: a lit window, a pigeon on a roof, a pennant, a barrel by the
gate, a tree, a statue. Walls: a torch in a bracket, a shield hung on the
battlements, a sentry, a basket of stones, a ladder, a flag on a bastion.
Horde: a tent, a fire, a horse, a weapon pile, a cart, an anvil, a standard.

Figure style: **Age of Empires II** — small, readable silhouettes, not detailed
characters.

---

## 6. The copy deck

Every user-visible string, so nothing has to be invented or guessed. Tone:
period flavour, but plain — no folksy fantasy. Short and factual. Empty states
are a call to action, never an apology.

### Map screen

| Element | Copy |
|---|---|
| Title | `REALM` (illuminated `R`) |
| Subtitle in the cartouche | one of the weather lines below |
| Weather | `Storm clouds over the realm` · `Overcast` · `Clear skies` · `Sunbeams, carts on the roads` · `Golden hour` |
| Link to screen 2 | `Chronicle & ledger →` |
| Table columns | `Sphere` · `Instrument` · `Paid in` · `Value` · `Gain` · `%` · `p.a.` · `Total` |

### Hover cartouche

```
Castle
ČSOB pension fund

259,715 CZK

Paid in                     147,217 CZK
Gain          +112,498 CZK (+76.4%)
Return p.a.                      +9.0%

[sparkline, 90 days]

High Tower                   level 4/7
[▓▓░░░░░░░░░░░░░░]
140,285 CZK short of Cathedral

Price as of 31 Jul 2026 [over 7 days old]
```

Empty-state variants, one per sphere:

| Sphere | Line | Button |
|---|---|---|
| Castle | `The castle treasury is empty.` | `Lay in the first sum` |
| Walls | `The Walls are only marked out.` | `Build the first stretch` |
| Horde | `The Horde awaits orders.` | `Send out the first troop` |

### Level-up seal

```
THE WALLS RISE
Battlements
```

Variants: `THE CASTLE RISES` · `THE WALLS RISE` · `THE HORDE GROWS`

### Chronicle lines

```
In the year of our Lord 2026, on the 31st day of July — 80,000 CZK laid in the castle treasury.
In the year of our Lord 2026, on the 14th day of August — 40,000 CZK spent on the building of the walls.
In the year of our Lord 2026, on the 14th day of August — The Walls rise — Low Wall.
```

Contribution verbs by sphere: `laid in the castle treasury` ·
`spent on the building of the walls` · `handed to the Horde for the campaign`.

### Chronicle & ledger screen

Sections, in order: `Holdings` · `Add a contribution` · `Contribution history` ·
`Prices & rates` · `Laws of the Realm` · `Projection` · `Chronicle` · `Data`.

The five Laws of the Realm, with live state (`✔` / `⚠` / `✖` / `·`):

```
The Walls are funded with 26,700 CZK a month for 6 months     4 tranches left
Horde contributions are capped at 45,000 CZK       25,000 CZK / 45,000 CZK
Total IT exposure at or below 40%                                    28.3%
Accumulating share classes only                                        2/2
Three-year holding test, per tranche                           31 Jul 2029
```

Footer, verbatim:

> The Realm shows figures and dates from your own entries. It gives no tax or
> investment advice and suggests no trading actions.

---

## 7. Reference plates from the running app

These are screenshots of the current build. They are the honest baseline — this
is what the art direction has to beat, not what it has to match.

| File | What it shows |
|---|---|
| `reference/01-hero-map.jpg` | full screen, healthy realm, hover cartouche open, ledger below |
| `reference/02-walls-0-marked-out.jpg` | walls level 0 — stakes and a scored ditch |
| `reference/03-walls-1-palisade.jpg` | walls level 1 — timber palisade |
| `reference/04-walls-2-low-wall.jpg` | walls level 2 — stone wall at half height, two bastions |
| `reference/05-walls-3-battlements.jpg` | walls level 3 — full height, crenellations, four bastions |
| `reference/06-empty-state.jpg` | the default state: castle only, two spheres at zero |
| `reference/07-full-realm.jpg` | everything at level 7 — the node budget ceiling |
| `reference/08-loss-storm.jpg` | loss: storm, rain, desaturation, merchant holding his head |
| `reference/09-night.jpg` | night: lit windows, torches, stars |
| `reference/10-chronicle.jpg` | the second screen in full |
| `reference/11-mobile.jpg` | 390 px — map scales by viewBox, table flips to cards |

---

## 8. The three original inspirations

The three source images were supplied as chat attachments and are **not bundled
in this repo** — they were never written to disk. Drop them into
`docs/reference/` under these exact names and this brief will link them
correctly:

| Expected file | What it is |
|---|---|
| `inspiration-1-walled-city.jpg` | *Architecture and isometry reference.* A dense walled medieval town seen from a high three-quarter angle on a parchment ground. Rectangular curtain wall with round corner towers, tightly packed orange-tiled houses, a central cathedral with a gilded dome and a tall spire, a domed rotunda on a plaza, tree-lined avenues, gatehouses on each side, open countryside and a separate chapel outside the walls. Painterly, warm, heavily detailed. **Use for:** massing, roof rhythm, how a gilded dome reads at small scale. **Do not use for:** finish — it is too painterly and too rendered. |
| `inspiration-2-scatford.jpg` | **The binding reference.** A hand-drawn illustrated town map titled "Scatford" with a large illuminated drop-cap `S` in a decorated box, top left. Vermilion patterned border framing the whole sheet. Flat colour areas, strong dark ink outlines, visible line hatching for texture. An irregular walled town with a castle on a rock above it, a river, rolling green hills, stylised clouds. **Marginalia in the bottom corners: an archer bottom left, a figure in period dress bottom right.** **Use for:** everything — line weight, flatness, border treatment, the cartouche, the marginalia. This is the target. |
| `inspiration-3-castle-moat.jpg` | *Architecture reference.* A single concentric castle on an island in a circular moat, drawn in clean isometric line art with flat grey stone and blue-grey slate roofs. Two long timber causeways, corner drum towers with pennants, an inner keep, outbuildings and woodland outside. Crisp, technical, uniform line weight. **Use for:** how a moat and a concentric ring read from above; tower and gatehouse construction. **Do not use for:** palette — it is far too cool and grey. |

If you only have room for one, use **inspiration 2**.

---

## 9. What is currently weak — the actual job

Honest assessment of the build in the reference plates. In priority order:

1. **The terrain reads as a flat pale-green wash.** It is one large translucent
   shape with a few lens-shaped hills dropped on top. It looks like a board
   game, not an illuminated manuscript. It needs drawn texture: hatching, field
   boundaries, a varied coastline to the green, parchment showing through more
   at the edges. **This is the single biggest problem.**
2. **The wall's outer face is one large flat grey band.** No coursing, no stone,
   no weathering. It reads as extruded geometry because that is exactly what it
   is. It needs drawn stonework that survives at small scale.
3. **The frame ornament is a repeated teardrop.** It reads as a placeholder.
   Scatford's border is a real repeating illuminated motif — that is the bar.
4. **The cartouche is a plain tag shape**, not an illuminated panel. The
   initial sits in a flat gold square with no vine-work beyond two stubs.
5. **The empty state is very quiet.** The horde at level 0 is a dashed ellipse
   and a cold fire pit — technically correct per spec, but it barely registers.
   It should still invite.
6. **Roads and the river are dashed strokes**, not drawn paths with banks and
   verges.

What is already working and should be preserved: the ring/keep/camp composition,
the marginalia concept and their state reactions, the ledger typography, the
level gradation legibility, the weather system.

---

## 10. Constraints — hard

- **Inline SVG only.** No raster images, no AI-generated PNGs of the map. It has
  to animate, recolour and scale per level. Anything you deliver has to be
  reproducible as hand-composed SVG.
- **No 3D.** It kills both the illustrated character and the performance.
- **1,500 SVG nodes** for the whole scene, 60 fps on a laptop. Repeated elements
  through `<symbol>`/`<use>`.
- **Animate `transform` and `opacity` only.**
- `prefers-reduced-motion: reduce` must remove all ambient loops and the camera
  move. Not optional.
- Responsive from 360 px. The summary table is the **accessibility equivalent of
  the map** and must carry every figure the map visualises.
- **No generic dashboard components** — grey cards, `border-radius: 8px`,
  `box-shadow`, blue accents. None of that belongs here.
- **No advice.** Nothing anywhere may suggest what to buy or sell. This is
  enforced by an automated check that scans both screens for instruction verbs,
  so the copy has to stay clean of them — the app's own disclaimer is worded to
  avoid them too.
- No confetti, no emoji, no sound by default.
