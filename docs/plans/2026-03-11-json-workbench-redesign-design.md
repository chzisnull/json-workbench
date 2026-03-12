# JSON Workbench Apple Glass Redesign

## Context

- Current stack: Electron + React + Vite + Monaco + Zustand.
- User goal: refactor the desktop UI with an Apple-inspired frosted glass aesthetic, fix the editor area that remains stuck in a loading state, then launch the app for review.
- Constraint: preserve the current core workflow (`Editor` / `Diff`, `Format`, `Minify`, `Save Snapshot`, language toggle, footer stats).

## Design Direction

### Recommended approach

Keep the existing two-column workbench structure and upgrade the visual system instead of changing the information architecture.

Why:

- Lowest regression risk for a utility app that already has a workable task model.
- Lets the implementation focus on visual polish and the Monaco loading defect together.
- Keeps the mental model stable for review while still making the product feel significantly more premium.

### Visual language

- Overall mood: macOS utility, calm and premium, not marketing-site glossy.
- Background: layered blue-white gradients with a subtle aurora effect.
- Containers: translucent panels with blur, soft border highlights, and medium shadows.
- Corners: large radii on primary surfaces (`20px` to `28px`).
- Controls: segmented tabs, quiet secondary buttons, one blue primary action.
- Typography: SF Pro-like hierarchy, muted metadata, stronger primary labels.

### Layout

- Left rail remains the snapshot history column.
- Main area remains the editor workbench.
- Header is simplified into three zones: mode switch, primary actions, utility/status cluster.
- Footer remains lightweight and operational.

## Bug Diagnosis

The loading issue is most likely caused by Monaco loader initialization in the renderer:

- Current code points Monaco `vs` assets to a relative `../node_modules/monaco-editor/min/vs` path.
- In Electron + Vite, this is brittle and commonly leaves the editor on the built-in loading placeholder.
- The safer Vite-aligned fix is to configure Monaco workers explicitly in the renderer and provide Monaco to the loader rather than relying on relative file paths.

## Acceptance Criteria

- Main editor no longer remains stuck on the loading placeholder.
- App keeps `Editor` / `Diff` switching working.
- Apple glass style is visibly stronger across shell, sidebar cards, header, editor surface, and footer.
- Existing core actions remain accessible.
- Local tests and type checks for touched areas pass.

## Stitch MCP Notes

- Stitch project created: `projects/2939940744123399884`
- `generate_screen_from_text` was attempted for the redesign prompt, but the Stitch MCP call returned a transport failure before a screen was created.
- Implementation therefore proceeds using the approved design direction above, while still recording the Stitch project for follow-up generation if needed.
