# Palette's Journal - UX & Accessibility Learnings

## 2024-03-24 - Bare-bones form structure insights
**Learning:** Simple admin/dev-tooling forms are often missing foundational accessibility markers. The combination of `htmlFor` and `id` linking is frequently overlooked when map-rendering fields. Async submission feedback strictly requires ARIA live regions to inform screen reader users of dynamically updating statuses (like Success or Error), which is crucial when visual alerts don't shift focus.
**Action:** When adding UX improvements to bare-bones or "quick" admin forms, always ensure fields have explicitly mapped `htmlFor` attributes, buttons have `disabled` and `aria-busy` states indicating loading, and status messages use `role="status"` and `aria-live="polite"` so screen readers accurately parse async updates without causing disruptive focus changes.

## 2025-01-20 - Persistent aria-live regions and modal a11y
**Learning:** Returning `null` for a dynamic component or unmounting the entire `aria-live` region completely prevents screen readers from announcing status updates. `aria-live` containers must remain persisted in the DOM even when empty for the screen reader to detect the change when content mounts. Further, overlays meant to steal focus must have explicit `role="dialog"` and `aria-modal="true"`.
**Action:** Always place `aria-live` regions persistently around dynamic content areas rather than on the dynamic elements themselves. Add appropriate `role="alert"` or `role="status"` on the inner dynamically-rendered items. Verify overlays are explicitly labeled as dialogs so screen readers correctly handle the simulated modality.

## 2025-03-07 - Skip-to-content links and focus visibility
**Learning:** In Next.js client applications, navigating between routes via `<a>` or Next.js `<Link>` components can trap keyboard users in the top navigation menu, requiring them to repeatedly Tab through all links to reach the main page content. Furthermore, bare anchors without explicit focus styles fail to indicate the current focus position when navigating via keyboard.
**Action:** Always include a "Skip to main content" link (with `.sr-only.focus:not-sr-only`) at the top of the body that points to the `<main id="main-content">` area (which should have `tabIndex="-1"`). Add explicit focus rings (`focus-visible:ring-2 focus-visible:outline-none`) to all navigation links to provide clear visual feedback to keyboard users without impacting mouse/touch interactions.

## 2025-04-18 - Actionable empty states within data tables
**Learning:** Static "no data found" messages in empty data tables create a navigational dead end. When users first use a product and see empty tables, forcing them to find the correct navigation item to populate the table adds unnecessary friction. Additionally, static tables during async refresh operations leave users guessing if an update is occurring if they miss the spinner animation on the refresh button.
**Action:** Always provide inline, contextual Call-to-Action (CTA) links within empty state table rows directing users to the specific creation/input flow (e.g., "Add an entry"). For async loading, apply `opacity-50 pointer-events-none transition-opacity` and `aria-busy="true"` to data containers to provide immediate visual and screen reader feedback that the content is being updated.
