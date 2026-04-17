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

## 2025-03-09 - Empty states and async data tables
**Learning:** Tables displaying dynamic data can feel like "dead ends" when empty, confusing users about what to do next. Furthermore, during async fetch operations (like refreshing or loading tables), relying solely on a small button spinner leaves the primary content area looking active and fully interactive, which can lead to confusion or double-clicking.
**Action:** For empty states in data tables, always provide an inline Call-to-Action (CTA) link to the relevant creation or sync flow to guide the user naturally. During async operations that update a table's contents, apply visual dimming (`opacity-50 pointer-events-none`) and set `aria-busy="true"` on the table element to provide clear state feedback and prevent extraneous interaction.

## 2025-04-03 - Client-side routing with standard anchors
**Learning:** Using standard HTML `<a>` tags for internal navigation in Next.js triggers full-page reloads. This breaks the seamless SPA experience, makes navigation feel slow, and discards application state.
**Action:** Always use the Next.js `<Link>` component for internal navigation routes (e.g., in headers and inline CTAs) to preserve client-side routing and provide a smoother, faster user experience.

## 2025-04-17 - Active navigation styling and code duplication
**Learning:** For application menus, especially those spanning the header on all routes, omitting visual "active route" indicators (like bolding or a color change) significantly reduces wayfinding clarity for all users. Screen reader users face a similar handicap if `aria-current="page"` is missing on the active link. Furthermore, inline map-based rendering or repeated logic in components often leads to unextracted functions, leading to repetitive code (like identical `onClick` closures to close a single modal).
**Action:** When working on navigation menus, implement an active state style combined with `aria-current="page"` driven by the current pathname (e.g., via Next.js `usePathname()`). When managing modal states, always extract the state-clearing operations into a single named function (e.g., `closeModal`) and reuse it across the overlay backdrop, the cancel button, and the Escape key listener.
