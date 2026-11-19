# Convene design system

This document covers the design system shared by the landing page (`/`) and the workspace (`/app`). Both read the same four colors and two fonts.

Principle: the page should look like the product. Calm, precise, auditable. Real photography, real product content, tabular numbers, no decoration without meaning.

## Colors

Four colors. Tints come from opacity or mixing these, nothing else.

| Token | Hex | Role |
| --- | --- | --- |
| `--ink` | `#071B2B` | Wordmark, all headings, all small text, dark sections |
| `--teal` | `#167D8D` | Primary buttons, large numbers, chart strokes, ring arcs, links with underline |
| `--mist` | `#B9E4E8` | Tinted panels, badges, highlights, ring tracks, section washes |
| `--paper` | `#EEEEEE` | Page background, light text on dark |

Semantic status color, used only inside product mockups: `--status-rejected` `#B4432F` (Rejected pill). Accepted uses Teal.

Tailwind theme names: `ink`, `teal`, `mist`, `paper`, `rejected`. The workspace reads the same palette through semantic names (`background`, `foreground`, `card`, `surface`, `muted`, `border`, `danger`) mapped onto it in `app/globals.css`. The old `--accent`, `--highlight`, `--success` and `--ws-ink` variables are gone.

Distribution on the landing page: Paper page and nav, deep blue hero panel (Ink to Teal), Ink audit band, Teal CTA band, Mist wash behind "How it works", bento and cards alternating Mist, Ink, Teal and white.

Contrast rules:
- Teal on Paper is about 4.2:1. Never use Teal for small body text on Paper. Small text is Ink.
- White on Teal passes and is used for buttons and the CTA band.
- On Ink and over photos use Paper or Mist text. Fix legibility with the scrim, never by changing the type color.
- Hero text is Paper (heading), Mist (subline). Measured at the brightest pixel behind each text box: at least 8:1 at 390, 768 and 1024, and 9:1 at 1280 and 1440. Fix legibility with the gradient stops and photo mask, never the text color.

## Typography

Loaded with `next/font/google`, `display: swap`, in `app/layout.tsx`.

| Use | Font | Weight |
| --- | --- | --- |
| Wordmark, hero heading, section headings | Libre Baskerville | 700 |
| Subheadings, buttons | DM Sans | 600 |
| Body | DM Sans | 400 |
| Navigation, labels, numbers, tables | DM Sans | 500 |

Numbers and tables use `font-variant-numeric: tabular-nums` (`.tnum`). Hero heading: `clamp(2.75rem, 6.2vw, 5.75rem)`, leading 0.98, tracking -0.025em. Baskerville headings are sentence case, never all caps. No other weights or fonts.

## Shape, space, shadow, motion

- Radius scale: 10px small (chips, inner rows), 20px cards, 32px large panels, full pills for tags and buttons. Do not mix.
- 8px spacing scale. Section padding 96px (128px at md and up). Max content width 1240px; the hero panel is 1392px and inset 24px from the page edge, full bleed on mobile.
- One shadow for floating cards: soft, Ink-tinted, low opacity (`--shadow-float`). No glow, no neon, no colored shadows.
- Motion is subtle, staged and plays once. See the Motion section below for the tokens and rules.

## Photography

Real photographs only, from Unsplash under the Unsplash License. Credits live in `public/images/CREDITS.md` (not shown on the page).

- Hero: wide, calm, documentary, real event setting (an empty auditorium), no readable signs, logos or text, no dominant faces. Used at 2400px wide.
- Tile: a closer detail in the same family (hands, notebook, laptop). Portrait.
- Never use photos of people as team members, customers or testimonials. No AI imagery.
- Treatment, applied in CSS so the file stays a clean photograph: `saturate(0.35)`, a Teal layer at 85% with `mix-blend-mode: color`, then an Ink layer at 15% with multiply. It reads blue but keeps full tonal detail, so it is still a photograph and not a flat duotone.
- Placement: right side of the hero panel on desktop (66% wide), lower half on mobile. A mask fades its inner edge (transparent for the first 30%, full strength by 74%) so the photo dissolves into the gradient and never sits behind the headline.
- Delivery: `next/image`, explicit `sizes`, blur placeholder, `priority` on the hero only.

## Hero

The hero panel (32px radius, inset 24px from the page edge, full bleed on mobile) is a deep blue surface: `linear-gradient(100deg, Ink 0 to 34%, Teal 100%)` on desktop, a vertical Ink to Teal gradient on mobile (`.hero-surface`). The nav stays on Paper above it.

