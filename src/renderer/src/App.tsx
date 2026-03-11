import { startTransition, useEffect, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import {
  createFallbackBootstrap,
  type CreateWorkspaceWindowResult,
  type WorkbenchBootstrap,
  type WorkspacesChangedPayload
} from '../../shared/workbench'
import { compareJsonDocuments, inspectJsonDocument } from './lib/json-tools'
import { useWorkbenchStore } from './store/workbench-store'

type Locale = 'en' | 'zh'

type ActivityState =
  | { key: 'apiFallback' }
  | { key: 'captureResolve' }
  | { key: 'capturedBaseline' }
  | { key: 'compressResolve' }
  | { key: 'compressed' }
  | { key: 'createWindowFailed' }
  | { key: 'editing' }
  | { key: 'formatResolve' }
  | { key: 'formatted' }
  | { key: 'openChildWindowInElectron' }
  | { key: 'openedWorkspace'; label: string }
  | { key: 'ready' }
  | { key: 'renameFailed' }
  | { key: 'renameOnlyInElectron' }
  | { key: 'renamedWorkspace'; label: string }
  | { key: 'restored' }

interface HistoryEntry {
  id: string
  state: ActivityState
}

const sampleJson = `{
  "workspace": "Workspace 01",
  "formatter": {
    "indentSize": 2,
    "sortKeys": true
  },
  "pipeline": ["format", "validate", "diff"],
  "document": {
    "leftPane": "input.json",
    "rightPane": "preview.json"
  }
}`

const translations = {
  zh: {
    added: '新增',
    after: '变更后',
    appleLead:
      '多窗口 JSON 工作台，采用更明确的 Compare 流程、结构化差异摘要，以及跨窗口共享的工作区元数据。',
    attention: '注意',
    baselineHint: (lineCount: number): string =>
      `基线行数：${lineCount}。切到“对比视图”前，可以先捕获新的基线版本。`,
    baselineTitle: '基线与当前草稿',
    before: '变更前',
    captureBaseline: '捕获基线',
    changed: '变更',
    chars: '字符',
    collapseHistory: '收起历史记录',
    compareBlocked: '对比阻塞',
    compareHintDiff: '左侧显示已捕获的基线，右侧显示当前 JSON 草稿。',
    compareHintEdit: '在这里编辑 JSON，再进行格式化、压缩，或捕获新的对比基线。',
    compareReady: '对比就绪',
    compareSummary: '对比摘要',
    compareWorkflow: '对比工作流',
    compressJson: '压缩 JSON',
    currentStatus: '当前状态',
    desktopShell: '桌面壳层',
    diffStage: '对比当前 JSON 草稿与基线',
    diffView: '对比视图',
    editorAriaLabel: 'JSON 编辑器',
    editorStage: 'Monaco JSON 编辑器与实时校验',
    editorView: '编辑视图',
    english: 'English',
    errors: '错误',
    expandHistory: '展开历史记录',
    formatJson: '格式化 JSON',
    history: '历史记录',
    historyHint: '最近操作、语言切换与工作区事件会收进这里。',
    historyLatest: '最近一次',
    historyOlder: '较早记录',
    hydration: '同步状态',
    jsonInvalid: 'JSON 无效',
    jsonValid: 'JSON 有效',
    language: '语言',
    lines: '行数',
    newWindow: '新建窗口',
    openingWindow: '打开中...',
    removed: '移除',
    restoreSample: '还原示例',
    saveWorkspaceName: '保存工作区名称',
    saving: '保存中...',
    stage: '工作台',
    statusReady: '就绪',
    structuredCompare: '结构化差异',
    synced: '当前窗口已与共享工作区频道保持同步。',
    totalEntries: '总差异',
    validation: '校验',
    validationPassed: '校验通过',
    validationPassedDetail: '当前 JSON 草稿没有检测到语法错误。',
    workspaceName: '工作区名称',
    workspaceUtility: '顶部工具区',
    workspaceWindows: '打开的窗口',
    workbenchAriaLabel: '工作台视图'
  },
  en: {
    added: 'Added',
    after: 'After',
    appleLead:
      'Multi-window JSON workspace with a clearer compare workflow, structured change summaries, and shared workspace metadata across windows.',
    attention: 'Attention',
    baselineHint: (lineCount: number): string =>
      `Baseline lines: ${lineCount}. Capture a new baseline before switching to Diff view when you want a fresh comparison.`,
    baselineTitle: 'Baseline vs current draft',
    before: 'Before',
    captureBaseline: 'Capture Baseline',
    changed: 'Changed',
    chars: 'Chars',
    collapseHistory: 'Collapse history',
    compareBlocked: 'Compare blocked',
    compareHintDiff: 'Original shows the captured baseline, modified shows the current JSON draft.',
    compareHintEdit: 'Draft JSON here, then format, compress, or capture a new compare baseline.',
    compareReady: 'Compare ready',
    compareSummary: 'Compare summary',
    compareWorkflow: 'Compare workflow',
    compressJson: 'Compress JSON',
    currentStatus: 'Current status',
    desktopShell: 'Desktop shell',
    diffStage: 'Compare baseline against the current JSON draft',
    diffView: 'Diff view',
    editorAriaLabel: 'JSON editor',
    editorStage: 'Monaco JSON editor with live validation',
    editorView: 'Editor view',
    english: 'English',
    errors: 'Errors',
    expandHistory: 'Expand history',
    formatJson: 'Format JSON',
    history: 'History',
    historyHint: 'Recent actions, language changes, and workspace events are tracked here.',
    historyLatest: 'Latest',
    historyOlder: 'Earlier',
    hydration: 'Hydration',
    jsonInvalid: 'JSON is invalid',
    jsonValid: 'JSON is valid',
    language: 'Language',
    lines: 'Lines',
    newWindow: 'New window',
    openingWindow: 'Opening...',
    removed: 'Removed',
    restoreSample: 'Restore Sample',
    saveWorkspaceName: 'Save workspace name',
    saving: 'Saving...',
    stage: 'Workbench',
    statusReady: 'Ready',
    structuredCompare: 'Structured compare',
    synced: 'This window is synced with the shared workbench channel.',
    totalEntries: 'Total entries',
    validation: 'Validation',
    validationPassed: 'Validation passed',
    validationPassedDetail: 'No syntax errors were detected in the current JSON draft.',
    workspaceName: 'Workspace name',
    workspaceUtility: 'Toolbar controls',
    workspaceWindows: 'Open windows',
    workbenchAriaLabel: 'Workbench views'
  }
} as const

function createHistoryEntry(state: ActivityState): HistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    state
  }
}

