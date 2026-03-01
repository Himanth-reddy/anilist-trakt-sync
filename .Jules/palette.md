# Palette's Journal - UX & Accessibility Learnings

## 2024-03-24 - Bare-bones form structure insights
**Learning:** Simple admin/dev-tooling forms are often missing foundational accessibility markers. The combination of `htmlFor` and `id` linking is frequently overlooked when map-rendering fields. Async submission feedback strictly requires ARIA live regions to inform screen reader users of dynamically updating statuses (like Success or Error), which is crucial when visual alerts don't shift focus.
**Action:** When adding UX improvements to bare-bones or "quick" admin forms, always ensure fields have explicitly mapped `htmlFor` attributes, buttons have `disabled` and `aria-busy` states indicating loading, and status messages use `role="status"` and `aria-live="polite"` so screen readers accurately parse async updates without causing disruptive focus changes.