- Depth: a few Mist hairline arcs and contour lines at 6 to 11% opacity behind the cards (inline SVG in `hero.tsx`). No glow, no blur orbs, no neon.
- Type: label pill "Inbox → Plan" (Mist background, Ink text), H1 "Messages in. Plan out." in Paper on two lines (`clamp(2.75rem, 5.8vw, 5.25rem)`), subline in Mist. There is no tagline line under the buttons.
- Buttons: primary is Paper with Ink text (strongest contrast on the blue), secondary is outlined Mist with Paper text.
- Cards: plan, message and rejected cards stay white so they pop. Each shows a small "Sample" or "Sample plan" label. The trace chip sits in the gap above the message card (stacked below the cards under 1280px) and must never overlap the ring, numbers or card text; check at 1440, 1280, 1024, 768 and 390.
- Nav: desktop links from 1024px up, hamburger drawer below.

## Footer

One row on Ink with a hairline on top: the links Privacy, Terms and Conditions, Help and Contact on the left, and "© 2026 Convene" on the right (stacked under the links on mobile). No wordmark, no description, no buttons, no photo credits line. The four links point at `/privacy`, `/terms`, `/help` and `/contact`; those pages are not built yet, so they currently 404. Sample data is labeled where it appears (hero cards, bento chart, sample plan section) rather than in the footer. The page order is nav, hero (with the bento row overlapping its bottom edge), how it works, audit, sample plan, CTA band, footer. There is no separate problem section.

## Sample plan header

The "Sample plan" pill sits on its own line. Below it is a row: below 1024px everything stacks (pill, heading, description, button). From 1024px the row is a two-column grid with `align-items: start`. The first column is sized to the heading, `11 x` the heading font size (`--h2`), so "What a finished plan" stays on line one at 1440 and 1280 with a natural wrap (below 1280 it wraps as "What a finished / plan looks like."). The second column is at most 420px (460px from 1280px) with a 72px gap, and holds the line "Budget, schedule and checks, all built from eight sample messages." in DM Sans 400, Ink, line-height 1.4, `text-wrap: balance`, max-width 460px. Its size is `--lead`, `clamp(1.25rem, 0.9rem + 1vw, 1.5rem)`: 20px at 390, 22px at 768, 24px from about 1024. The "Try it with your own messages" button sits 24px under the line and keeps its style.

Alignment: the x-height line (top of the lowercase letters) of the right line meets the x-height line of the heading's first line, not the cap height. The right block gets `margin-top: var(--lead-offset)`, which is `--h2 x 0.3267 - --lead x 0.54375`. Those two constants are the distance from a line box top to the x-height line in em, measured from the fonts in the browser (Libre Baskerville 700 at line-height 1.02, DM Sans 400 at line-height 1.4) and checked on rendered pixels: the two lines differ by 1px or less at 1440, 1280 and 1024. If the heading or lead font size, weight or line-height changes, re-measure and update the constants. The right block is taller than the heading's first line and extends downward inside the row, so the gap to the cards is unchanged. The heading is at least 56px from 1024px up. Below 1024px no offset is applied. No button row between the header and the cards.

## CTA band visual

The Teal band is two columns from 1024px: text and the "Open workspace" button on the left (button directly under the paragraph), a composed visual on the right (`cta-visual.tsx`). It reuses the hero's `MessageCard` and `RejectedCard`: the Roman Urdu card (chip "Replaces Msg 3", because message 4 supersedes message 3) and the rejected caterer card, both labeled Sample, offset and rotated at most 1.5 degrees. Two 2px Mist lines run from them into a white "Current plan" card (Rs 597,400, a small 92% ring at its top right, chip "Sources: Msg 1, 2, 4 to 7"). Faint Mist contour circles sit behind. The lines are Mist, not Teal, because the band itself is Teal. The cards slide in from the left, the lines draw and the plan card settles in last (see Motion). The lines are 2px Mist elbows drawn with `scaleX` and `scaleY`. Below 1024px the visual stacks under the text; at 390 only the first message card and the plan card show.

## Motion

One shared system drives every animation on the landing page. Nothing loops, bounces or scrolls the page. Only `transform`, `opacity` and SVG `stroke-dashoffset` change, so layout never shifts (CLS 0.0000 at 1440 and 390).

Timing tokens (CSS variables in `app/globals.css`):

| Token | Value | Use |
| --- | --- | --- |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Every transition, no overshoot |
| `--dur-short` | 400ms | Short reveals |
| `--dur` | 600ms | Default reveal (opacity and transform) |
| `--dur-long` | 700ms | Bars, lines and ring draws |
| `--dist` | 16px | Default entrance distance (max) |
| `--dist-sm` | 8px | Small entrances (chips, totals) |
| `--step` | 100ms | Stagger step; steps are 80 to 120ms |

