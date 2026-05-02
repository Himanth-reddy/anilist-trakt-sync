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

## 2026-05-02 - Formless inputs keyboard accessibility and disabled states
**Learning:** For text inputs acting as complete 'forms' without a wrapping `<form>` tag (such as ID lookups or code submission fields), relying solely on an adjacent button leaves keyboard-only users without a natural way to submit (pressing 'Enter'). Furthermore, using the deprecated `onKeyPress` event is poor practice. Additionally, leaving the action buttons enabled when the input is empty can lead to confused states or redundant empty API requests.
**Action:** In React components, use `onKeyDown` instead of `onKeyPress` to capture 'Enter' for submission on formless inputs. Always pair this with explicitly disabling the corresponding action button (using disabled styles and attributes) when the input is empty to prevent unintended blank submissions and provide clear visual feedback.
