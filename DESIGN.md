# React Dialer — Design System

A professional browser-based VoIP dialer. Not a startup template. No AI-default palette, no purple/blue gradients, no decorative blobs, no glassmorphism, no identical rounded-cards-everywhere.

---

## Subject & Audience

Browser dialer for outbound/call-center agents, telephony admins, and CRM integrators. Real calls over WebRTC → Asterisk / FreePBX / SIP. Must work standalone or embedded in a host app. The user lives on the keyboard; the screen shows real system state (registration, call, outcome), not decorative mock data.

---

## Color Palette (named hex, 6 colors)

Restrained, warm-neutral with a single amber signal color. No blue-violet AI gradient, no neon, no pastel wash.

| Token | Hex | Role |
|---|---|---|
| Slate | `#0f172a` | Primary text, headings, nav text |
| Ink | `#1a2332` | Card surfaces (slightly lighter than slate so borders read) |
| Parchment | `#f6f5f0` | Page background (warm cream, not cold grey) |
| Bone | `#eae8e1` | Hairline borders, dividers, muted separators |
| Amber | `#b87a2e` | Single strategic accent: live-status indicators, icon fill behind feature items, focus ring on interactive elements. Never decorative, never a gradient |
| Stone | `#8a847b` | Muted/descriptive text, secondary labels |

Dark mode: Slate → `#0b1120`, Ink → `#121a28`, Parchment → `#0d0e12`, Bone → `#23232a`, Amber unchanged, Stone → `#9a968e`.

No gradient washes on sections. No tinted overlays. Color carries meaning: amber = live/connected/action, slate/stone = rest/static/information.

---

## Typography

One family, clearly differentiated weights and spacing — no generic sans-serif pairing.

- **Geist Sans (variable)** — everything: headings, body, labels, buttons, nav. The product identity is carried by spacing and weight, not by introducing a second decorative face.
- **Geist Mono** — call IDs, SIP extension numbers, timestamps, status tags, any fixed-width system data.

Scale (follows The Elements of Typographic Style ratios):

| Role | Size / Weight | Tracking | Line-height |
|---|---|---|---|
| Page title / hero headline | 3.5rem (56px) / 700, tight (`-0.03em`) | Tight (`-0.03em`) | 1.05 |
| Section heading (h2) | 2rem (32px) / 600 | Normal | 1.15 |
| Sub-heading (h3) | 1.25rem (20px) / 600 | Normal | 1.25 |
| Body / description | 1.0625rem (17px) / 400 | Normal | 1.65 |
| Small / label | 0.8125rem (13px) / 500 | `+0.02em` (slightly widened for readability at small size) | 1.4 |
| Data label (mono) | 0.8125rem / 500 mono | Normal mono | 1.3 |

No ALL-CAPS eyebrow labels. No single-word accent color in headlines. No decorative italic on random words. Typography is information, not ornament.

---

## Layout Concept (ASCII wireframe)

```
+------------------------------------------------------------+
| STICKY NAV  [Logo]  React Dialer          [Login] [Theme] |  <- hairline bottom border only
+------------------------------------------------------------+
|                                                            |
|  HERO (center-aligned, no background gradient)             |
|  Small pill tag: "Browser-based VoIP — real calls, real PBX" |
|  H1: Professional Browser Dialer                           |
|  Sub: Make/receive calls over WebRTC. SIP to Asterisk/FreePBX. |
|  Two CTAs: Sign In (primary)  /  Explore Product (outline) |
|                                                            |
+------------------------------------------------------------+
|  FEATURE GRID (3 columns, left-aligned inside card, not identical rounded cards everywhere) |
|  Card 1: amber icon only  Browser-based calling             |
|  Card 2: amber icon only  Asterisk / SIP integration         |
|  Card 3: amber icon only  Agent & admin roles               |
|  Varying internal padding based on content length. Hairline top border on each card. No shadow wash. |
+------------------------------------------------------------+
|  HOW IT WORKS (3-step sequence — numbers 01 / 02 / 03 only because this IS a sequence) |
|  01 Register  02 Dial  03 Log                            |
+------------------------------------------------------------+
|  INFO / PRODUCT DETAILS (left-aligned, max-width 4xl)     |
|  Real constraints, not marketing claims. Synthetic data clearly marked. |
+------------------------------------------------------------+
|  FAQ (clean bordered blocks, no rounded-xlarge everything)  |
|  Q / A pairs with hairline divider between items            |
+------------------------------------------------------------+
|  CTA (minimal, no background gradient)                       |
+------------------------------------------------------------+
|  FOOTER (hairline top, minimal text)                        |
+------------------------------------------------------------+
```

