# Changelog

## v1.2.0 - 2026-03-12

### Added
- Document-level compare modal that supports multiple side-by-side compare regions.
- Built-in image conversion utilities for image-to-Base64 and Base64-to-image workflows.
- Snapshot naming so saved workbench states can be labeled before storing.
- Regression coverage for workspace scrolling and blocked compare states.

### Changed
- Expanded the Apple-inspired workspace into a fuller utility layout with compare actions and a tools menu in the top bar.
- Refined card spacing, editor sizing, and grid behavior so larger document sets stay navigable.
- Updated release metadata to version `1.2.0` for this publish.

### Fixed
- Restored vertical scrolling when many document cards are open in the workspace.
- Prevented compare results from showing misleading zero-diff stats when the source JSON is invalid.
- Improved DiffEditor test coverage so compare input changes are exercised in the renderer test suite.

## v1.1.0 - 2026-03-11

### Added
- Multi-document editor grid with one full-width editor by default and up to two cards per row.
- Workbench snapshot history that saves and restores the full set of open documents.
- Refreshed Apple-inspired app icon across build resources and runtime integration.
- Extra packaging scripts for `macOS arm64` and `macOS universal` builds.

### Changed
- Rebuilt the renderer as a cleaner Apple-style desktop utility with tighter typography and lighter glass surfaces.
- Removed the end-user `Workspace` concept from the UI and window title.
- Simplified the top toolbar and made the editor surface the visual focus.
- Reduced sidebar density and clarified snapshot interactions around full workbench states.

### Fixed
- Fixed the Monaco editor loading issue in Electron/Vite by switching to explicit worker-based setup.
- Fixed snapshot restore behavior so history can switch the whole workbench state.
- Fixed macOS dev runtime icon wiring with explicit dock icon setup.
- Stabilized the renderer test suite, type checks, and production build flow.
