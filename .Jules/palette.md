# Palette's Journal - UX & Accessibility Learnings

## 2024-03-24 - Bare-bones form structure insights
**Learning:** Simple admin/dev-tooling forms are often missing foundational accessibility markers. The combination of `htmlFor` and `id` linking is frequently overlooked when map-rendering fields. Async submission feedback strictly requires ARIA live regions to inform screen reader users of dynamically updating statuses (like Success or Error), which is crucial when visual alerts don't shift focus.
**Action:** When adding UX improvements to bare-bones or "quick" admin forms, always ensure fields have explicitly mapped `htmlFor` attributes, buttons have `disabled` and `aria-busy` states indicating loading, and status messages use `role="status"` and `aria-live="polite"` so screen readers accurately parse async updates without causing disruptive focus changes.

## 2025-01-20 - Persistent aria-live regions and modal a11y
**Learning:** Returning `null` for a dynamic component or unmounting the entire `aria-live` region completely prevents screen readers from announcing status updates. `aria-live` containers must remain persisted in the DOM even when empty for the screen reader to detect the change when content mounts. Further, overlays meant to steal focus must have explicit `role="dialog"` and `aria-modal="true"`.
**Action:** Always place `aria-live` regions persistently around dynamic content areas rather than on the dynamic elements themselves. Add appropriate `role="alert"` or `role="status"` on the inner dynamically-rendered items. Verify overlays are explicitly labeled as dialogs so screen readers correctly handle the simulated modality.