function getActivityText(locale: Locale, activityState: ActivityState): string {
  switch (activityState.key) {
    case 'apiFallback':
      return locale === 'zh'
        ? 'Workbench API 不可用，当前使用本地预览状态。'
        : 'Workbench API unavailable, using local preview state.'
    case 'captureResolve':
      return locale === 'zh'
        ? '请先解决 JSON 诊断问题，再捕获基线。'
        : 'Resolve JSON diagnostics before capturing a baseline.'
    case 'capturedBaseline':
      return locale === 'zh'
        ? '已将当前草稿捕获为新的对比基线。'
        : 'Captured the current draft as the compare baseline.'
    case 'compressResolve':
      return locale === 'zh'
        ? '当前 JSON 无效，修复诊断后才能压缩。'
        : 'Cannot compress invalid JSON until the diagnostics are resolved.'
    case 'compressed':
      return locale === 'zh' ? '已将 JSON 压缩为单行文本。' : 'Compressed JSON into a single line.'
    case 'createWindowFailed':
      return locale === 'zh' ? '新建窗口失败。' : 'Could not create a new window.'
    case 'editing':
      return locale === 'zh' ? '正在编辑 JSON 草稿。' : 'Editing JSON draft.'
    case 'formatResolve':
      return locale === 'zh'
        ? '当前 JSON 无效，修复诊断后才能格式化。'
        : 'Cannot format invalid JSON until the diagnostics are resolved.'
    case 'formatted':
      return locale === 'zh'
        ? '已按 2 空格缩进格式化 JSON。'
        : 'Formatted JSON with 2-space indentation.'
    case 'openChildWindowInElectron':
      return locale === 'zh'
        ? '请在 Electron 桌面环境中创建子窗口。'
        : 'Open this shell inside Electron to create child windows.'
    case 'openedWorkspace':
      return locale === 'zh'
        ? `已在新窗口打开 ${activityState.label}。`
        : `${activityState.label} opened in a new window.`
    case 'ready':
      return locale === 'zh'
        ? '已准备好进行 JSON 格式化、对比与历史跟踪。'
        : 'Ready for JSON formatting, compare, and history tracking.'
    case 'renameFailed':
      return locale === 'zh' ? '保存工作区名称失败。' : 'Could not save workspace name.'
    case 'renameOnlyInElectron':
      return locale === 'zh'
        ? '工作区名称同步仅在 Electron 桌面环境中可用。'
        : 'Workspace rename sync is only available inside Electron.'
    case 'renamedWorkspace':
      return locale === 'zh'
        ? `工作区已重命名为 ${activityState.label}。`
        : `Workspace renamed to ${activityState.label}.`
    case 'restored':
      return locale === 'zh' ? '已恢复示例 JSON 草稿。' : 'Restored the sample JSON draft.'
  }
}

