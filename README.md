# JSON Workbench

[English](#english) | [简体中文](#简体中文)

---

## English

Cross-platform desktop shell for JSON formatting, validation, and diff workflows on Windows and macOS.

### Current v1 features

- **Technology Stack:** Electron + React + TypeScript + Monaco editor.
- **Main Workbench:** Collapsible history sidebar and lightweight top workspace utility strip.
- **Advanced Editing:** Monaco editor with real-time JSON draft state, formatting, and compression.
- **Validation:** Live syntax validation with line/column diagnostics.
- **Compare Workflow:** Baseline capture, Diff editor, structured change entries, and statistics.
- **Multi-Window:** Workspace-list sync across open windows and rename support.
- **Apple-Inspired UI:** Light glass UI with softer layering, rounded panels, and compact typography following macOS HIG.
- **i18n:** Built-in support for Chinese and English.

### Local startup

```bash
npm install
npm run dev
```

### Packaging

```bash
# macOS bundle / dmg
npm run build:mac

# Windows installer
npm run build:win
```

---

## 简体中文

适用于 Windows 和 macOS 的跨平台 JSON 格式化、校验和对比桌面工作台。

### 当前 v1 功能特性

- **技术栈:** 基于 Electron + React + TypeScript + Monaco 编辑器。
- **主工作台:** 包含可折叠的历史记录侧边栏和轻量级顶部工作区工具栏。
- **高级编辑:** 集成 Monaco 编辑器，支持实时 JSON 状态同步、一键格式化及压缩。
- **语法校验:** 实时语法检查，并在检测面板中提供行/列错误诊断。
- **对比工作流:** 支持基准快照捕获、Diff 编辑器查看、结构化变更条目及差异统计。
- **多窗口支持:** 支持在打开的窗口间同步工作区列表，并支持重命名。
- **Apple 风格 UI:** 遵循 macOS 交互规范 (HIG) 的浅色毛玻璃 UI，具有平滑的层级感、圆角面板和紧凑排版。
- **国际化:** 内置中英文双语切换支持。

### 本地启动

```bash
npm install
npm run dev
```

### 生产打包

```bash
# macOS 软件包 / dmg
npm run build:mac

# Windows 安装程序
npm run build:win
```

---

*Developed with ❤️ focusing on productivity and detail.*
