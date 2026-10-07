from pathlib import Path

content = """# Dialer App — Full UX/UI Audit & Redesign

You are working on a production React-based browser VoIP/dialer.

## Product

A professional browser dialer that can:
- Connect to Asterisk, SIP, or other VoIP infrastructure
- Make/receive calls through the browser
- Work standalone or integrate into CRMs
- Support real-time agent calling workflows

Target users: sales, support, call centers, real estate, and other teams using business calling.

Target feel: **professional, reliable, technical, clean, fast, mature B2B software.**

## Design Rules

No AI slop:
- No AI-style fonts
- No excessive gradients or glowing effects
- No purple/blue AI aesthetic
- No excessive glassmorphism
- No giant rounded cards everywhere
- No decorative blobs or meaningless illustrations
- No fake stats/features
- No unnecessary animation
- No generic startup-template design

Use strong typography, spacing, hierarchy, borders, restrained colors, and useful visual states.

## Workflow

### 1. Audit first
Inspect the entire project before changing code:
- Architecture, routes, components and design system
- Homepage and all internal pages
- Dialer/call controls
- Contacts and call history
- Settings/configuration
- CRM integration
- SIP/Asterisk/WebRTC-related UI
- Loading, error and empty states
- Responsive behavior
- Accessibility
- TypeScript/code quality

Understand what is actually implemented. **Do not invent backend functionality.**

### 2. Impeccable audit
Use **Impeccable first** to critique the existing UI/UX.

Identify:
- Hierarchy and typography problems
- Spacing/alignment inconsistencies
- Navigation/information architecture issues
- Poor states and affordances
- Accessibility problems
- Responsive problems
- Visual noise and generic/AI-looking patterns

Prioritize critical, important, and minor issues.

### 3. Redesign
Use **Frontend Design + Impeccable**.

Redesign the homepage to clearly communicate:
- What the product is
- Who it is for
- Browser-based calling
- Asterisk/SIP/VoIP connectivity
- Standalone dialer
- CRM integration
- Relevant capabilities that actually exist

Create a strong landing-page structure without adding meaningless sections.

Then improve the internal application so it feels like the same professional product.

Pay particular attention to:
- Navigation
- Dialer
- Active call states
- Contacts
- Call history
- Settings
- Forms/tables/dialogs
- Loading/error/empty states
- Responsive layouts

### 4. Clean production code
Use **TypeScript/LSP, Code Review, Code Simplifier and other relevant skills**.

Check:
- Type safety
- Component boundaries
- Duplication
- Unnecessary abstractions
- State/effects
- Dead code
- Naming
- Error handling
- Accessibility
- Maintainability

Keep the implementation simple. Don't refactor unrelated code.

Use **Context7** whenever current library/API documentation is needed.

### 5. Validate
Use **Playwright/browser testing** where available.

Actually inspect the rendered UI on desktop/tablet/mobile and test important flows.

Then run **Impeccable again** on the implemented result and fix remaining visual/UX issues.

Finally run **Code Review + TypeScript checks + lint/test/build** available in the project.

## Execution Order

**Audit → Impeccable → Frontend Design → Homepage → Internal UI → Responsive/Accessibility → TypeScript/Clean Code → Playwright → Impeccable final pass → Code Review → lint/typecheck/test/build**

Preserve working functionality and do not invent features.

At the end, briefly report:
- What changed
- What was intentionally left unchanged
- Remaining issues
