1. **Explore issue.**
   - Focus on adding focus shifting when a modal opens, to improve keyboard accessibility and follow UX best practices, as seen in `Palette` journal and instructions.

2. **Update `app/sync/page.jsx` modal accessibility.**
   - Add a `useRef` to store a reference to the modal title.
   - Attach the ref to the `<h4 id="modal-title">` element.
   - Add a `tabIndex="-1"` to the modal title to make it focusable programmatically.
   - Add a `useEffect` to focus on this ref when `modalOpen` becomes `true`. It should use a `setTimeout` with `0` ms delay to ensure the modal elements are fully rendered before attempting to focus.

3. **Verify focus.**
   - Write a simple Playwright script to test the focus shifting when clicking one of the sync buttons that opens a modal.

4. **Run general checks.**
   - Execute `pnpm run build` to verify no regressions were introduced.

5. **Pre-commit checks.**
   - Complete pre-commit steps to ensure proper testing, verifications, reviews and reflections are done.

6. **Submit.**
   - Submit the change with branch name `palette-modal-focus`.
