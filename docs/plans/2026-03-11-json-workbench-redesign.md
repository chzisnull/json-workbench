# JSON Workbench Redesign + Loading Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh the Electron JSON workbench with an Apple glass UI and eliminate the Monaco loading hang in the central editor area.

**Architecture:** Keep the existing two-column information architecture, modernize the renderer shell and editor surface in place, and replace the fragile Monaco asset-path setup with a Vite-compatible worker configuration in the renderer. Validation focuses on rendering, interaction continuity, and editor boot readiness.

**Tech Stack:** Electron, React 19, Vite 7, TypeScript, `@monaco-editor/react`, `monaco-editor`, Vitest, Testing Library

---

### Task 1: Lock down the renderer loading regression

**Files:**
- Modify: `/Library/aiProject/jsonBset/src/renderer/src/App.test.tsx`
- Modify: `/Library/aiProject/jsonBset/src/renderer/src/App.tsx`
- Create if needed: `/Library/aiProject/jsonBset/src/renderer/src/lib/monaco-setup.ts`

**Step 1: Write the failing test**

- Add a focused render test that proves the workbench shell can leave the bootstrap loading state and render the editor workspace.

**Step 2: Run test to verify current behavior**

- Run: `npm test -- --runInBand`
- Record whether the current suite is stale and replace only the parts that no longer reflect the current app.

**Step 3: Write minimal implementation**

- Remove the brittle relative Monaco `paths.vs` setup.
- Configure Monaco in a Vite-compatible way with worker imports and `MonacoEnvironment.getWorker`.
- Keep the rest of the editor API surface unchanged.

**Step 4: Run targeted verification**

- Run: `npm test -- --runInBand`
- Run: `npm run typecheck`

### Task 2: Apply the Apple glass visual system

**Files:**
- Modify: `/Library/aiProject/jsonBset/src/renderer/src/App.tsx`
- Modify: `/Library/aiProject/jsonBset/src/renderer/src/assets/main.css`

**Step 1: Refresh structural class names only where needed**

- Keep the current feature set intact while adding the minimal DOM hooks needed for richer visual styling.

**Step 2: Update the visual hierarchy**

- Introduce layered shell backgrounds, stronger glass panels, elevated history cards, premium editor frame, quieter footer, and more polished action controls.

**Step 3: Preserve functional behavior**

- Confirm `Editor` / `Diff`, `Format`, `Minify`, `Save Snapshot`, locale toggle, and footer stats still behave as before.

**Step 4: Verify**

- Run: `npm test -- --runInBand`
- Run: `npm run typecheck`

### Task 3: Final acceptance and launch preparation

**Files:**
- No new source files required unless verification identifies a small regression.

**Step 1: Re-check user acceptance criteria**

- Confirm the shell renders, controls remain visible, and the editor area is not loading indefinitely.

**Step 2: Run final verification**

- Run: `npm test -- --runInBand`
- Run: `npm run typecheck`
- Run: `npm run build`

**Step 3: Launch for review**

- Start the app with `npm run dev` or `npm run start` after a successful build/dev verification.

**Step 4: Hand-off summary**

- Report touched files, exact verification commands, and any remaining risks.
