# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Outbound / contact-center agents** — live in the dialer all day, keyboard-first, need fast call control, clear live status, and quick dispositioning of calls.
- **Telephony / operations admins** — configure SIP accounts, extensions, hosts/ports, and secrets; manage users and roles; monitor activity and system health.
- **Developers integrating the dialer into a CRM** — embed the dialer in a host application (component / iframe); care about the integration surface, theming, and not fighting host branding.
- **Small teams / SMBs, standalone** — run a browser softphone with no CRM around it.

## Product Purpose

A browser-based VoIP dialer that places and receives real calls over WebRTC. It registers to Asterisk / FreePBX or any SIP-compatible VoIP provider through JsSIP. Success means an agent can sign in, be registered, place a real call, and see the outcome recorded — and an admin can provision the extensions and people that make that possible.

## Positioning

One dialer that both stands alone and drops into any CRM, on open SIP rather than a locked-in provider. A neighbouring hosted softphone cannot truthfully claim "works standalone *and* embeds anywhere, against your own Asterisk/VoIP."

## Operating Context

- Real telephony via SIP over WebSocket (JsSIP → Asterisk/FreePBX/any VoIP). The dialer's connection is live and its failures are real (unreachable WSS, bad credentials, registration loss, call drops).
- Users are provisioned by an admin (extension, SIP host, port, secret, role); there is no public self-signup.
- Multi-role operation: `user`, `agent`, `admin`, with an admin-only management area.
- Deployed as a Next.js web app; may be embedded inside another product's page.

## Capabilities and Constraints

- **Confirmed functionality:** credentials auth (NextAuth, JWT sessions); role-gated routes; admin CRUD over users and their SIP provisioning; a dialer workspace; call logs; settings/profile.
- **Required, not yet done:** real JsSIP registration and call placement end-to-end; call logs as real persisted records rather than hardcoded rows; server-side RBAC enforced on every route, not only in the client.
- **Stack (fixed by the user):** Next.js 16 App Router, React 19, MongoDB via Mongoose, NextAuth. Do not re-platform.
- **Standalone + embeddable is a core constraint:** page-level assumptions (fixed full-height shells, global scroll hijacking, an app-owned body background) must not break when the dialer is placed inside a host app.
- **Terminology:** extension, registration, trunk/host, port, secret, agent, admin, call log, disposition.

## Brand Commitments

- No AI-default visual expression: no training-data-default fonts, no generic "AI" palettes, no assembled-from-a-template design system. The visual world must be specific to this product and defensible against category-guessing. (Volunteered constraint; the visual world itself is decided in the direction round, not here.)
- Product name in code is `react-dialer`; the on-screen name is "React Dialer" (renameable if a real product name is chosen later).

## Evidence on Hand

- Working auth + role plumbing, Mongoose `User` model with SIP fields, TanStack Query wiring, shadcn-style primitives.
- No real extensions, no real call data, no customers, no testimonials, no benchmarks, no pricing exist yet. Future work must not fabricate commercial or performance claims; demonstration data is authorable but stays labeled synthetic.

## Product Principles

1. **The call is the product.** Every screen is measured by whether it gets an agent closer to a clear, connected call and a recorded outcome.
2. **Real, not mocked.** Registration, calls, and logs are live system state; placeholder rows and dead controls are bugs, not scaffolding.
3. **Embeddable by default.** Nothing in the UI assumes it owns the page.
4. **Admins provision, agents operate.** Role determines what a person sees and can do, enforced on the server.
5. **Distinctive over default.** Reaching for the category's generic look is a failure of the brief, not a safe choice.

## Accessibility & Inclusion

- Keyboard operation for call control (agents live on the keyboard); visible focus everywhere.
- Status (registration, in-call, call outcome) conveyed by text and shape, never colour alone.
