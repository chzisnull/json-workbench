# Changelog

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
