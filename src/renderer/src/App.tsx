import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { createFallbackBootstrap } from '../../shared/workbench'
import { compareJsonDocuments, inspectJsonDocument } from './lib/json-tools'
import { ensureMonacoSetup } from './lib/monaco-setup'
import { useWorkbenchStore } from './store/workbench-store'

type Locale = 'en' | 'zh'
type UtilityPanel = 'base64-to-image' | 'image-to-base64' | null

interface CompareRegion {
  content: string
  id: string
}

interface CompareModalState {
  documentId: string
  regions: CompareRegion[]
}

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
    subtitle: '格式化 · 快照 · 工具',
    format: '格式化',
    compress: '压缩',
    save: '保存快照',
    saveSnapshotTitle: '保存快照',
    saveSnapshotHint: '保存当前工作台里全部文档的状态',
    snapshotName: '快照名称',
    saveConfirm: '确认保存',
    cancel: '取消',
    addDocument: '新增文档',
    deleteDocument: '删除文档',
    history: '历史快照',
    noHistory: '暂无快照',
    noHistoryDescription: '保存当前全部文档状态，之后可一键恢复',
    valid: 'JSON 有效',
    invalid: 'JSON 无效',
    lines: '行',
    chars: '字符',
    errors: '错误',
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
    editorSurface: 'JSON',
    activateDocument: (index: number) => `切换到文档 ${index}`,
    untitled: '未命名文档',
    compactTitle: 'JSON Workbench',
    changeCount: (count: number) => `${count} 处变更`,
    restoreSnapshot: (label: string) => `恢复 ${label}`,
    snapshotSummary: (documentCount: number, preview: string) =>
      `${documentCount} 个文档 · ${preview}`,
    tools: '工具',
    imageToBase64: '图片转 Base64',
    base64ToImage: 'Base64 转图片',
    toolPanelTitle: '工具箱',
    imageUpload: '选择图片',
    dropImage: '拖拽图片到这里，或点击选择文件',
    selectedFile: '已选择文件',
    base64Result: 'Base64 结果',
    copy: '复制',
    pasteBase64: '粘贴 Base64',
    renderImage: '生成图片',
    downloadImage: '下载图片',
    closeTool: '关闭',
    imagePreview: '图片预览',
    defaultSnapshotName: (year: number, month: string, day: string) =>
      `${year}年${month}月${day}日`,
    compareAction: '对比',
    compareModalTitle: 'JSON 对比',
    compareOriginal: '原始 JSON',
    compareRegionLabel: (index: number) => `对比区域 ${index}`,
    compareInputPlaceholder: '右侧输入 JSON，自动高亮差异',
    addCompareRegion: '新增对比区域',
    compareInvalid: '待对比 JSON 无效',
    compareBlocked: '请先修复原始 JSON 错误',
    compareTipTitle: '使用说明',
    compareTipBody: '左侧是原始 JSON，右侧每个区域都可以输入新的 JSON，输入后会自动高亮差异。'
  },
  en: {
    subtitle: 'Format · Snapshot · Tools',
    format: 'Format',
    compress: 'Minify',
    save: 'Save Snapshot',
    saveSnapshotTitle: 'Save snapshot',
    saveSnapshotHint: 'Save the full state of all open documents',
    snapshotName: 'Snapshot name',
    saveConfirm: 'Save',
    cancel: 'Cancel',
    addDocument: 'New Editor',
    deleteDocument: 'Delete document',
    history: 'Snapshots',
    noHistory: 'No snapshots yet',
    noHistoryDescription: 'Save the full workbench state and restore it later',
    valid: 'Valid JSON',
    invalid: 'Invalid JSON',
    lines: 'Lines',
    chars: 'Chars',
    errors: 'Errors',
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
    editorSurface: 'JSON',
    activateDocument: (index: number) => `Switch to document ${index}`,
    untitled: 'Untitled document',
    compactTitle: 'JSON Workbench',
    changeCount: (count: number) => `${count} changes`,
    restoreSnapshot: (label: string) => `Restore ${label}`,
    snapshotSummary: (documentCount: number, preview: string) =>
      `${documentCount} docs · ${preview}`,
    tools: 'Tools',
    imageToBase64: 'Image to Base64',
    base64ToImage: 'Base64 to Image',
    toolPanelTitle: 'Toolkit',
    imageUpload: 'Choose image',
    dropImage: 'Drop an image here, or click to choose a file',
    selectedFile: 'Selected file',
    base64Result: 'Base64 result',
    copy: 'Copy',
    pasteBase64: 'Paste Base64',
    renderImage: 'Render image',
    downloadImage: 'Download image',
    closeTool: 'Close',
    imagePreview: 'Preview',
    defaultSnapshotName: (year: number, month: string, day: string) => `${year}-${month}-${day}`,
    compareAction: 'Compare',
    compareModalTitle: 'JSON Compare',
    compareOriginal: 'Original JSON',
    compareRegionLabel: (index: number) => `Compare ${index}`,
    compareInputPlaceholder: 'Type JSON on the right and differences update automatically',
    addCompareRegion: 'Add compare region',
    compareInvalid: 'Comparison JSON invalid',
    compareBlocked: 'Fix source JSON before comparing',
    compareTipTitle: 'How it works',
    compareTipBody:
      'The left panel is the original JSON. Each panel on the right accepts new JSON and highlights differences automatically.'
  }
}