function getCompareMessage(
  locale: Locale,
  compareReport: ReturnType<typeof compareJsonDocuments>,
  baselineDocument: ReturnType<typeof inspectJsonDocument>,
  jsonDocument: ReturnType<typeof inspectJsonDocument>
): string {
  if (baselineDocument.status === 'invalid') {
    const diagnostic = baselineDocument.diagnostics[0]
    return locale === 'zh'
      ? `基线 JSON 在第 ${diagnostic.line} 行，第 ${diagnostic.column} 列无效。`
      : `Baseline JSON is invalid at line ${diagnostic.line}, column ${diagnostic.column}.`
  }

  if (jsonDocument.status === 'invalid') {
    const diagnostic = jsonDocument.diagnostics[0]
    return locale === 'zh'
      ? `当前草稿在第 ${diagnostic.line} 行，第 ${diagnostic.column} 列无效。`
      : `Current draft is invalid at line ${diagnostic.line}, column ${diagnostic.column}.`
  }

  if (compareReport.entries.length === 0) {
    return locale === 'zh'
      ? '对比就绪：当前未检测到差异。'
      : 'Compare ready: no differences detected.'
  }

  return locale === 'zh' ? '对比就绪' : 'Compare ready'
}

function App(): React.JSX.Element {
  const bootstrap = useWorkbenchStore((state) => state.bootstrap)
  const isHydrated = useWorkbenchStore((state) => state.isHydrated)
  const viewMode = useWorkbenchStore((state) => state.viewMode)
  const hydrate = useWorkbenchStore((state) => state.hydrate)
  const setViewMode = useWorkbenchStore((state) => state.setViewMode)
  const syncWorkspaces = useWorkbenchStore((state) => state.syncWorkspaces)
  const [baselineText, setBaselineText] = useState(sampleJson)
  const [editorText, setEditorText] = useState(sampleJson)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([
    createHistoryEntry({ key: 'ready' })
  ])
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)
  const [isCreatingWindow, setIsCreatingWindow] = useState(false)
  const [isSavingWorkspaceName, setIsSavingWorkspaceName] = useState(false)
  const [locale, setLocale] = useState<Locale>('zh')
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('Workspace 01')

  const copy = translations[locale]
  const jsonDocument = inspectJsonDocument(editorText)
  const baselineDocument = inspectJsonDocument(baselineText)
  const compareReport = compareJsonDocuments(baselineText, editorText)
  const validationHeadline = jsonDocument.status === 'valid' ? copy.jsonValid : copy.jsonInvalid
  const compareBadgeLabel =
    compareReport.status === 'ready' ? copy.compareReady : copy.compareBlocked
  const compareMessage = getCompareMessage(locale, compareReport, baselineDocument, jsonDocument)

  const updateActivity = (nextState: ActivityState, options?: { logHistory?: boolean }): void => {
    if (options?.logHistory === false) {
      return
    }

    setHistoryEntries((previousHistory) =>
      [createHistoryEntry(nextState), ...previousHistory].slice(0, 8)
    )
  }

  useEffect(() => {
    let disposed = false
    const fallbackBootstrap = createFallbackBootstrap()

    if (!window.workbench) {
      hydrate(fallbackBootstrap)
      return () => {
        disposed = true
      }
    }

    void window.workbench
      .getBootstrap()
      .then((nextBootstrap: WorkbenchBootstrap) => {
        if (disposed) {
          return
        }

        startTransition(() => {
          hydrate(nextBootstrap)
        })
      })
      .catch(() => {
        if (disposed) {
          return
        }

        updateActivity({ key: 'apiFallback' })
        startTransition(() => {
          hydrate(fallbackBootstrap)
        })
      })

    const unsubscribe = window.workbench.onWorkspacesChanged(
      (payload: WorkspacesChangedPayload) => {
        if (disposed) {
          return
        }

        startTransition(() => {
          hydrate(payload)
        })
      }
    )

    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [hydrate])

  useEffect(() => {
    setWorkspaceNameDraft(bootstrap.currentWorkspace.label)
  }, [bootstrap.currentWorkspace.label])

  const handleCreateWorkspaceWindow = async (): Promise<void> => {
    if (!window.workbench) {
      updateActivity({ key: 'openChildWindowInElectron' })
      return
    }

    setIsCreatingWindow(true)

    try {
      const nextState: CreateWorkspaceWindowResult = await window.workbench.createWorkspaceWindow()

      startTransition(() => {
        syncWorkspaces(nextState.workspaces)
      })

      updateActivity({
        key: 'openedWorkspace',
        label: nextState.openedWorkspace.label
      })
    } catch {
      updateActivity({ key: 'createWindowFailed' })
    } finally {
      setIsCreatingWindow(false)
    }
  }

  const handleSaveWorkspaceName = async (): Promise<void> => {
    if (!window.workbench) {
      updateActivity({ key: 'renameOnlyInElectron' })
      return
    }

    setIsSavingWorkspaceName(true)

    try {
      const payload = await window.workbench.updateWorkspaceLabel(workspaceNameDraft)

      startTransition(() => {
        hydrate(payload)
      })

      updateActivity({
        key: 'renamedWorkspace',
        label: payload.currentWorkspace.label
      })
    } catch {
      updateActivity({ key: 'renameFailed' })
    } finally {
      setIsSavingWorkspaceName(false)
    }
  }

  const handleEditorChange = (value: string | undefined): void => {
    setEditorText(value ?? '')
    updateActivity({ key: 'editing' }, { logHistory: false })
  }

  const handleCaptureBaseline = (): void => {
    if (jsonDocument.status === 'invalid') {
      updateActivity({ key: 'captureResolve' })
      return
    }

    setBaselineText(editorText)
    updateActivity({ key: 'capturedBaseline' })
  }

  const handleFormatJson = (): void => {
    if (jsonDocument.status === 'invalid') {
      updateActivity({ key: 'formatResolve' })
      return
    }

    setEditorText(jsonDocument.formattedText)
    updateActivity({ key: 'formatted' })
  }

  const handleCompressJson = (): void => {
    if (jsonDocument.status === 'invalid') {
      updateActivity({ key: 'compressResolve' })
      return
    }

    setEditorText(jsonDocument.minifiedText)
    updateActivity({ key: 'compressed' })
  }

  const handleLoadSample = (): void => {
    setEditorText(sampleJson)
    updateActivity({ key: 'restored' })
  }

  return (
    <div
      className={`app-shell app-shell--${locale}${isHistoryCollapsed ? ' app-shell--history-collapsed' : ''}`}
    >
      <aside className={`sidebar panel${isHistoryCollapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar-meta-row">
          <button
            className="sidebar-toggle ghost-button"
            onClick={() => setIsHistoryCollapsed((currentState) => !currentState)}
            type="button"
          >
            {isHistoryCollapsed ? copy.expandHistory : copy.collapseHistory}
          </button>

          <div className="locale-switch" role="group" aria-label={copy.language}>
            <button
              className={locale === 'zh' ? 'locale-button locale-button--active' : 'locale-button'}
              onClick={() => setLocale('zh')}
              type="button"
            >
              中文
            </button>
            <button
              className={locale === 'en' ? 'locale-button locale-button--active' : 'locale-button'}
              onClick={() => setLocale('en')}
              type="button"
            >
              English
            </button>
          </div>
        </div>

        {!isHistoryCollapsed ? (
          <>
            <div className="sidebar-block">
              <p className="eyebrow">{copy.desktopShell}</p>
              <h1>{locale === 'zh' ? 'JSON 工作台' : 'JSON Workbench'}</h1>
              <p className="lead">{copy.appleLead}</p>
            </div>

            <div className="sidebar-block sidebar-block--muted">
              <div className="sidebar-heading">
                <h2>{copy.history}</h2>
                <span className="pill">{historyEntries.length}</span>
              </div>
              <p className="history-copy">{copy.historyHint}</p>
              <ul className="history-list">
                {historyEntries.map((entry, index) => (
                  <li className="history-card" key={entry.id}>
                    <div className="history-card-header">
                      <strong>{index === 0 ? copy.historyLatest : copy.historyOlder}</strong>
                    </div>
                    <p>{getActivityText(locale, entry.state)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="sidebar-collapsed-summary">
            <span className="pill">{historyEntries.length}</span>
          </div>
        )}
      </aside>

      <main className="workspace panel">
        <header className="workspace-toolbar">
          <div>
            <p className="eyebrow">{copy.stage}</p>
            <h2>{bootstrap.currentWorkspace.label}</h2>
          </div>

          <div className="toolbar-actions" role="tablist" aria-label={copy.workbenchAriaLabel}>
            <button
              aria-pressed={viewMode === 'editor'}
              className={
                viewMode === 'editor' ? 'ghost-button ghost-button--active' : 'ghost-button'
              }
              onClick={() => setViewMode('editor')}
              type="button"
            >
              {copy.editorView}
            </button>
            <button
              aria-pressed={viewMode === 'diff'}
              className={viewMode === 'diff' ? 'ghost-button ghost-button--active' : 'ghost-button'}
              onClick={() => setViewMode('diff')}
              type="button"
            >
              {copy.diffView}
            </button>
          </div>
        </header>

        <section className="workspace-utility panel panel--inset">
          <div className="workspace-utility-copy">
            <p className="meta-label">{copy.workspaceUtility}</p>
            <div className="workspace-utility-controls">
              <label className="field-label" htmlFor="workspace-name">
                {copy.workspaceName}
              </label>
              <input
                aria-label={copy.workspaceName}
                className="text-input"
                id="workspace-name"
                onChange={(event) => setWorkspaceNameDraft(event.target.value)}
                value={workspaceNameDraft}
              />
              <button
                className="ghost-button"
                disabled={isSavingWorkspaceName}
                onClick={() => void handleSaveWorkspaceName()}
                type="button"
              >
                {isSavingWorkspaceName ? copy.saving : copy.saveWorkspaceName}
              </button>
              <button
                className="primary-button"
                disabled={isCreatingWindow}
                onClick={() => void handleCreateWorkspaceWindow()}
                type="button"
              >
                {isCreatingWindow ? copy.openingWindow : copy.newWindow}
              </button>
            </div>
          </div>

          <div className="workspace-window-group">
            <p className="meta-label">{copy.workspaceWindows}</p>
            <div className="workspace-window-list">
              {bootstrap.workspaces.map((workspace) => (
                <span
                  className={
                    workspace.id === bootstrap.currentWorkspace.id
                      ? 'workspace-pill workspace-pill--active'
                      : 'workspace-pill'
                  }
                  key={workspace.id}
                >
                  {workspace.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="control-strip panel panel--inset">
          <div className="control-actions">
            <button className="primary-button" onClick={handleFormatJson} type="button">
              {copy.formatJson}
            </button>
            <button className="ghost-button" onClick={handleCompressJson} type="button">
              {copy.compressJson}
            </button>
            <button className="ghost-button" onClick={handleCaptureBaseline} type="button">
              {copy.captureBaseline}
            </button>
            <button className="ghost-button" onClick={handleLoadSample} type="button">
              {copy.restoreSample}
            </button>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <span>{copy.lines}</span>
              <strong>{jsonDocument.stats.lineCount}</strong>
            </div>
            <div className="stat-card">
              <span>{copy.chars}</span>
              <strong>{jsonDocument.stats.charCount}</strong>
            </div>
            <div className="stat-card">
              <span>{copy.errors}</span>
              <strong>{jsonDocument.diagnostics.length}</strong>
            </div>
          </div>
        </section>

        <section className="compare-strip panel panel--inset">
          <div className="compare-strip-copy">
            <p className="meta-label">{copy.compareWorkflow}</p>
            <h3>{copy.baselineTitle}</h3>
            <p className="status-copy">{copy.baselineHint(baselineDocument.stats.lineCount)}</p>
          </div>

          <div className="compare-strip-status">
            <span
              className={
                compareReport.status === 'ready'
                  ? 'status-badge status-badge--valid'
                  : 'status-badge status-badge--invalid'
              }
            >
              {compareBadgeLabel}
            </span>
            <p>{compareMessage}</p>
          </div>
        </section>

        {viewMode === 'diff' ? (
          <section className="diff-summary-grid">
            <div className="diff-stat-card">
              <span>{copy.changed}</span>
              <strong>{compareReport.stats.changed}</strong>
            </div>
            <div className="diff-stat-card">
              <span>{copy.added}</span>
              <strong>{compareReport.stats.added}</strong>
            </div>
            <div className="diff-stat-card">
              <span>{copy.removed}</span>
              <strong>{compareReport.stats.removed}</strong>
            </div>
            <div className="diff-stat-card">
              <span>{copy.totalEntries}</span>
              <strong>{compareReport.stats.total}</strong>
            </div>
          </section>
        ) : null}

        <section className="stage panel panel--inset">
          <div className="stage-heading">
            <div>
              <p className="meta-label">{copy.stage}</p>
              <h3>{viewMode === 'editor' ? copy.editorStage : copy.diffStage}</h3>
            </div>
            <p className="stage-hint">
              {viewMode === 'editor' ? copy.compareHintEdit : copy.compareHintDiff}
            </p>
          </div>

          <div className="editor-host">
            {viewMode === 'editor' ? (
              <Editor
                defaultLanguage="json"
                height="100%"
                loading={<div className="editor-loading">{copy.editorAriaLabel}</div>}
                onChange={handleEditorChange}
                options={{
                  ariaLabel: copy.editorAriaLabel,
                  automaticLayout: true,
                  fontFamily:
                    "'SF Mono', 'JetBrains Mono', SFMono-Regular, Menlo, ui-monospace, monospace",
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false
                }}
                theme="vs"
                value={editorText}
              />
            ) : (
              <DiffEditor
                height="100%"
                loading={<div className="editor-loading">{copy.diffView}</div>}
                modified={editorText}
                options={{
                  automaticLayout: true,
                  fontFamily:
                    "'SF Mono', 'JetBrains Mono', SFMono-Regular, Menlo, ui-monospace, monospace",
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false
                }}
                original={baselineText}
                theme="vs"
              />
            )}
          </div>
        </section>
      </main>

      <aside className="inspector panel">
        <div className="inspector-section">
          <p className="eyebrow">{copy.validation}</p>
          <div className="validation-heading">
            <h2>{validationHeadline}</h2>
            <span
              className={
                jsonDocument.status === 'valid'
                  ? 'status-badge status-badge--valid'
                  : 'status-badge status-badge--invalid'
              }
            >
              {jsonDocument.status === 'valid' ? copy.statusReady : copy.attention}
            </span>
          </div>
          <p className="status-copy">
            {jsonDocument.status === 'valid'
              ? locale === 'zh'
                ? '当前草稿可以继续格式化、压缩，或与捕获的基线进行对比。'
                : 'The current draft can be formatted, compressed, or compared against the captured baseline.'
              : locale === 'zh'
                ? '当前草稿被语法诊断阻塞，修复后才能继续。'
                : 'The current draft is blocked until the syntax diagnostics below are resolved.'}
          </p>

          {jsonDocument.status === 'invalid' ? (
            <ul className="diagnostic-list">
              {jsonDocument.diagnostics.map((diagnostic) => (
                <li className="diagnostic-card" key={`${diagnostic.line}-${diagnostic.column}`}>
                  <div className="diagnostic-title-row">
                    <strong>
                      {locale === 'zh'
                        ? `第 ${diagnostic.line} 行，第 ${diagnostic.column} 列`
                        : `Line ${diagnostic.line}, Column ${diagnostic.column}`}
                    </strong>
                    <span>
                      {locale === 'zh'
                        ? `位置 ${diagnostic.position}`
                        : `Pos ${diagnostic.position}`}
                    </span>
                  </div>
                  <p>{diagnostic.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="valid-state-card">
              <strong>{copy.validationPassed}</strong>
              <p>{copy.validationPassedDetail}</p>
            </div>
          )}
        </div>

        <div className="inspector-section inspector-section--accent">
          <p className="meta-label">{copy.structuredCompare}</p>
          <p className="status-copy">{compareMessage}</p>

          {compareReport.entries.length > 0 ? (
            <ul className="compare-entry-list">
              {compareReport.entries.map((entry) => (
                <li className="compare-entry-card" key={`${entry.kind}-${entry.path}`}>
                  <div className="compare-entry-header">
                    <strong>{entry.path}</strong>
                    <span className={`compare-kind compare-kind--${entry.kind}`}>
                      {entry.kind === 'added'
                        ? copy.added
                        : entry.kind === 'changed'
                          ? copy.changed
                          : copy.removed}
                    </span>
                  </div>
                  <p>
                    {copy.before}: {entry.before}
                  </p>
                  <p>
                    {copy.after}: {entry.after}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="valid-state-card">
              <strong>{copy.compareSummary}</strong>
              <p>{compareMessage}</p>
            </div>
          )}
        </div>

        <div className="inspector-section">
          <p className="meta-label">{copy.hydration}</p>
          <p className="status-copy">
            {isHydrated
              ? copy.synced
              : locale === 'zh'
                ? '当前仍在使用本地回退工作区状态。'
                : 'Preview mode is using the fallback workspace bootstrap.'}
          </p>
        </div>
      </aside>
    </div>
  )
}

export default App