Primitives:
- `Reveal` (`reveal.tsx`, client): wraps an element, plays once when it is 20% in view (root margin -6% at the bottom), then stops observing. Props: `delay` (ms after it enters view), `x`, `y` (start offsets), `as` (div, span, li).
- `CountUp` (`count-up.tsx`, client): counts from 0 to the value once, 700ms, ease-out. The final text is always in the DOM and a hidden sizer reserves its width, so digits can change without shifting layout. Uses tabular-nums.
- Children of a Reveal read `--shown` (0 before, 1 after): `.grow-x`, `.grow-y`, `.grow-y-up` scale bars and lines (`transform-origin` left, top or bottom), `.ring-draw` animates `stroke-dashoffset` (delay per ring via `--ring-delay`), bars stagger with `--i` (90ms each) after `--bar-base`.
- `.lift` and `.btn-lift` (hover only, `@media (hover: hover)`): cards rise 3px with a slightly stronger shadow, buttons rise 2px with a palette color shift, 200ms. They use the individual `translate` property so they never fight a reveal.

Rules:
- Hidden-until-revealed styles apply only under `html.js`. An inline script in `app/layout.tsx` adds the class, so with JavaScript off everything is visible.
- `prefers-reduced-motion: reduce` shows the final state immediately: no transforms, no transitions, no count-up, no hover motion.
- Each animation plays once. Scrolling back up never replays it.

Sequences (ms after the section enters view, unless noted):
- Hero (on load): nav 0, pill 100, H1 line one 200, line two 300, subline 450, buttons 550, photo and contours fade 700, plan card 900 (ring draws from 1200, Rs 597,400, 92% and "6 of 6" count up), message card 1020, rejected card 1140, trace chip 1260, scroll ring 1380.
- Bento row: tiles 0, 100, 200, 300; chart bars grow from 500 (90 apart); the 6 and the chart figures count up.
- How it works: heading 0, cards 150, 270, 390; arrow beads 400 to 520 (after their card); inner visuals after their card; the six checks stagger 80 apart.
- Audit: heading 0, text 100, stats 200 (count up), trace panel 150, rows 350 + 110 each, total 800, and a trace rail that draws upward from the total back to the first message from 600.
- Sample plan: pill 0, heading 100, description 220, button 320, budget card 400 (ring draws at 700), schedule card 550 (bars grow from 800, 90 apart, then the caption and build bar fade in at 1400), line items 700.
- CTA band: heading 0, text 100, button 200; message cards slide in from the left (16px) at 150 and 270; Mist lines draw from 450; the plan card settles at 1000 (figure counts up, ring draws at 1300), its chip at 1250.
- Footer: a single fade.

## Components (`components/landing/`)

`nav` (sticky, transparent then Paper blur on scroll, drawer on mobile), `hero`, `product-cluster` (plan card with budget ring, message card, rejected card, trace chip, scroll ring), `bento-stats`, `how-it-works`, `audit-band`, `sample-plan`, `cta-band`, `cta-visual`, `reveal`, `count-up`, `footer`, plus `ui` (wordmark and mark, pills, message chips, ring, arrows, `SAMPLE` data) and `blur` (generated placeholders).

All product visuals are HTML, CSS and SVG. Sample figures come from `samples/sample_pack.txt` (177 people, Hall A, Rs 597,400 of Rs 650,000, 17 judges, 6 checks) and are always labeled "Sample plan" or "Sample". The trace token counts other than "Call 1 · 2,413" are illustrative.

## Voice

Plain, specific, honest. State what the product does and show it. Sentence case. No em dashes, no exclamation marks in copy, no buzzwords.

## Ban list

- Purple, indigo or blue-violet gradients, gradient text, glow blobs, glassmorphism as a default, neon or colored shadows.
- Emoji. Icon-in-tinted-square feature tiles. Identical three-column icon grids as the main structure.
- AI-generated images, cartoon illustrations, fake dashboard screenshots, fake avatars, logos, testimonials, ratings or user counts.
- Generic corporate stock photography.
- "Supercharge", "seamless", "revolutionize", "unlock", "empower", "next-gen", "AI-powered" as a headline.
- Centered-everything layouts, uniform spacing without hierarchy, every card the same size, decoration with no meaning.
- Stock component-library looks. Everything is composed from the tokens above.

## Workspace

The workspace (`app/app/page.tsx`, `components/landing/plan-preview.tsx`) uses the same palette, fonts, radii and shadow as the landing page. Only visuals and animation wiring changed; handlers, state, API calls and meaningful text are untouched. The older components under `components/app`, `components/charts`, `components/report`, `components/trace` and friends are not used by `/app`; their color classes were renamed to the new tokens so nothing references the removed variables.

