import { useEffect, useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { createFallbackBootstrap } from '../../shared/workbench'
import { compareJsonDocuments, inspectJsonDocument } from './lib/json-tools'
import { ensureMonacoSetup } from './lib/monaco-setup'
import { useWorkbenchStore } from './store/workbench-store'

type Locale = 'en' | 'zh'

interface DocumentPanel {
  id: string
  content: string
}

interface HistoryEntry {
  activeDocumentId: string | null
  documents: DocumentPanel[]
  id: string
  label: string
  summary: string
  timestamp: string
}

const sampleJson = `{
  "app": "JSON Tool",
  "version": "1.1.0",
  "status": "Refactored",
  "ui": "Apple Master Level"
}`

const createPanelId = (): string => `doc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const createDocumentPanel = (content = sampleJson): DocumentPanel => ({
  id: createPanelId(),
  content
})

const translations = {
  zh: {
    subtitle: '格式化 · 对比 · 快照',
    editorView: '编辑',
    diffView: '对比',
    format: '格式化',
    compress: '压缩',
    save: '保存快照',
    addDocument: '新增文档',
    history: '历史快照',
    noHistory: '暂无快照',
    noHistoryDescription: '保存当前全部文档状态，之后可一键恢复',
    valid: 'JSON 有效',
    invalid: 'JSON 无效',
    lines: '行',
    chars: '字符',
    errors: '错误',
    sync: '在线',
    offline: '离线',
    loading: '准备编辑器...',
    switchToEnglish: 'Switch to English',
    switchToChinese: '切换到中文',
    diffSummary: '差异摘要',
    added: '新增',
    changed: '变更',
    removed: '移除',
    diagnostics: '解析诊断',
    compareHint: '保存快照后可查看差异',
    noChanges: '当前内容与最近快照一致',
    documentLabel: (index: number) => `文档 ${index}`,
    documentHint: '点击切换当前文档',
    latestSnapshot: '最近快照',
    newSnapshotLabel: (index: number) => `快照 ${String(index).padStart(2, '0')}`,
    editorSurface: 'JSON',
    activateDocument: (index: number) => `切换到文档 ${index}`,
    snapshotCount: (count: number) => `${count} 个快照`,
    untitled: '未命名文档',
    compactTitle: 'JSON Workbench',
    changeCount: (count: number) => `${count} 处变更`,
    restoreSnapshot: (label: string) => `恢复 ${label}`,
    snapshotSummary: (documentCount: number, preview: string) =>
      `${documentCount} 个文档 · ${preview}`
  },
  en: {
    subtitle: 'Format · Diff · Snapshot',
    editorView: 'Editor',
    diffView: 'Diff',
    format: 'Format',
    compress: 'Minify',
    save: 'Save Snapshot',
    addDocument: 'New Editor',
    history: 'Snapshots',
    noHistory: 'No snapshots yet',
    noHistoryDescription: 'Save the full workbench state and restore it later',
    valid: 'Valid JSON',
    invalid: 'Invalid JSON',
    lines: 'Lines',
    chars: 'Chars',
    errors: 'Errors',
    sync: 'Online',
    offline: 'Offline',
    loading: 'Preparing editor...',
    switchToEnglish: 'Switch to English',
    switchToChinese: '切换到中文',
    diffSummary: 'Change summary',
    added: 'Added',
    changed: 'Changed',
    removed: 'Removed',
    diagnostics: 'Diagnostics',
    compareHint: 'Save a snapshot to inspect changes',
    noChanges: 'Current content matches the latest snapshot',
    documentLabel: (index: number) => `Document ${index}`,
    documentHint: 'Click to focus editing',
    latestSnapshot: 'Latest snapshot',
    newSnapshotLabel: (index: number) => `Snapshot ${String(index).padStart(2, '0')}`,
    editorSurface: 'JSON',
    activateDocument: (index: number) => `Switch to document ${index}`,
    snapshotCount: (count: number) => `${count} snapshots`,
    untitled: 'Untitled document',
    compactTitle: 'JSON Workbench',
    changeCount: (count: number) => `${count} changes`,
    restoreSnapshot: (label: string) => `Restore ${label}`,
    snapshotSummary: (documentCount: number, preview: string) =>
      `${documentCount} docs · ${preview}`
  }
}

function cloneDocuments(documents: DocumentPanel[]): DocumentPanel[] {
  return documents.map((document) => ({ ...document }))
}

function App(): React.JSX.Element {
  const isHydrated = useWorkbenchStore((state) => state.isHydrated)
  const viewMode = useWorkbenchStore((state) => state.viewMode)
  const hydrate = useWorkbenchStore((state) => state.hydrate)
  const setViewMode = useWorkbenchStore((state) => state.setViewMode)

  const [documents, setDocuments] = useState<DocumentPanel[]>(() => [createDocumentPanel()])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [locale, setLocale] = useState<Locale>('zh')
  const [isReady, setIsReady] = useState(false)

  const t = translations[locale]

  useEffect(() => {
    ensureMonacoSetup()
  }, [])

  useEffect(() => {
    if (!activeDocumentId && documents[0]) {
      setActiveDocumentId(documents[0].id)
    }
  }, [activeDocumentId, documents])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        if (window.workbench) {
          const nextBootstrap = await window.workbench.getBootstrap()
          if (mounted) {
            hydrate(nextBootstrap)
          }
        } else if (mounted) {
          hydrate(createFallbackBootstrap())
        }
      } catch {
        if (mounted) {
          hydrate(createFallbackBootstrap())
        }
      } finally {
        if (mounted) {
          setIsReady(true)
        }
      }
    }

    void init()

    return () => {
      mounted = false
    }
  }, [hydrate])

  const latestSnapshot = history[0] ?? null

  const documentStates = useMemo(
    () =>
      documents.map((document) => {
        const inspection = inspectJsonDocument(document.content)
        const baselineDocument = latestSnapshot?.documents.find(
          (snapshotDocument) => snapshotDocument.id === document.id
        ) ?? null
        const compareReport = baselineDocument
          ? compareJsonDocuments(baselineDocument.content, document.content)
          : null

        return {
          document,
          inspection,
          baselineDocument,
          compareReport,
          latestSnapshot
        }
      }),
    [documents, latestSnapshot]
  )

  const activeDocumentState =
    documentStates.find((state) => state.document.id === activeDocumentId) ?? documentStates[0] ?? null

  const updateDocument = (documentId: string, updater: (document: DocumentPanel) => DocumentPanel): void => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) => (document.id === documentId ? updater(document) : document))
    )
  }

  const handleAddDocument = (): void => {
    const nextDocument = createDocumentPanel()
    setDocuments((currentDocuments) => [...currentDocuments, nextDocument])
    setActiveDocumentId(nextDocument.id)
  }

  const handleSaveSnapshot = (): void => {
    if (!activeDocumentState || activeDocumentState.inspection.status === 'invalid') {
      return
    }

    setHistory((currentHistory) => {
      const nextIndex = currentHistory.length + 1
      const preview = activeDocumentState.document.content.substring(0, 64).replace(/\n/g, ' ').trim()
      const snapshot: HistoryEntry = {
        activeDocumentId: activeDocumentState.document.id,
        documents: cloneDocuments(documents),
        id: `snapshot-${Date.now()}`,
        label: t.newSnapshotLabel(nextIndex),
        summary: t.snapshotSummary(documents.length, preview.length > 0 ? `${preview}…` : t.untitled),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      return [snapshot, ...currentHistory].slice(0, 20)
    })
  }

  const handleRestoreSnapshot = (snapshot: HistoryEntry): void => {
    const restoredDocuments = cloneDocuments(snapshot.documents)
    const restoredActiveId =
      snapshot.activeDocumentId && restoredDocuments.some((document) => document.id === snapshot.activeDocumentId)
        ? snapshot.activeDocumentId
        : restoredDocuments[0]?.id ?? null

    setDocuments(restoredDocuments)
    setActiveDocumentId(restoredActiveId)
  }

  const handleDeleteSnapshot = (event: React.MouseEvent<HTMLButtonElement>, snapshotId: string): void => {
    event.stopPropagation()
    setHistory((currentHistory) => currentHistory.filter((snapshot) => snapshot.id !== snapshotId))
  }

  if (!isReady || !activeDocumentState) {
    return (
      <div className="loading-screen">
        <span>{t.loading}</span>
      </div>
    )
  }

  return (
    <div className={`app-shell locale-${locale} ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="app-glow glow-left"></div>
      <div className="app-glow glow-right"></div>

      <aside className="sidebar shell-panel">
        <div className="sidebar-header">
          <button
            aria-label={isSidebarOpen ? 'Collapse snapshot sidebar' : 'Expand snapshot sidebar'}
            className="icon-button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            type="button"
          >
            {isSidebarOpen ? '‹' : '›'}
          </button>

          {isSidebarOpen && (
            <div className="sidebar-copy">
              <strong>{t.history}</strong>
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-card soft-panel">
                <p>{t.noHistory}</p>
                <span>{t.noHistoryDescription}</span>
              </div>
            ) : (
              history.map((snapshot) => (
                <article
                  aria-label={t.restoreSnapshot(snapshot.label)}
                  className="history-card"
                  key={snapshot.id}
                  onClick={() => handleRestoreSnapshot(snapshot)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleRestoreSnapshot(snapshot)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid="history-card"
                >
                  <div className="history-card-head">
                    <span className="time-chip">{snapshot.timestamp}</span>
                    <button
                      aria-label={`Delete ${snapshot.label}`}
                      className="ghost-delete"
                      onClick={(event) => handleDeleteSnapshot(event, snapshot.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  <h4>{snapshot.label}</h4>
                  <p>{snapshot.summary}</p>
                </article>
              ))
            )}
          </div>
        )}
      </aside>

      <main className="main-shell">
        <header className="topbar shell-panel">
          <div className="brand-block">
            <h1>{t.compactTitle}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className="toolbar-cluster">
            <div aria-label="View mode" className="segmented-control" role="tablist">
              <button
                aria-pressed={viewMode === 'editor'}
                className={viewMode === 'editor' ? 'active' : ''}
                onClick={() => setViewMode('editor')}
                type="button"
              >
                {t.editorView}
              </button>
              <button
                aria-pressed={viewMode === 'diff'}
                className={viewMode === 'diff' ? 'active' : ''}
                onClick={() => setViewMode('diff')}
                type="button"
              >
                {t.diffView}
              </button>
            </div>

            <div className="action-group">
              <button
                className="toolbar-button"
                onClick={() =>
                  updateDocument(activeDocumentState.document.id, (document) => ({
                    ...document,
                    content: activeDocumentState.inspection.formattedText
                  }))
                }
                type="button"
              >
                {t.format}
              </button>
              <button
                className="toolbar-button"
                onClick={() =>
                  updateDocument(activeDocumentState.document.id, (document) => ({
                    ...document,
                    content: activeDocumentState.inspection.minifiedText
                  }))
                }
                type="button"
              >
                {t.compress}
              </button>
              <button
                className="toolbar-button primary"
                onClick={handleSaveSnapshot}
                type="button"
                disabled={activeDocumentState.inspection.status === 'invalid'}
              >
                {t.save}
              </button>
              <button className="toolbar-button" onClick={handleAddDocument} type="button">
                {t.addDocument}
              </button>
            </div>
          </div>

          <div className="toolbar-meta">
            <button
              aria-label={locale === 'zh' ? t.switchToEnglish : t.switchToChinese}
              className="locale-button"
              onClick={() => setLocale((current) => (current === 'zh' ? 'en' : 'zh'))}
              type="button"
            >
              {locale === 'zh' ? 'EN' : '中文'}
            </button>
            <span className={`status-pill ${activeDocumentState.inspection.status}`}>
              {activeDocumentState.inspection.status === 'valid' ? t.valid : t.invalid}
            </span>
          </div>
        </header>

        <section className="content-scroll">
          <div
            className={`document-grid ${documents.length === 1 ? 'single-column' : 'has-multiple'}`}
            data-testid="document-grid"
          >
            {documentStates.map((state, index) => {
              const isActive = state.document.id === activeDocumentState.document.id
              const label = t.documentLabel(index + 1)
              const statusText = state.inspection.status === 'valid' ? t.valid : t.invalid

              return (
                <article
                  aria-label={t.activateDocument(index + 1)}
                  className={`document-card shell-panel ${isActive ? 'is-active' : ''}`}
                  data-active={isActive}
                  data-testid="document-card"
                  key={state.document.id}
                  onClick={() => setActiveDocumentId(state.document.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveDocumentId(state.document.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="document-card-header">
                    <div>
                      <span className="eyebrow">{t.editorSurface}</span>
                      <h2>{label}</h2>
                      {state.latestSnapshot ? (
                        <p>{`${t.latestSnapshot} · ${state.latestSnapshot.timestamp}`}</p>
                      ) : documents.length > 1 ? (
                        <p>{t.documentHint}</p>
                      ) : null}
                    </div>

                    <div className="document-meta">
                      <span>{t.lines} {state.inspection.stats.lineCount}</span>
                      <span>{t.chars} {state.inspection.stats.charCount}</span>
                    </div>
                  </div>

                  <div className="editor-surface soft-panel">
                    {viewMode === 'editor' ? (
                      <Editor
                        defaultLanguage="json"
                        height="100%"
                        loading={<div className="editor-loading">{t.loading}</div>}
                        onChange={(value) =>
                          updateDocument(state.document.id, (document) => ({
                            ...document,
                            content: value ?? ''
                          }))
                        }
                        options={{
                          ariaLabel: `${locale === 'zh' ? 'JSON 编辑器' : 'JSON editor'} ${label}`,
                          automaticLayout: true,
                          cursorSmoothCaretAnimation: 'on',
                          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                          fontSize: 12,
                          lineHeight: 1.55,
                          minimap: { enabled: false },
                          padding: { top: 14 },
                          renderLineHighlight: 'all',
                          roundedSelection: true,
                          scrollBeyondLastLine: false,
                          smoothScrolling: true
                        }}
                        value={state.document.content}
                      />
                    ) : state.baselineDocument ? (
                      <DiffEditor
                        height="100%"
                        loading={<div className="editor-loading">{t.loading}</div>}
                        modified={state.document.content}
                        options={{
                          automaticLayout: true,
                          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                          fontSize: 12,
                          renderSideBySide: true,
                          scrollBeyondLastLine: false,
                          useInlineViewWhenSpaceIsLimited: false
                        }}
                        original={state.baselineDocument.content}
                      />
                    ) : (
                      <div className="compare-empty">{t.compareHint}</div>
                    )}
                  </div>

                  <div className="document-card-footer">
                    {state.inspection.status === 'invalid' ? (
                      <div className="status-bar warning" data-testid={isActive ? 'active-diagnostic' : undefined}>
                        <span className="eyebrow">{t.diagnostics}</span>
                        <strong>{statusText}</strong>
                        <p>
                          {state.inspection.diagnostics[0]?.message} · Line {state.inspection.diagnostics[0]?.line}, Column{' '}
                          {state.inspection.diagnostics[0]?.column}
                        </p>
                      </div>
                    ) : viewMode === 'diff' ? (
                      <div className="status-bar" data-testid={isActive ? 'diff-summary-panel' : undefined}>
                        <span className="eyebrow">{t.diffSummary}</span>
                        {state.compareReport ? (
                          <div className="diff-inline-stats" data-testid={isActive ? 'diff-summary-strip' : undefined}>
                            <span>{t.added} {state.compareReport.stats.added}</span>
                            <span>{t.changed} {state.compareReport.stats.changed}</span>
                            <span>{t.removed} {state.compareReport.stats.removed}</span>
                          </div>
                        ) : (
                          <p>{t.compareHint}</p>
                        )}
                      </div>
                    ) : (
                      <div className={`status-bar compact ${isActive ? 'active' : ''}`}>
                        <span className="eyebrow">{isHydrated ? t.sync : t.offline}</span>
                        <strong>{statusText}</strong>
                        {state.compareReport?.stats.total ? <p>{t.changeCount(state.compareReport.stats.total)}</p> : null}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
