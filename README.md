# JSON Workbench

Cross-platform desktop shell for JSON formatting, validation, and diff workflows on Windows and macOS.

## Current v1 skeleton

- Electron + React + TypeScript desktop shell created from the `create-electron` scaffold.
- Main workbench window with a collapsible history sidebar and a lightweight top workspace utility strip.
- Monaco editor wired to real JSON draft state.
- JSON format and compress actions wired to the current draft.
- Live JSON syntax validation with line/column diagnostics in the inspector.
- Compare workflow with explicit baseline capture, Diff editor, structured change entries, and change statistics.
- Workspace rename and shared workspace-list sync across open windows.
- Collapsible left history sidebar with recent actions instead of a workspace-heavy left column.
- Compact typography pass across headings, buttons, cards, and editor chrome.
- Default Chinese UI with an English toggle in the header area.
- Apple-leaning light glass UI with softer layering, rounded panels, and lighter Monaco/Diff surfaces.
- Electron preload IPC for bootstrap data and opening extra workspace windows.

## Key dependencies

- `electron`, `electron-vite`, `electron-builder`: desktop runtime, local dev server, and packaging.
- `react`, `typescript`, `zustand`: renderer UI and workbench state container.
- `@monaco-editor/react`, `monaco-editor`: JSON editor and diff surface placeholders.
- `jsonc-parser`: JSON validation offsets used for line/column diagnostics.
- `vitest`, `@testing-library/react`, `jsdom`: renderer shell verification.

## Local startup

```bash
npm install
npm run dev
```

The dev command starts the Electron main process and the renderer dev server together.

## Formatting and validation workflow

1. Edit JSON in the `Editor view`.
2. Use `Format JSON` to rewrite the current draft with 2-space indentation.
3. Use `Compress JSON` to rewrite the current draft into a single line.
4. Watch the right-side validation panel for live syntax status and line/column diagnostics.
5. Use `Capture Baseline` when the current draft should become the compare source of truth.
6. Switch to `Diff view` to compare the captured baseline against the current draft and inspect structured diff entries.
7. Use the `中文 / English` switcher near the top of the shell to swap the primary interface copy.

## Diff and workspace workflow

1. Use the left history sidebar to review recent operations, language switches, and workspace events.
2. Collapse the history sidebar when you want the editor and diff area to take more space.
3. Rename the current workspace from the top utility strip and save it to broadcast the label to other open windows.
4. Open another child window with `New window` / `新建窗口` to verify the shared workspace list updates.
5. Use the top workspace chips to confirm which windows are currently open without dedicating the whole sidebar to workspace management.
6. Capture a compare baseline before making changes you want to review.
7. Use the diff summary cards for changed / added / removed counts.
8. Inspect structured diff entries in the right inspector to review changed JSON paths.
9. Rename the workspace or switch languages without leaving the current window; the workspace list still stays synced across windows.

## UI Notes

- The latest UI pass intentionally reduces typography scale by one step to keep the glass layout closer to a native macOS utility density.
- The left column is now a collapsible history sidebar, not the primary workspace area.
- Workspace controls remain available, but they now live in the top utility strip instead of dominating the sidebar.
- The Apple-style direction is reinforced with lighter glass panels, softer separators, rounded segmented controls, and a brighter editor surface.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Packaging

```bash
# unpacked smoke build
npm run build:unpack

# macOS unpacked app (arm64) for local smoke tests
npm run build:mac:unpack

# re-sign the unpacked macOS app for local launch on this machine
npm run resign:mac:unpacked

# Windows installer
npm run build:win

# Windows x64 installer
npm run build:win:x64

# macOS bundle / dmg
npm run build:mac
```

Notes:

- Windows output is based on `electron-builder` with the NSIS target.
- macOS output is based on `electron-builder` with `zip` and `dmg` targets.
- Production macOS distribution still needs a real Developer ID certificate and notarization.

## Packaging Matrix

- Verified locally on this machine: `npm run build:mac:unpack` -> `dist/mac-arm64/JSON Workbench.app`
- Verified locally on this machine: `npm run build:mac` -> `dist/JSON Workbench-1.0.0-arm64-mac.zip` and `dist/json-workbench-1.0.0.dmg`
- Verified artifact generation on this machine: `npm run build:win` -> `dist/win-arm64-unpacked/`
- Verified artifact generation on this machine: `npm run build:win:x64` -> `dist/json-workbench-1.0.0-setup.exe` and `dist/win-unpacked/`
- `npm run build:win` follows the host architecture, so on this Apple Silicon machine it outputs a Windows arm64 package.

## Self-Test Notes

- Local executable smoke test completed for macOS unpacked output:
  1. `npm run build:mac:unpack`
  2. `npm run resign:mac:unpacked`
  3. Launch `dist/mac-arm64/JSON Workbench.app/Contents/MacOS/JSON Workbench`
- The ad-hoc re-sign step is required on this unsigned local setup before launching the unpacked `.app`.

## Environment Limits

- Current host is macOS arm64, so Windows installer generation was verified, but Windows installer execution was not run on this machine.
- Current macOS builds are unsigned for production use. They are suitable for local packaging verification, but real distribution still requires Developer ID signing and notarization.

## Structure

```text
src/
  main/       Electron main process and window orchestration
  preload/    Safe IPC bridge exposed to the renderer
  renderer/   React workbench UI
  shared/     Shared workbench contracts and bootstrap types
```

## Next implementation slices

- Formatter module: sort keys and indentation presets.
- Validator module: JSON Schema support on top of the current syntax diagnostics.
- Diff module: change navigation and text-to-node jump behavior on top of the current compare summary.