Layout rules:
- Left-aligned body text on info/FAQ; center-aligned hero; feature cards in a 3-col grid that collapses to 1-col on mobile.
- Max-width containers (`max-w-6xl` for sections, `max-w-4xl` for info, `max-w-3xl` for FAQ) so lines stay under 80 characters.
- Sticky nav with `backdrop-blur` but no glassmorphism overlay; hairline bottom border (`bone`) only.
- Footer is minimal text + hairline, no decorative wave or background color shift.

---

## Design Principles (restrained, professional, real)

1. **Restrained over decorative.** One accent color (amber). No gradient washes, no decorative blobs, no icon-only cards floating in space. If an element does not carry information, remove it.
2. **Professional B2B, not startup-template.** No ALL-CAPS eyebrow labels above headings. No identical rounded-card grids. No generic "SaaS-kit" layout. Hairline borders (`bone`) instead of soft grey shadows under every card.
3. **Real, not mocked.** The landing page states what is confirmed (auth, roles, settings) and what is synthetic (call logs) explicitly. No fake customer logos. No invented performance numbers. Status indicators reflect real SIP state (registered / unregistered / in-call / completed / failed) and use text + shape together, never color alone.
4. **Embeddable by default.** No full-page body background hijack. No global scroll locking. The dialer works inside a host CRM container. The landing page avoids fixed full-height shells that would break embedding.
5. **Keyboard-accessible.** Visible focus rings (`amber` ring, 2px, offset). Call control actions reachable by keyboard (`Tab` through dialpad, `Enter` to initiate, `Space` to hang up). Focus states are never removed; no `outline-none` on interactive elements.
6. **Distinctive, not generic AI aesthetic.** No purple/blue gradient hero. No near-black tinted background (`#111`) pretending to be sophisticated. The identity is the amber signal on a warm parchment ground, with hairline borders and tight typography — a telephony tool, not a design-system demo.

---

## Component Behavior Notes

- **Sticky header (`home/layout.tsx`)** — sticky top-6 with hairline bottom border; no fixed full-height shell assumption.
- **Feature cards (`page.tsx`)** — hairline top border, minimal internal vertical spacing (`py-7`), amber icon in a small square (not a large rounded circle), text left-aligned.
- **Sequence numbers (`01 / 02 / 03`)** — only on the "How it works" section because the content is actually a sequence. Not used elsewhere.
- **FAQ blocks** — bordered (`bone`) top and bottom only, no full rounded-xlarge card. Questions in bold slate; answers in stone.
- **Status indicators** — live SIP state uses amber dot + text label; inactive uses stone dot + muted text. Never amber for decorative accents outside of live-system state.

---

## Accessibility Rules

- Status (registration, call state, outcome) conveyed by text label + icon shape + color together; a user must understand state with color disabled.
- Focus ring visible on every interactive element (`ring-amber`, 2px, offset 2px).
- Keyboard navigation through the dialpad and call-control buttons; no mouse-only actions.
- Reduced motion respected (`prefers-reduced-motion` disables the single page-load fade).

---

## What This Design Rejects (Explicitly)

- Purple / blue AI-gradient hero backgrounds.
- Warm cream `#F4F1EA` with high-contrast serif + terracotta accent (the Anthropic default tell).
- Near-black `#0B0B0B` with single bright green or vermilion accent (the "dark AI" tell).
- Identical rounded-card grids with `shadow-sm` on everything.
- ALL-CAPS eyebrow labels (`TRACKED OUT` text above headings).
- `A · B · C` meta strings with middle dots.
- Monospace labels on non-data elements.
- `→` appended to every link.

---

## Summary of Choices

Palette: 6 named hex tokens, single amber signal, warm parchment/stone/slate base, no purple/blue gradient. Typography: one family (Geist Sans + Mono), deliberate scale with tight tracking on hero, no decorative pair. Layout: sticky hairline nav, sequence numbers only on real sequences, hairline borders instead of shadow cards, center hero / left-aligned details, no gradient sections. Principles: restrained B2B, real-state-first, embeddable, keyboard-accessible, distinctive by avoiding the 5 common AI-default visual traits.
