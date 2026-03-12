import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useEffect, useRef, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createFallbackBootstrap } from '../../shared/workbench'
import App from './App'
import { useWorkbenchStore } from './store/workbench-store'

const mainCss = readFileSync(resolve(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')
let styleElement: HTMLStyleElement | null = null

const monacoSetup = vi.hoisted(() => ({
  ensureMonacoSetup: vi.fn()
}))

vi.mock('./lib/monaco-setup', () => monacoSetup)

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

vi.mock('@monaco-editor/react', () => ({
  loader: {
    config: vi.fn()
  },
  default: ({
    onChange,
    options,
    value
  }: {
    onChange?: (value: string) => void
    options?: { ariaLabel?: string }
    value?: string
  }): React.JSX.Element => (
    <textarea
      aria-label={options?.ariaLabel ?? 'json editor'}
      onChange={(event) => onChange?.(event.target.value)}
      value={value ?? ''}
    />
  ),
  DiffEditor: ({
    onMount,
    modified,
    options,
    original
  }: {
    onMount?: (editor: {
      getModifiedEditor: () => {
        getValue: () => string
        onDidChangeModelContent: (listener: () => void) => { dispose: () => void }
      }
    }) => void
    modified?: string
    options?: { ariaLabel?: string }
    original?: string
  }): React.JSX.Element => {
    const [value, setValue] = useState(modified ?? '')
    const valueRef = useRef(value)
    const listenersRef = useRef<Array<() => void>>([])

    useEffect(() => {
      valueRef.current = value
    }, [value])

    useEffect(() => {
      setValue(modified ?? '')
    }, [modified])

    useEffect(() => {
      if (!onMount) {
        return
      }

      onMount({
        getModifiedEditor: () => ({
          getValue: () => valueRef.current,
          onDidChangeModelContent: (listener) => {
            listenersRef.current.push(listener)

            return {
              dispose: () => {
                listenersRef.current = listenersRef.current.filter(
                  (currentListener) => currentListener !== listener
                )
              }
            }
          }
        })
      })
    }, [onMount])

    return (
      <div data-testid="json-diff-editor">
        <pre>{original}</pre>
        <textarea
          aria-label={options?.ariaLabel ?? 'json diff editor'}
          onChange={(event) => {
            const nextValue = event.target.value
            valueRef.current = nextValue
            setValue(nextValue)
            listenersRef.current.forEach((listener) => listener())
          }}
          value={value}
        />
      </div>
    )
  }
}))

describe('App', () => {
  beforeAll(() => {
    styleElement = document.createElement('style')
    styleElement.textContent = mainCss
    document.head.appendChild(styleElement)
  })

  beforeEach(() => {
    monacoSetup.ensureMonacoSetup.mockClear()
    delete window.workbench
    useWorkbenchStore.setState({
      bootstrap: createFallbackBootstrap(),
      isHydrated: false,
      viewMode: 'editor'
    })
  })

  afterEach(() => {
    cleanup()
  })

  afterAll(() => {
    styleElement?.remove()
    styleElement = null
  })

  it('renders a single editor card by default without workspace language', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /JSON Workbench/i })).toBeInTheDocument()
    expect(monacoSetup.ensureMonacoSetup).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/\bworkspace\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/工作区/i)).not.toBeInTheDocument()
    expect(screen.getAllByTestId('document-card')).toHaveLength(1)
    expect(screen.getByTestId('document-grid')).toHaveClass('single-column')
    expect(screen.getByRole('textbox', { name: /JSON 编辑器 文档 1/i })).toBeInTheDocument()
  })

  it('opens snapshot dialog with default date name and saves a custom full-workbench snapshot', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.click(screen.getByRole('button', { name: /新增文档/i }))

    const doc1 = screen.getByRole('textbox', { name: /JSON 编辑器 文档 1/i }) as HTMLTextAreaElement
    const doc2 = screen.getByRole('textbox', { name: /JSON 编辑器 文档 2/i }) as HTMLTextAreaElement

    fireEvent.change(doc1, { target: { value: '{"first":1}' } })
    fireEvent.change(doc2, { target: { value: '{"second":2}' } })
    fireEvent.click(screen.getByRole('button', { name: /切换到文档 2/i }))

    fireEvent.click(screen.getByRole('button', { name: /保存快照/i }))

    const dialogInput = screen.getByDisplayValue(/\d{4}年\d{2}月\d{2}日/) as HTMLInputElement
    fireEvent.change(dialogInput, { target: { value: '发布前快照' } })
    fireEvent.click(screen.getByRole('button', { name: /确认保存/i }))

    expect(screen.getAllByTestId('history-card')).toHaveLength(1)
    expect(screen.getByText('发布前快照')).toBeInTheDocument()

    fireEvent.change(doc1, { target: { value: '{"first":99}' } })
    fireEvent.change(doc2, { target: { value: '{"second":88}' } })
    fireEvent.click(screen.getByTestId('history-card'))

    expect(doc1.value).toBe('{"first":1}')
    expect(doc2.value).toBe('{"second":2}')
    expect(screen.getAllByTestId('document-card')[1]).toHaveAttribute('data-active', 'true')
  })

  it('shows status as a title tag instead of the old bottom valid bar', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    expect(screen.getByTestId('document-status-tag')).toHaveTextContent(/JSON 有效/i)
    expect(screen.queryByTestId('active-diagnostic')).not.toBeInTheDocument()
  })

  it('keeps the main workspace scrollable when multiple document cards are open', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    const addDocumentButton = screen.getByRole('button', { name: /新增文档/i })

    fireEvent.click(addDocumentButton)
    fireEvent.click(addDocumentButton)
    fireEvent.click(addDocumentButton)

    expect(screen.getAllByTestId('document-card')).toHaveLength(4)
    expect(getComputedStyle(document.querySelector('.main-shell') as HTMLElement).minHeight).toBe(
      '0px'
    )
    expect(getComputedStyle(document.querySelector('.main-shell') as HTMLElement).overflow).toBe(
      'hidden'
    )
    expect(
      getComputedStyle(document.querySelector('.content-scroll') as HTMLElement).overflowY
    ).toBe('auto')
  })

  it('opens a document-level compare modal from the card header', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.click(screen.getByRole('button', { name: /对比 文档 1/i }))

    expect(screen.getByRole('dialog', { name: /JSON 对比/i })).toBeInTheDocument()
    expect(screen.getByText(/^原始 JSON$/)).toBeInTheDocument()
    expect(screen.getByText(/^对比区域 1$/)).toBeInTheDocument()
  })

  it('blocks compare results when the source json is invalid', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.change(screen.getByRole('textbox', { name: /JSON 编辑器 文档 1/i }), {
      target: { value: '{"broken": }' }
    })

    fireEvent.click(screen.getByRole('button', { name: /对比 文档 1/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /json diff editor/i }), {
      target: { value: '{"fixed": true}' }
    })

    expect(screen.getByText(/请先修复原始 JSON 错误/i)).toBeInTheDocument()
    expect(screen.queryByText(/^新增 0$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^变更 0$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^移除 0$/)).not.toBeInTheDocument()
  })

  it('opens utility menu and renders the base64 tools entry points', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.click(screen.getByRole('button', { name: /工具/i }))

    expect(screen.getByRole('button', { name: /图片转 Base64/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Base64 转图片/i })).toBeInTheDocument()
  })
})
