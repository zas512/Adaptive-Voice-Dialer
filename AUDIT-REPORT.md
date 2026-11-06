Method: dual-agent (A: 201afa94-7f77-4d75-bed4-82a86495b360 · B: 35b029db-fe01-4caa-9269-04563d748746)

# Adaptive Voice Dialer — Full App Audit & Critique

**Target:** `src/app` and shared UI  
**Date:** 2026-11-06  
**Scope:** Landing, login, dialer, call logs, settings, KYC, admin/users, app shell and shared components. Baseline review before the remediation follow-up below.

## Remediation follow-up

The application changes below were made after the baseline audit; the scores and findings in this report remain the original snapshot and have not been independently re-audited.

- Addressed all nine prioritized findings: SIP session/UA wiring and call controls, accurate transport/registration feedback, responsive shell/navigation and tables, functional profile/KYC flows, accessible admin dialog and status announcements, and product-verified landing copy/semantics.
- Call-log finalization now records inbound/outbound direction, distinguishes completed/missed/cancelled/failed calls, and stores the JsSIP end cause and originator instead of placeholder values.
- Targeted Biome checks passed for 15 affected TypeScript/TSX files with formatting disabled; `git diff --check` passed.
- TypeScript validation was not rerun after the user denied the command. A Next.js dev-server startup was attempted twice but stopped at the Next.js 16.4.0 security-advisory notice, so browser/render and full build verification remain incomplete.
- The Next.js advisory is separate from the UI findings and remains unresolved pending the user's decision on a security upgrade.

## Run notes and evidence

- Assessment A reviewed the product brief and all major screens. Landing and login were visually inspected; protected screens were source-reviewed because no authenticated browser session was available.
- Assessment B ran `.github/skills/impeccable/scripts/impeccable detect --json src/app`: exit 0, `[]` (0 source findings).
- Browser injection succeeded on the landing page. The live overlay found one issue: `<h1>` followed by `<h3>` (“Browser-Based”), skipping `<h2>`. This is a semantic hierarchy issue, not by itself proof of a WCAG failure. The browser snapshot confirmed it; screenshot capture was unavailable.
- At a 390px viewport, landing/login had no horizontal overflow. Protected routes redirected to login, so mobile dashboard, table and call interaction behavior were assessed from source, not a signed-in render.
- `npx tsc --noEmit --incremental false` failed with **31 TypeScript diagnostics**: five in the active SIP dialer and 26 in legacy root `Phone.tsx`/`MyPhone.tsx`.
- `npx biome check --reporter=summary src/app src/components` failed: **48 errors and 14 warnings**, including a parse error in the current dialer page and formatting/organize-import diagnostics across the app.
- Next.js 16.4.0 printed a startup warning that the installed version is affected by a known security vulnerability. This UI audit did not identify or assess the specific advisory.

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---:|---|
| 1 | Accessibility | 2/4 | Missing semantic hierarchy and dialog/status announcements; several interactive controls are misleading or inert. |
| 2 | Performance | 3/4 | No large media or obvious heavy rendering path; fixed background, blur and broad transitions merit restraint. |
| 3 | Theming | 2/4 | Light/dark tokens exist, but status colors and some surface styles bypass the token system. |
| 4 | Responsive Design | 1/4 | Sidebar disappears below `lg` without replacement; multi-column tables are clipped by their wrapper. |
| 5 | Implementation Integrity | 1/4 | Core dialer has type-check errors and outbound call references are not wired; several screens are placeholders. |
| **Total** | | **9/20** | **Poor — major issues need correction.** |

## Implementation Integrity Verdict

**Fail.** There is a useful foundation—shared UI primitives, light/dark tokens, a keypad, explicit call status and call-log loading/error/empty states—but the product’s central promise is not reliably expressed by the current implementation. The active SIP page fails type-checking, its outbound path has no populated user-agent reference, and its mute/audio controls do not perform the actions their labels promise. Settings and KYC present nonfunctional or synthetic content as though it were operational.

The source detector returned no findings, but the live overlay did catch the landing-page heading skip. Treat the source scan as clean only for its deterministic source rules; it did not catch the broader usability or runtime defects below.

## Executive Summary

- **Audit Health:** 9/20 (Poor); **Design Heuristics:** 17/40.
- **Priority issues:** 9 total — **P0: 1 · P1: 4 · P2: 4 · P3: 0**.
- **Most urgent:** restore a buildable/working dialer path; provide usable live-call controls; make navigation and layout work on mobile and when embedded.
- **Recommended sequence:** fix the dialer core first, then responsive shell and call-state feedback, then placeholder surfaces and polish.

