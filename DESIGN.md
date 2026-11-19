---
name: VacayOut
description: AI-powered India travel discovery and trip planning — calm, editorial, decision-first.
colors:
  coral: "#EC6242"
  coral-hover: "#D44F31"
  coral-soft: "rgba(236, 98, 66, 0.08)"
  coral-text: "#B8432A"
  muted-strong: "#666666"
  ink: "#1C1C1C"
  canvas: "#F7F5F0"
  sand: "#EFECE6"
  cream-panel: "#FBFAF8"
  line: "#E5E2DC"
  line-subtle: "#ECEAE4"
  muted: "#777777"
  body-grey: "#555555"
  surface: "#FFFFFF"
  dark-surface: "#161616"
typography:
  display:
    fontFamily: "Lora Variable, ui-serif, Georgia, serif"
    fontSize: "clamp(2.9rem, 7vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Lora Variable, ui-serif, Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.4rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Lora Variable, ui-serif, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.14em"
  hand:
    fontFamily: "Caveat, cursive"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  gutter-mobile: "20px"
  gutter-tablet: "32px"
  gutter-desktop: "48px"
  container: "1320px"
  section-gap: "80px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.coral-hover}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  panel-cream:
    backgroundColor: "{colors.cream-panel}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: VacayOut

## Overview

**Creative North Star: "The Well-Travelled Notebook"**

VacayOut reads like a calm, well-edited travel notebook: big serif place names, generous white and warm-cream space, real photographs, and one warm coral accent that marks the next action. Pages exist to help a traveller decide — when to go, how long, where to stay, what to see — so information is short, scannable and ordered by the decision it supports, never encyclopedic.

Density is moderate: few elements per screen, clear grouping, quiet dividers. Motion is limited to a single fade-up on entry, a slow settle on hero photos, and small hover lifts; everything turns off for reduced-motion users.

**Key Characteristics:**
- Serif (Lora) for place names and section titles; Inter for everything you read or tap.
- White and warm cream surfaces with hairline warm-grey borders.
- Coral is the only accent and is reserved for actions, the current item and small highlights.
- Real, credited photographs; AI illustrations are labelled.
- Decision-first ordering: the planning facts come before the detail.

## Colors

A warm neutral world with one confident coral accent.

### Primary
- **Sunset Coral** (#EC6242): primary buttons, active tab/pill, accent word in titles, small icons in facts. Hover deepens to **Ember** (#D44F31). A soft tint (coral at 8%) backs icon chips. For small coral text (labels, kinds) use **Coral Text** (#B8432A, 5.4:1 on white) — coral itself is only 3.3:1.

### Neutral
- **Ink** (#1C1C1C): headings, body emphasis, dark buttons.
- **Body Grey** (#555555): paragraph text on white. **Muted** (#777777): captions and meta on white only (4.5:1); on cream or at 11px use **Muted Strong** (#666666).
- **Canvas** (#F7F5F0) and **Cream Panel** (#FBFAF8): page and panel backgrounds. **Sand** (#EFECE6): image placeholders.
- **Line** (#E5E2DC) and **Line Subtle** (#ECEAE4): hairline borders and dividers.
- **Surface** (#FFFFFF): cards, glass bars, section backgrounds.

### Named Rules
**The One Voice Rule.** Coral marks action or "you are here" — never large fills or decoration. If two coral things compete on a screen, one is wrong.

## Typography

**Display Font:** Lora Variable (with Georgia, serif)
**Body Font:** Inter Variable (with system-ui)
**Hand Font:** Caveat — optional, for a single short handwritten aside at most.

**Character:** an editorial serif with a plain, legible sans: the serif carries the place, the sans carries the facts.

### Hierarchy
- **Display** (400, clamp(2.9rem → 5.5rem), 0.98): hero place name only; last word may take coral.
- **Headline** (400, clamp(1.75rem → 2.4rem), 1.15): section titles, always under a coral uppercase eyebrow.
- **Title** (400, ~1.25rem serif): card titles (place names).
- **Body** (400, 0.9375rem, 1.6): paragraphs, max ~65ch.
- **Label** (600, 0.6875rem, 0.14em tracking, uppercase): eyebrows, kinds/categories, fact labels.

### Named Rules
**The Serif-for-Places Rule.** Names of places and section titles are serif; numbers, facts, buttons and UI are sans.

## Layout

A centred container (max 1320px) with 20 / 32 / 48px gutters at mobile / tablet / desktop. Sections are separated by ~64–80px and introduced by eyebrow + headline + optional one-line intro. Card grids run 1 → 2 → 3/4 columns. Sticky section menu under the site header with a sliding pill and scroll-progress bar. Content blocks are capped by usefulness: show the best few, put the rest behind "See all" or a details/summary.

**The Decision-First Rule.** Order a page by the decision it helps make: at-a-glance facts, then plans, stays and top places, then detail, practical info and FAQs.

## Elevation & Depth

Mostly flat with hairline borders; shadows are soft and ambient, used for lift on hover and for floating glass bars over photos.

### Shadow Vocabulary
- **Card** (`0 1px 3px rgba(25,25,25,.04), 0 10px 28px -12px rgba(25,25,25,.10)`): resting cards.
- **Card hover** (`0 4px 12px rgba(25,25,25,.06), 0 20px 38px -14px rgba(25,25,25,.18)`): hover lift.
- **Float** (`0 12px 40px -16px rgba(30,40,60,.35)`): glass facts bar over a hero photo.
- **Coral glow** (`0 8px 24px -8px rgba(236,98,66,.6)`): primary hero button only.

## Shapes

Gently rounded: 16px for cards, panels and photos; 12px for small media; full pills for buttons, chips and tags. Photos are cropped to fixed ratios (16:10, 4:3, 12:5 for wide heroes) with object-cover.

## Components

### Buttons
- **Primary:** coral pill, white text, 14px × 24px, coral glow; hover lifts 2px.
- **Dark:** ink pill for compact actions (section menu "Plan with AI").
- **Ghost / link:** ink text with a warm underline that turns coral on hover.
- **Focus:** 2px coral outline, 3px offset (global).

### Chips
- White pill with hairline border, ink text, 12–13px; used as links to a place's one full card, and as filters (active = ink or coral fill).

### Cards / Containers
- 16px radius, white, hairline border or card shadow, photo on top, kind label (uppercase, coral), serif name, two-line summary, one key fact.
- **Cream panels** (#FBFAF8) group facts and practical info.

### Navigation
- Sticky section menu: rounded pills, active pill slides; progress bar in coral.

### Facts bar (signature)
- Frosted white bar (80% white, blur) over the hero photo; up to four icon + label + short value cells with hairline dividers.

## Do's and Don'ts

### Do:
- **Do** show each place once as a full card; reference it elsewhere with a chip that links to it.
- **Do** credit every photograph (author · licence · source) and label AI illustrations.
- **Do** keep motion to fade-up, photo settle and hover lift, all disabled under `prefers-reduced-motion`.
- **Do** use the white haze over hero photos so dark text stays readable.

### Don't:
- **Don't** use coral for large backgrounds or more than one competing element per view.
- **Don't** repeat the same place, fact or number in several sections with different values.
- **Don't** pad pages with encyclopedic text; cut to what helps a traveller decide.
