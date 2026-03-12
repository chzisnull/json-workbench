---
name: 自制JSONapp-维护
description: Use when maintaining the JSON Workbench repository, GitHub releases, bilingual release notes, Electron packaging, Apple Silicon macOS troubleshooting, release asset uploads, and day-to-day repo hygiene for this project.
---

# 自制JSONapp 维护

## 适用场景
- 维护这个自制 JSON 桌面应用仓库时使用
- 发布 GitHub Releases、补传安装包、补写更新说明时使用
- 处理 Electron + Vite + Monaco 的构建、打包、签名、Apple Silicon 兼容问题时使用
- 更新 README、CHANGELOG、版本号、图标、发布资产时使用
- 需要把“本地构建 → Release 说明 → 上传安装包 → 发布验证”串成固定流程时使用

## 核心目标
- 让仓库维护、版本发布和安装包交付形成稳定流程
- 优先保证 macOS Apple Silicon 可运行，其次保证 Windows 安装包可交付
- Release 页面默认提供中英双语说明
- 发布时不仅创建 tag / release，还要确认安装包资产已经上传
- 只有源码包的 Release 视为未完成，必须上传各系统安装包

## 标准维护流程
1. 检查工作区状态：`git status --short`
2. 确认版本号：`package.json`、`package-lock.json`
3. 更新 `README.md` 和 `CHANGELOG.md`
4. 运行验证：
   - `npm test -- src/renderer/src/App.test.tsx`
   - `npm run typecheck`
   - `npm run build`
5. 产出安装包：
   - `npm run build:mac:arm64`
   - `npm run build:win:x64`
   - `npm run build:linux`
6. 验证 mac 包：
   - `file "dist/mac-arm64/JSON Workbench.app/Contents/MacOS/JSON Workbench"`
   - `spctl -a -vv "dist/mac-arm64/JSON Workbench.app"`
   - 直接运行 `.app` 或通过 `open` 验证
7. 创建/更新 GitHub Release
8. 上传 release assets，确认页面中能看到安装包而不只是源码包

### 当前项目的最低发布资产要求
- macOS：至少 1 个可安装包，优先 `arm64`，有条件则附带 universal
- Windows：至少 1 个 `.exe` 安装程序
- Linux：至少 1 个 Linux 安装产物，例如 `AppImage` 或 `deb`
- 如果缺任一目标平台的软件包，Release 不算完成

## Release 说明要求
Release 页面默认写成双语：
- 先写中文简介
- 再写 English summary
- 至少包含：新增、改进、修复、安装包说明
- 如果是 mac 版本，还要补一条用户可执行的损坏修复提示：
  - `xattr -cr /Applications/JSON\ Workbench.app`

推荐结构：
- 中文简介
- 中文更新要点
- English Summary
- English Highlights
- Assets / 安装包说明
- 各系统安装包清单
- mac 用户损坏修复提示

## 资产上传检查
GitHub Release 默认只有：
- `Source code (zip)`
- `Source code (tar.gz)`

这不代表安装包已上传。必须额外执行：
- `gh release upload <tag> <asset> --clobber`

上传后必须再检查：
- `gh release view <tag> --json assets --jq '.assets[].name'`

如果返回的资产列表里只有源码包，或者没有 mac / windows / linux 对应安装包：
- 该 Release 仍然是不完整状态
- 不能向用户宣称“已经发布完成”

## mac Apple Silicon 故障排查
如果 M 系列 Mac 上出现“因为出现问题而无法打开”：
1. 先看是否是架构不匹配：`file <app binary>`
2. 再看签名：`codesign -dv --verbose=4 <app>`
3. 再看 Gatekeeper：`spctl -a -vv <app>`
4. 直接运行主程序查看 dyld / framework 报错

### 面向终端用户的默认提示
如果用户反馈“应用已损坏”或打不开，Release 页面和 README 默认提示：
- `xattr -cr /Applications/JSON\ Workbench.app`

### 当前项目的已知经验
- 这个项目的 mac arm64 包曾出现 `Electron Framework` 无法加载的问题
- 解决办法是在打包后执行一次：
  - `codesign --force --deep --sign - --timestamp=none <app>`
- 该逻辑已通过 `electron-builder.yml` 的 `afterSign` 钩子固化到 `scripts/after-sign-mac.cjs`

## 本项目关键文件
- `package.json`：脚本与版本号
- `electron-builder.yml`：安装包配置
- `src/main/index.ts`：主进程、dock 图标、窗口行为
- `src/renderer/src/App.tsx`：主 UI 与快照/工作台逻辑
- `src/renderer/src/assets/main.css`：视觉样式
- `CHANGELOG.md`：版本更新说明
- `README.md`：仓库首页介绍

## 常见坑
- 只创建 GitHub Release，不上传安装包资产
- 只上传了其中一个系统的软件包，却忘了其他系统
- 只跑 `npm run build`，却误以为已经生成安装包
- mac 打包完没有验证 `.app` 真能打开
- Release 说明只有英文，没有中文
- 热更新看起来正常，但打包版主进程/签名仍有问题

## 完成定义
满足以下条件才算发布完成：
- 代码已提交并推送
- tag 与 release 已创建
- Release 页面有中英双语说明
- 页面能看到 mac / windows / linux 安装包资产
- mac Apple Silicon 包本机可启动
- Windows 安装包已成功产出