## Detailed Findings by Severity

### [P0] Active dialer cannot type-check or reliably place outbound calls

- **Location:** [home/page.tsx](src/app/home/page.tsx#L64), [sip-session.ts](src/app/home/lib/sip-session.ts#L2)
- **Category:** Implementation Integrity
- **Evidence:** TypeScript reports an invalid `RTCSession` import, a missing third `SipSessionManager` constructor argument, an undeclared `pendingExtension`, and invalid optional-property assignments. In addition, `handleCall` requires `uaRef.current`, but the active page never populates it; the manager exposes `getUA()` but that is not used.
- **Impact:** Type-check/build is blocked, and even a registered client cannot pass the outbound call guard.
- **Standard:** Build/type-check failure; core task completion.
- **Recommendation:** Fix the manager API/types and lifecycle wiring, populate the UA and extension refs, and verify an outbound call can reach the SIP provider. Resolve the legacy root-file diagnostics or remove those files from the build if they are truly obsolete.
- **Suggested command:** `/impeccable harden`

### [P1] Mute and speaker controls do not control the active call

- **Location:** [home/page.tsx](src/app/home/page.tsx#L94), [home/page.tsx](src/app/home/page.tsx#L341)
- **Category:** Implementation Integrity / Accessibility
- **Evidence:** `handleToggleMute` only flips React state; it never mutes the session or microphone track. The control is rendered only while idle, so it disappears during a call. The “Turn audio off” state still invokes `audio.play()` and sets audio on rather than turning playback off.
- **Impact:** Agents cannot trust or use essential controls during the call, and assistive technology announces a state that does not match the audio path.
- **Standard:** Control labels and states should match behavior; WCAG 4.1.2 is relevant.
- **Recommendation:** Bind controls to the live JsSIP session/audio tracks, retain them in-call, and synchronize `aria-pressed` with actual state.
- **Suggested command:** `/impeccable harden`

### [P1] SIP WebSocket uses an insecure scheme

- **Location:** [sip-session.ts](src/app/home/lib/sip-session.ts#L32)
- **Category:** Implementation Integrity
- **Evidence:** The SIP manager builds its socket URL with `ws://`.
- **Impact:** A production page served over HTTPS cannot use an insecure WebSocket connection; browsers block mixed active content, preventing SIP registration.
- **Standard:** Secure-context mixed-content behavior.
- **Recommendation:** Use `wss://` for secure deployments and surface a clear configuration/connection error when the SIP endpoint cannot support it.
- **Suggested command:** `/impeccable harden`

### [P1] Mobile navigation disappears and the shell assumes viewport ownership

- **Location:** [sidebar.tsx](src/components/sidebar.tsx#L55), [home/layout.tsx](src/app/home/layout.tsx#L37), [globals.css](src/app/globals.css#L3)
- **Category:** Responsive Design / Implementation Integrity
- **Evidence:** The sidebar is `hidden` below `lg` and has no mobile replacement. The authenticated layout uses `min-h-screen` and an inner scrolling region; global CSS sets a fixed, full-viewport body background. These conflict with the product’s explicit embedded-dialer constraint.
- **Impact:** Small-screen users have no route navigation, and an embedded dialer can impose viewport/background/scroll behavior on its host.
- **Standard:** Responsive reflow and product requirement for embedding.
- **Recommendation:** Add compact mobile navigation and scope height, scroll and background behavior to an app root that can adapt to a host container.
- **Suggested command:** `/impeccable adapt`

### [P1] Connection summaries give conflicting status

- **Location:** [home/page.tsx](src/app/home/page.tsx#L370)
- **Category:** Accessibility / Implementation Integrity
- **Evidence:** The lower “SIP Status” row reads `websocketConnected`, while the status strip separately reports SIP registration. A connected WebSocket can therefore be presented as a connected SIP account even before registration succeeds.
- **Impact:** Agents may attempt calls or diagnose failures using the wrong status; duplicated summaries add noise instead of confidence.
- **Standard:** System status should be accurate, consistent and understandable.
- **Recommendation:** Model WebSocket, SIP registration, call and audio states separately, and present one consistent status hierarchy with a useful next step on failure.
- **Suggested command:** `/impeccable clarify`

### [P2] Settings and KYC imply unavailable functionality

- **Location:** [settings/page.tsx](src/app/home/settings/page.tsx#L17), [kyc/page.tsx](src/app/home/kyc/page.tsx#L12)
- **Category:** Implementation Integrity
- **Evidence:** Settings initializes personal data from hard-coded values, has a disabled Save button, and makes “Two-factor authentication” a local-only toggle. KYC displays synthetic client rows without a demo label and disables Add/Review actions.
- **Impact:** Users can mistake examples and local state for real account/KYC records, and controls lead to dead ends.
- **Standard:** Status and content should accurately represent available functionality.
- **Recommendation:** Connect the screens to real persistence and feedback, or label them as demos and hide/disable unavailable features with an explanation.
- **Suggested command:** `/impeccable harden`

### [P2] Semantic and keyboard feedback gaps

- **Location:** [page.tsx](src/app/page.tsx#L30), [admin/users/page.tsx](src/app/home/admin/users/page.tsx#L301), [home/page.tsx](src/app/home/page.tsx#L234)
- **Category:** Accessibility
- **Evidence:** The live overlay found an `<h1>` followed by `<h3>`. Landing links wrap Button components, creating nested interactive elements. The custom admin modal has no dialog role/`aria-modal` or focus-management semantics; live call status is plain text without an announcement role.
- **Impact:** Screen-reader structure and keyboard expectations are less predictable, and important call changes may go unnoticed.
- **WCAG/Standard:** WCAG 1.3.1 and 4.1.2 are relevant; the skipped heading level alone is not asserted as a formal WCAG failure.
- **Recommendation:** Use a sequential heading structure and one interactive element per action; use an accessible dialog primitive and announce important call-state changes.
- **Suggested command:** `/impeccable harden`

### [P2] Tables do not have a narrow-screen strategy

- **Location:** [table.tsx](src/components/ui/table.tsx#L9), [call-logs/page.tsx](src/app/home/call-logs/page.tsx#L108)
- **Category:** Responsive Design / Accessibility
- **Evidence:** The shared table wrapper uses `overflow-hidden`; call logs has seven columns, with similar wide tables in KYC and user administration. The protected table views could not be visually tested on a signed-in mobile session.
- **Impact:** Narrow viewports can compress or clip useful columns rather than provide a usable way to inspect records.
- **Recommendation:** Use a deliberate horizontal-scroll or compact-card pattern, preserve visible column labels, and test with real long values and text scaling.
- **Suggested command:** `/impeccable adapt`

### [P2] Landing page is generic and makes unsupported claims

- **Location:** [page.tsx](src/app/page.tsx#L39), [page.tsx](src/app/page.tsx#L52)
- **Category:** Implementation Integrity / Theming
- **Evidence:** “Enterprise-grade reliability” and “Crystal Clear” are not substantiated by the product brief. Repeated phone icons and generic feature cards miss the open-SIP, standalone-and-embeddable distinction. The page uses `glass-card`, while the shared CSS defines `glass`/`glass-depth`, not a `.glass-card` rule.
- **Impact:** The first impression is interchangeable with a generic VoIP SaaS template and overstates proof the product does not have.
- **Recommendation:** Describe only verified capabilities, explain admin-provisioned access, and make the visual language/product position specific to open SIP and embeddability.
- **Suggested command:** `/impeccable clarify`

## Patterns & Systemic Issues

- **State and action drift:** status labels and mute/audio affordances are not connected to the state they describe.
- **Scaffold UI shipped as product UI:** settings/KYC look operational despite static values, dummy rows and disabled actions.
- **Viewport assumptions repeat:** hidden mobile navigation, full-screen sizing and fixed body background work against the explicit embed requirement.
- **System drift:** dark/light tokens exist, but direct status colors and an undefined `glass-card` class bypass the shared visual system.

## Positive Findings

- Login has properly associated Email/Password labels and clearly says accounts are provisioned by an administrator.
- The dialer puts a recognizable keypad and primary call action near the top of the workflow.
- Shared button/input/card primitives and light/dark token definitions provide a foundation for consistency.
- Call Logs already has loading, error and empty states instead of silently showing an empty table.

## Design Critique

### Design Health Score — Nielsen’s Heuristics

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Repeated/conflicting call and registration states; settings do not confirm saves. |
| 2 | Match System / Real World | 2/4 | SIP language lacks setup context; KYC does not clearly belong to the dialer. |
| 3 | User Control and Freedom | 2/4 | Call controls exist, but settings are inert and modal escape/focus behavior is incomplete. |
| 4 | Consistency and Standards | 2/4 | Shared primitives help, but state labels and page patterns diverge. |
| 5 | Error Prevention | 2/4 | Required fields and port bounds help; call setup lacks effective guardrails. |
| 6 | Recognition Rather Than Recall | 2/4 | Labels are present, but no recent/favorite flow or mobile navigation. |
| 7 | Flexibility and Efficiency | 1/4 | No visible keyboard accelerators or repeat/favorite workflows for agents. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Repeated cards/status rows add noise without a strong product-specific signature. |
| 9 | Error Recovery | 1/4 | Errors name failures but offer little guided recovery. |
| 10 | Help and Documentation | 1/4 | No contextual setup/registration help or explanation of SIP terms. |
| **Total** | | **17/40** | **Weak: needs a stronger operational and product-specific experience.** |

**Design specificity verdict:** Weak and mostly category-interchangeable. The warm palette and serif helper show intent, and the keypad/status are appropriate to a softphone, but the generic hero, repeated phone icon and inactive dashboard features do not express open SIP or an embeddable dialer.

**Overall impression:** The dialer’s core action is recognizable, but the interface does not consistently earn trust at the moment of a real call. Correct, actionable live status and reliable call controls are the single biggest opportunity.

**Cognitive load:** High in the dialer and admin provisioning; **4/8 checklist failures**. Competing status summaries weaken single focus and hierarchy; the create-user modal presents nine fields with little progressive disclosure. Login is comparatively simple.

**Emotional journey:** The landing promises reliability without evidence. Login sets an accurate expectation about administrator-provisioned access. After login, mismatched connection signals and missing in-call controls make a high-stakes call feel uncertain; static management screens further reduce trust.

### Priority Issues

1. **[P0] Make the dialer build and place a call.** The active SIP page has type-check errors and never populates the UA reference that outbound dialing requires.  
   **Fix:** repair manager types/lifecycle and verify the actual outbound path. **Suggested:** `/impeccable harden`.
2. **[P1] Make live call controls real.** Mute is a state-only toggle and the controls disappear during a call.  
   **Fix:** bind controls to the active SIP/media session and keep them visible in-call. **Suggested:** `/impeccable harden`.
3. **[P1] Make navigation and layout work on mobile and when embedded.**  
   **Fix:** add mobile navigation and scope full-height/scroll/background assumptions. **Suggested:** `/impeccable adapt`.
4. **[P1] Tell the truth about call state.** “SIP Status” can mean only WebSocket connected.  
   **Fix:** distinguish transport, registration, call and audio states; provide next steps. **Suggested:** `/impeccable clarify`.
5. **[P2] Replace or label Settings/KYC placeholders and generic claims.**  
   **Fix:** wire persistence or mark/remove demos and unavailable controls; use product-verified copy. **Suggested:** `/impeccable harden`, then `/impeccable clarify`.

### Persona Red Flags

- **Contact-center agent:** cannot rely on outbound calls being available; mute disappears in-call and does not mute the microphone; status summaries can disagree.
- **Operations admin:** user provisioning is a flat nine-field form; settings and KYC show dead controls or sample records rather than clear real/demo status.
- **First-time user:** “Get Started” leads to a login page and the landing promises reliability without explaining setup or admin provisioning.

### Minor Observations

- Call Logs has seven columns and no search/filter; its displayed call ID is only a suffix.
- The 40px login/theme controls are below the preferred 44px touch target, though size alone does not establish a WCAG 2.5.8 failure.
- Screenshot capture was unavailable; live DOM snapshot and viewport metrics were used instead.

### Questions to Consider

- Should KYC be a real product area, a clearly labeled demo, or hidden until implemented?
- Is the primary experience a compact CRM-embedded softphone or a full standalone console—or should both be explicit surfaces?

## Recommended Actions

1. **[P0] `/impeccable harden`** — restore a clean type-check and wire the UA/extension lifecycle so outbound calls can start.
2. **[P1] `/impeccable harden`** — make mute/audio controls operate the active call and use a secure SIP WebSocket scheme.
3. **[P1] `/impeccable adapt`** — add mobile navigation, prevent table clipping, and scope the shell for embedding.
4. **[P1] `/impeccable clarify`** — consolidate transport/registration/call status into accurate, actionable feedback.
5. **[P2] `/impeccable harden`** — make settings/KYC real or visibly demo-only, and complete keyboard/screen-reader dialog/status behavior.
6. **[P2] `/impeccable clarify`** — replace unsupported reliability claims and generic feature copy with verified product positioning.
7. **`/impeccable polish`** — final consistency pass after fixes.

You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run `/impeccable audit` after fixes to see your score improve.