function cloneDocuments(documents: DocumentPanel[]): DocumentPanel[] {
  return documents.map((document) => ({ ...document }))
}

function createDefaultSnapshotName(locale: Locale): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return translations[locale].defaultSnapshotName(year, month, day)
}

function normalizeBase64ImageSource(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }

  return `data:image/png;base64,${trimmed}`
}

function createCompareRegion(): CompareRegion {
  return {
    content: '',
    id: `compare-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }
}

function App(): React.JSX.Element {
  const hydrate = useWorkbenchStore((state) => state.hydrate)

  const [documents, setDocuments] = useState<DocumentPanel[]>(() => [createDocumentPanel()])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [locale, setLocale] = useState<Locale>('zh')
  const [isReady, setIsReady] = useState(false)
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel>(null)
  const [compareModal, setCompareModal] = useState<CompareModalState | null>(null)
  const [base64Input, setBase64Input] = useState('')
  const [base64Preview, setBase64Preview] = useState<string | null>(null)
  const [imageBase64Result, setImageBase64Result] = useState('')
  const [isDropzoneActive, setIsDropzoneActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
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

    const init = async (): Promise<void> => {
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
        const baselineDocument =
          latestSnapshot?.documents.find(
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
    documentStates.find((state) => state.document.id === activeDocumentId) ??
    documentStates[0] ??
    null
  const compareSourceState = compareModal
    ? (documentStates.find((state) => state.document.id === compareModal.documentId) ?? null)
    : null

  const updateDocument = (
    documentId: string,
    updater: (document: DocumentPanel) => DocumentPanel
  ): void => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === documentId ? updater(document) : document
      )
    )
  }

  const handleAddDocument = (): void => {
    const nextDocument = createDocumentPanel()
    setDocuments((currentDocuments) => [...currentDocuments, nextDocument])
    setActiveDocumentId(nextDocument.id)
  }

  const openCompareModal = (documentId: string): void => {
    setCompareModal({
      documentId,
      regions: [createCompareRegion()]
    })
  }

  const updateCompareRegion = (regionId: string, content: string): void => {
    setCompareModal((current) =>
      current
        ? {
            ...current,
            regions: current.regions.map((region) =>
              region.id === regionId ? { ...region, content } : region
            )
          }
        : current
    )
  }

  const handleAddCompareRegion = (): void => {
    setCompareModal((current) =>
      current
        ? {
            ...current,
            regions: [...current.regions, createCompareRegion()]
          }
        : current
    )
  }

  const handleDeleteCompareRegion = (regionId: string): void => {
    setCompareModal((current) => {
      if (!current || current.regions.length <= 1) {
        return current
      }

      return {
        ...current,
        regions: current.regions.filter((region) => region.id !== regionId)
      }
    })
  }

  const handleDeleteDocument = (
    event: React.MouseEvent<HTMLButtonElement>,
    documentId: string
  ): void => {
    event.stopPropagation()

    setDocuments((currentDocuments) => {
      if (currentDocuments.length <= 1) {
        return currentDocuments
      }

      const nextDocuments = currentDocuments.filter((document) => document.id !== documentId)

      setActiveDocumentId((currentActiveId) => {
        if (currentActiveId !== documentId) {
          return currentActiveId
        }

        return nextDocuments[0]?.id ?? null
      })

      return nextDocuments
    })
  }

  const openSnapshotDialog = (): void => {
    setSnapshotName(createDefaultSnapshotName(locale))
    setIsSnapshotDialogOpen(true)
  }

  const handleConfirmSnapshot = (): void => {
    if (!activeDocumentState || activeDocumentState.inspection.status === 'invalid') {
      return
    }

    const nextLabel =
      snapshotName.trim().length > 0 ? snapshotName.trim() : createDefaultSnapshotName(locale)

    setHistory((currentHistory) => {
      const preview = activeDocumentState.document.content
        .substring(0, 64)
        .replace(/\n/g, ' ')
        .trim()
      const snapshot: HistoryEntry = {
        activeDocumentId: activeDocumentState.document.id,
        documents: cloneDocuments(documents),
        id: `snapshot-${Date.now()}`,
        label: nextLabel,
        summary: t.snapshotSummary(
          documents.length,
          preview.length > 0 ? `${preview}…` : t.untitled
        ),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      return [snapshot, ...currentHistory].slice(0, 20)
    })

    setIsSnapshotDialogOpen(false)
  }

  const handleRestoreSnapshot = (snapshot: HistoryEntry): void => {
    const restoredDocuments = cloneDocuments(snapshot.documents)
    const restoredActiveId =
      snapshot.activeDocumentId &&
      restoredDocuments.some((document) => document.id === snapshot.activeDocumentId)
        ? snapshot.activeDocumentId
        : (restoredDocuments[0]?.id ?? null)

    setDocuments(restoredDocuments)
    setActiveDocumentId(restoredActiveId)
  }

  const handleDeleteSnapshot = (
    event: React.MouseEvent<HTMLButtonElement>,
    snapshotId: string
  ): void => {
    event.stopPropagation()
    setHistory((currentHistory) => currentHistory.filter((snapshot) => snapshot.id !== snapshotId))
  }

  const processImageFile = async (file: File): Promise<void> => {
    const nextBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

    setImageBase64Result(nextBase64)
  }

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    await processImageFile(file)
  }

  const handleImageDrop = async (event: React.DragEvent<HTMLLabelElement>): Promise<void> => {
    event.preventDefault()
    setIsDropzoneActive(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    await processImageFile(file)
  }

  const handleCopyBase64 = async (): Promise<void> => {
    if (!imageBase64Result || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(imageBase64Result)
  }

  const handleRenderBase64Image = (): void => {
    setBase64Preview(normalizeBase64ImageSource(base64Input))
  }

  if (!isReady || !activeDocumentState) {
    return (
      <div className="loading-screen">
        <span>{t.loading}</span>
      </div>
    )
  }

  return (
    <>
      <div
        className={`app-shell locale-${locale} ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      >
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
                  onClick={openSnapshotDialog}
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
              <div
                className={`tools-popover ${isToolsOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setIsToolsOpen(true)}
                onMouseLeave={() => setIsToolsOpen(false)}
              >
                <button
                  aria-expanded={isToolsOpen}
                  aria-haspopup="menu"
                  className="toolbar-button tools-button"
                  onClick={() => setIsToolsOpen((current) => !current)}
                  type="button"
                >
                  <span className="tools-button-icon">⌘</span>
                  <span>{t.tools}</span>
                  <span className="tools-button-caret">▾</span>
                </button>
                <div className="tools-menu" role="menu">
                  <div className="tools-menu-label">{t.toolPanelTitle}</div>
                  <button
                    className="tools-menu-item"
                    onClick={() => {
                      setActiveUtilityPanel('image-to-base64')
                      setIsToolsOpen(false)
                    }}
                    type="button"
                  >
                    {t.imageToBase64}
                  </button>
                  <button
                    className="tools-menu-item"
                    onClick={() => {
                      setActiveUtilityPanel('base64-to-image')
                      setIsToolsOpen(false)
                    }}
                    type="button"
                  >
                    {t.base64ToImage}
                  </button>
                </div>
              </div>

              <button
                aria-label={locale === 'zh' ? t.switchToEnglish : t.switchToChinese}
                className="locale-button"
                onClick={() => setLocale((current) => (current === 'zh' ? 'en' : 'zh'))}
                type="button"
              >
                {locale === 'zh' ? 'EN' : '中文'}
              </button>
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
                        <div className="document-title-row">
                          <span className="eyebrow">{t.editorSurface}</span>
                          <div
                            className={`document-status-tag ${state.inspection.status}`}
                            data-testid={isActive ? 'document-status-tag' : undefined}
                          >
                            <span className="document-status-dot"></span>
                            <span>{statusText}</span>
                          </div>
                        </div>
                        <h2>{label}</h2>
                        {state.latestSnapshot ? (
                          <p>{`${t.latestSnapshot} · ${state.latestSnapshot.timestamp}`}</p>
                        ) : documents.length > 1 ? (
                          <p>{t.documentHint}</p>
                        ) : null}
                      </div>

                      <div className="document-meta">
                        <button
                          aria-label={`${t.compareAction} ${label}`}
                          className="document-compare-button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openCompareModal(state.document.id)
                          }}
                          type="button"
                        >
                          <span className="document-compare-icon">⇄</span>
                          {t.compareAction}
                        </button>
                        <span>
                          {t.lines} {state.inspection.stats.lineCount}
                        </span>
                        <span>
                          {t.chars} {state.inspection.stats.charCount}
                        </span>
                        <button
                          aria-label={`${t.deleteDocument} ${label}`}
                          className="document-delete-button"
                          disabled={documents.length <= 1}
                          onClick={(event) => handleDeleteDocument(event, state.document.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="editor-surface soft-panel">
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
                    </div>

                    {state.inspection.status === 'invalid' && (
                      <div className="document-card-footer">
                        <div
                          className="status-bar warning"
                          data-testid={isActive ? 'active-diagnostic' : undefined}
                        >
                          <span className="eyebrow">{t.diagnostics}</span>
                          <strong>{statusText}</strong>
                          <p>
                            {state.inspection.diagnostics[0]?.message} · Line{' '}
                            {state.inspection.diagnostics[0]?.line}, Column{' '}
                            {state.inspection.diagnostics[0]?.column}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </main>
      </div>

      {isSnapshotDialogOpen && (
        <div
          className="overlay-shell"
          role="dialog"
          aria-modal="true"
          aria-label={t.saveSnapshotTitle}
        >
          <div className="modal-card shell-panel">
            <div className="modal-header">
              <h3>{t.saveSnapshotTitle}</h3>
              <p>{t.saveSnapshotHint}</p>
            </div>
            <label className="modal-field">
              <span>{t.snapshotName}</span>
              <input
                value={snapshotName}
                onChange={(event) => setSnapshotName(event.target.value)}
                autoFocus
              />
            </label>
            <div className="modal-actions">
              <button
                className="toolbar-button"
                onClick={() => setIsSnapshotDialogOpen(false)}
                type="button"
              >
                {t.cancel}
              </button>
              <button
                className="toolbar-button primary"
                onClick={handleConfirmSnapshot}
                type="button"
              >
                {t.saveConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {compareModal && compareSourceState && (
        <div
          className="overlay-shell"
          role="dialog"
          aria-modal="true"
          aria-label={t.compareModalTitle}
        >
          <div className="compare-modal-card shell-panel">
            <div className="modal-header">
              <h3>{t.compareModalTitle}</h3>
              <p>{t.compareHint}</p>
            </div>

            <div className="compare-tip-banner soft-panel">
              <span className="compare-tip-icon">ⓘ</span>
              <div className="compare-tip-copy">
                <strong>{t.compareTipTitle}</strong>
                <p>{t.compareTipBody}</p>
              </div>
            </div>

            <div className="compare-modal-layout">
              <section className="compare-source-panel">
                <div className="compare-panel-head">
                  <span className="eyebrow">{t.compareOriginal}</span>
                </div>
                <div className="compare-editor-surface soft-panel">
                  <Editor
                    defaultLanguage="json"
                    height="100%"
                    loading={<div className="editor-loading">{t.loading}</div>}
                    options={{
                      ariaLabel: t.compareOriginal,
                      automaticLayout: true,
                      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                      fontSize: 12,
                      lineHeight: 1.55,
                      minimap: { enabled: false },
                      padding: { top: 14 },
                      readOnly: true,
                      renderLineHighlight: 'all',
                      scrollBeyondLastLine: false
                    }}
                    value={compareSourceState.document.content}
                  />
                </div>
              </section>

              <section className="compare-regions-grid">
                {compareModal.regions.map((region, index) => {
                  const regionDoc = inspectJsonDocument(region.content)
                  const regionReport =
                    region.content.trim().length > 0 && regionDoc.status === 'valid'
                      ? compareJsonDocuments(compareSourceState.document.content, region.content)
                      : null

                  return (
                    <article className="compare-region-panel shell-panel" key={region.id}>
                      <div className="compare-panel-head">
                        <span className="eyebrow">{t.compareRegionLabel(index + 1)}</span>
                        <div className="compare-region-actions">
                          {compareModal.regions.length > 1 ? (
                            <button
                              className="document-delete-button"
                              onClick={() => handleDeleteCompareRegion(region.id)}
                              type="button"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="compare-diff-surface soft-panel">
                        <DiffEditor
                          height="100%"
                          loading={<div className="editor-loading">{t.loading}</div>}
                          modified={region.content}
                          onMount={(editor) => {
                            const modifiedEditor = editor.getModifiedEditor()
                            modifiedEditor.onDidChangeModelContent(() => {
                              updateCompareRegion(region.id, modifiedEditor.getValue())
                            })
                          }}
                          options={{
                            automaticLayout: true,
                            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                            fontSize: 12,
                            renderSideBySide: true,
                            scrollBeyondLastLine: false,
                            useInlineViewWhenSpaceIsLimited: false
                          }}
                          original={compareSourceState.document.content}
                        />
                      </div>

                      <div className="compare-region-footer">
                        {region.content.trim().length === 0 ? (
                          <div className="status-bar">
                            <span className="eyebrow">{t.diffSummary}</span>
                            <p>{t.compareInputPlaceholder}</p>
                          </div>
                        ) : regionDoc.status === 'invalid' ? (
                          <div className="status-bar warning">
                            <span className="eyebrow">{t.diagnostics}</span>
                            <strong>{t.compareInvalid}</strong>
                            <p>{regionDoc.diagnostics[0]?.message}</p>
                          </div>
                        ) : regionReport?.status === 'blocked' ? (
                          <div className="status-bar warning">
                            <span className="eyebrow">{t.diagnostics}</span>
                            <strong>{t.compareBlocked}</strong>
                            <p>{regionReport.message}</p>
                          </div>
                        ) : regionReport ? (
                          <div className="status-bar">
                            <span className="eyebrow">{t.diffSummary}</span>
                            <div className="diff-inline-stats">
                              <span>
                                {t.added} {regionReport.stats.added}
                              </span>
                              <span>
                                {t.changed} {regionReport.stats.changed}
                              </span>
                              <span>
                                {t.removed} {regionReport.stats.removed}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </section>
            </div>

            <div className="modal-actions modal-actions-row">
              <button className="toolbar-button" onClick={handleAddCompareRegion} type="button">
                {t.addCompareRegion}
              </button>
              <button
                className="toolbar-button"
                onClick={() => setCompareModal(null)}
                type="button"
              >
                {t.closeTool}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeUtilityPanel && (
        <div
          className="overlay-shell"
          role="dialog"
          aria-modal="true"
          aria-label={t.toolPanelTitle}
        >
          <div className="utility-card shell-panel">
            <div className="modal-header">
              <h3>
                {activeUtilityPanel === 'image-to-base64' ? t.imageToBase64 : t.base64ToImage}
              </h3>
              <p>{t.toolPanelTitle}</p>
            </div>

            {activeUtilityPanel === 'image-to-base64' ? (
              <div className="utility-stack">
                <label
                  className={`upload-dropzone soft-panel ${isDropzoneActive ? 'is-active' : ''}`}
                  onDragEnter={() => setIsDropzoneActive(true)}
                  onDragLeave={() => setIsDropzoneActive(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleImageDrop}
                >
                  <input
                    ref={fileInputRef}
                    accept="image/*"
                    className="sr-only-input"
                    onChange={handleImageSelected}
                    type="file"
                  />
                  <span className="upload-dropzone-title">{t.imageUpload}</span>
                  <span className="upload-dropzone-hint">{t.dropImage}</span>
                  {imageBase64Result ? (
                    <span className="upload-dropzone-file">{t.selectedFile}</span>
                  ) : null}
                </label>
                <textarea readOnly value={imageBase64Result} placeholder={t.base64Result} />
                <div className="modal-actions modal-actions-row">
                  <button className="toolbar-button" onClick={handleCopyBase64} type="button">
                    {t.copy}
                  </button>
                  <button
                    className="toolbar-button"
                    onClick={() => setActiveUtilityPanel(null)}
                    type="button"
                  >
                    {t.closeTool}
                  </button>
                </div>
              </div>
            ) : (
              <div className="utility-stack">
                <textarea
                  value={base64Input}
                  onChange={(event) => setBase64Input(event.target.value)}
                  placeholder={t.pasteBase64}
                />
                <div className="modal-actions modal-actions-row utility-actions">
                  <button
                    className="toolbar-button"
                    onClick={handleRenderBase64Image}
                    type="button"
                  >
                    {t.renderImage}
                  </button>
                  {base64Preview ? (
                    <a className="toolbar-button" download="decoded-image.png" href={base64Preview}>
                      {t.downloadImage}
                    </a>
                  ) : null}
                  <button
                    className="toolbar-button"
                    onClick={() => setActiveUtilityPanel(null)}
                    type="button"
                  >
                    {t.closeTool}
                  </button>
                </div>
                {base64Preview ? (
                  <div className="image-preview-panel soft-panel">
                    <span className="eyebrow">{t.imagePreview}</span>
                    <img alt={t.imagePreview} src={base64Preview} />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