Shell
- Sidebar: Ink background, the Convene mark and "Inbox → Plan" in Libre Baskerville 700 (Paper), "Back to site" is an outlined pill (40px, 1px Mist border at 40%, Paper text in DM Sans 500, a 2px-stroke inline SVG arrow) the same width as "New plan" and 12px above it; on hover (pointer devices only) it fills Mist with Ink text over 200ms, and its focus ring is a 2px Paper outline with offset. The mobile bar uses the same pill, labelled "Back to site". "New plan" is a Teal pill (Mist while that screen is open). Nav items are Paper at 80% with the active item a Mist pill with Ink text; the red count badge is the rejected status color. Download links are Paper at 80%. The "AI used" line sits at the bottom in Mist under a hairline. Space for the download links is always reserved so the footer never shifts when a plan loads.
- Top bar: white, hairline bottom border, 80px tall (64px below 768px). The screen title is Libre Baskerville 700 in Ink at 26px (24px below 768px), the same on every screen and always smaller than the heading in the main area. The "Questions for you" button is an Ink pill with a Mist count badge.
- Mobile (below 768px): the sidebar becomes a horizontally scrolling Ink bar with the same pill styling.
- Main: Paper background, content max 896px.

Cards and type
- Cards are white, 20px radius (32px for the overview hero), one soft Ink-tinted shadow, no border. Highlights use Mist panels. Stat tiles alternate Ink, white, Teal and Mist so the row is not four identical cards.
- Page titles and the overview headline use Libre Baskerville 700. Everything else is DM Sans: 600 for card titles and buttons, 400 body, tabular-nums on every number. The only monospace is the raw model input and output inside an open AI call.
- Large numbers (budget percentage, stat values, ring percentage) are Teal. Small text is Ink or the muted tone (Ink at 72% over Paper, 6.5:1). Small text is never Teal on Paper.

Buttons and controls
- Primary: Teal with white text, hover Ink. Disabled: Mist background with Ink text at 70% (about 5:1), not grey. Secondary: outlined Ink pill. Tabs: Ink pill when active, white when not.
- The paste card is a structured input tool: white body, 2px Mist border, 20px radius, the soft shadow, and a 2px Teal ring on `:focus-within`. A row of format hints (WhatsApp, Email, Memo, Urdu, Roman Urdu) sits at the top as small Mist-at-40% pills in DM Sans 500; they are plain `span`s, `aria-hidden`, with no hover, pointer cursor or focus. An attached-file chip sits below that row. The textarea is transparent with no inner border. The bottom action strip is full width, Mist at 40% with a hairline Mist top border and the card's bottom corners, holding "Attach files" (left) and "Make the plan" (right). The disabled "Make the plan" keeps the Mist fill and Ink at 70% text (5.6:1) and adds a 1px inset Ink ring so it does not blend into the strip. At 390px the hints wrap to two lines and both controls stay on one row.
- The paste box shows its focus ring on the card (2px Teal ring) instead of on the textarea. Inputs use a Teal border and ring on focus. Every other control uses a 2px Teal outline (Mist on the Ink sidebar), set under `.ws` in `globals.css`.
- Status chips: used is Mist with Ink text, not used is the rejected red on a light red tint, replaced and ignored are the pale Mist surface with muted text. The "Message N" source chips are Mist and turn Teal on hover.

Charts
- Schedule bars: Teal for build, Ink for judging, Mist for meals and breaks, 50% Teal for opening and closing, on a pale Mist track. Budget and line-item bars are Teal on a Mist track and turn the rejected red when over budget. The budget ring is Teal on a Mist track.

States
- Empty states are a pale Mist surface panel with centered muted text. The infeasible banner and failed checks use a red border on a white card. TBA values are muted text. "Planning…" is the disabled Mist button with a spinner and `aria-busy`. The drawer shows open, answered (Mist chip) and TBA (pale chip) questions.
- The new-plan page has a quiet "what you will get" preview on the right (`components/landing/plan-preview.tsx`): one white 20px card at 90% opacity with a "Sample" label, a 92% Teal-on-Mist ring, "Rs 597,400 of 650,000", "6 of 6 checks" and a six-bar schedule strip, with a plain Mist rounded rectangle peeking out 14px behind it. It reuses `Ring`, `SAMPLE` and `SAMPLE_BLOCKS` from the landing page. It is decorative: `aria-hidden`, nothing focusable, no hover lift. Full size from 1280px, 224px wide from 1024 to 1279px, hidden below 1024px so the paste card takes the full width.

Motion
- Uses the landing page's `Reveal` and timing tokens. Cards fade and rise 12px when a screen opens (stagger up to about 400ms), the overview ring and the budget and schedule bars draw once with the shared `--shown` approach (`stroke-dashoffset` and `scaleX`), and switching screens is a 150ms crossfade. The drawer slides in over 300ms with the shared ease. Only transform, opacity and stroke-dashoffset animate, nothing waits on an animation, and `prefers-reduced-motion` shows the final state at once.
- Measured with mock data: CLS 0.0000 at 1440 and 390, and text contrast with no failures below 4.5:1 (3:1 for large text) on all five result screens.
