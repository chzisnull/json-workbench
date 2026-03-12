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

### Release policy

Future GitHub Releases should always include:

- A Chinese introduction first, followed by an English summary.
- Bilingual highlights for added, changed, and fixed items when applicable.
- Real installation assets for every supported desktop platform. A Release with only source archives is incomplete.
- Asset notes that clearly tell users which file to download on macOS, Windows, and Linux.
- A macOS recovery note for users who see the app reported as damaged:

Minimum expected assets:

- macOS: a signed or re-signed `.dmg` for Apple Silicon, and preferably a universal macOS package when available.
- Windows: an `.exe` installer produced from the NSIS target.
- Linux: at least one installable artifact such as `.AppImage` or `.deb` for the current release.

```bash
xattr -cr /Applications/JSON\ Workbench.app
```

Recommended release template: `.github/RELEASE_TEMPLATE.md`

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

### 发布规范

以后发布 GitHub Release 时，默认需要包含：

- 先写中文简介，再写英文简介。
- 重要更新尽量同时提供中英双语要点。
- 必须附带当前支持平台的软件安装包；如果 Release 页面只有源码包，则该版本视为未完成发布。
- 要在 Release 页面明确说明 macOS、Windows、Linux 各自应该下载哪个文件。
- 如果 mac 用户遇到“应用已损坏”或无法打开的情况，要提示执行：

最低要求的安装包资产：

- macOS：Apple Silicon 对应的 `.dmg`，有条件时优先再附一个 universal macOS 包。
- Windows：NSIS 生成的 `.exe` 安装程序。
- Linux：至少附一个可直接安装或运行的产物，例如 `.AppImage` 或 `.deb`。

```bash
xattr -cr /Applications/JSON\ Workbench.app
```

推荐直接复用仓库中的发布模板：`.github/RELEASE_TEMPLATE.md`

---

*Developed with care for productivity and detail.*
