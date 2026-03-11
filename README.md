# JSON Workbench

[English](#english) | [简体中文](#简体中文)

---

## English

A cross-platform desktop utility for formatting, validating, diffing, and restoring JSON workbench states on macOS and Windows.

### Current v1.1 features

- **Technology Stack:** Electron + React + TypeScript + Monaco Editor.
- **Refined Desktop UI:** Apple-inspired light glass utility design with tighter typography and a cleaner, more native-feeling layout.
- **Multi-Document Editing:** One full-width editor by default, with support for adding more editors and flowing into a two-column grid.
- **Workbench Snapshots:** Save the current state of all open documents as a single snapshot and restore it from the history sidebar.
- **JSON Tooling:** Real-time validation, formatting, minifying, and diff comparison against the latest saved snapshot state.
- **Bilingual UI:** Built-in Chinese and English interface toggle.
- **App Branding:** Refreshed app icon resources for packaging and runtime display.

### Local startup

```bash
npm install
npm run dev
```

### Packaging

```bash
# macOS default build
npm run build:mac

# macOS Apple Silicon build
npm run build:mac:arm64

# macOS universal build
npm run build:mac:universal

# Windows installer
npm run build:win
```

### Version notes

See `CHANGELOG.md` for release notes and update history.

---

## 简体中文

适用于 macOS 和 Windows 的 JSON 桌面工具，支持格式化、校验、对比，以及恢复整组文档工作台状态。

### 当前 v1.1 功能特性

- **技术栈：** Electron + React + TypeScript + Monaco 编辑器。
- **精修桌面界面：** 更克制的 Apple 风格浅色毛玻璃工具界面，排版更紧凑，更接近原生工具气质。
- **多文档编辑：** 默认单个满宽编辑器，支持继续新增文档，并在需要时自动切换为两列网格布局。
- **工作台快照：** 可以把当前打开的全部文档状态保存为一条快照，并从左侧历史区一键恢复。
- **JSON 工具能力：** 支持实时校验、一键格式化、压缩，以及基于最近快照的差异对比。
- **双语界面：** 内置中英文切换。
- **品牌图标更新：** 应用图标资源与运行态展示已同步刷新。

### 本地启动

```bash
npm install
npm run dev
```

### 生产打包

```bash
# macOS 默认构建
npm run build:mac

# macOS Apple Silicon 构建
npm run build:mac:arm64

# macOS Universal 构建
npm run build:mac:universal

# Windows 安装程序
npm run build:win
```

### 版本更新说明

请查看 `CHANGELOG.md`。

---

*Developed with care for productivity and detail.*
