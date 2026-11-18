# Convene design system

This document covers the landing page (`/`) and the tokens it introduced. The workspace (`/app`) still uses the previous styling (forest green, lime, Geist-era look) and will be migrated to these tokens in a second pass. Only the global font changed for the workspace (DM Sans now replaces Geist).

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

Tailwind theme names: `ink`, `teal`, `mist`, `paper`, `rejected`. The workspace's old dark surface utility was renamed `ws-ink` so the names do not collide.

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
- Motion is subtle: staggered rise on load (`.rise`), budget ring and bars animate once (`.ring-draw`, `.grow-x`), cards lift 4px on hover (`.lift`). All of it is disabled under `prefers-reduced-motion`. No parallax, no looping.

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

One row of anchor links (How it works, Audit, Sample plan) on Ink. Nothing else: no wordmark, no description, no buttons, no photo credits line. Sample data is labeled where it appears (hero cards, bento chart, sample plan section) rather than in the footer. The page order is nav, hero (with the bento row overlapping its bottom edge), how it works, audit, sample plan, CTA band, footer. There is no separate problem section.

## Components (`components/landing/`)

`nav` (sticky, transparent then Paper blur on scroll, drawer on mobile), `hero`, `product-cluster` (plan card with budget ring, message card, rejected card, trace chip, scroll ring), `bento-stats`, `how-it-works`, `audit-band`, `sample-plan`, `cta-band`, `footer`, plus `ui` (wordmark and mark, pills, message chips, ring, arrows, `SAMPLE` data) and `blur` (generated placeholders).

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

## Next step

Restyle the workspace screens (`app/app/page.tsx`, `components/*`) with these tokens, then retire the old `--accent`, `--highlight`, `--background` family in `app/globals.css`.
