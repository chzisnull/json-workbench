import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createFallbackBootstrap } from '../../shared/workbench'
import App from './App'
import { useWorkbenchStore } from './store/workbench-store'

const monacoSetup = vi.hoisted(() => ({
  ensureMonacoSetup: vi.fn()
}))

vi.mock('./lib/monaco-setup', () => monacoSetup)

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
  DiffEditor: ({ modified, original }: { modified?: string; original?: string }): React.JSX.Element => (
    <div data-testid="json-diff-editor">
      <pre>{original}</pre>
      <pre>{modified}</pre>
    </div>
  )
}))

describe('App', () => {
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

  it('renders a single editor card by default without workspace language', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /JSON Workbench/i })).toBeInTheDocument()
    expect(monacoSetup.ensureMonacoSetup).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/\bworkspace\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/工作区/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/当前文档快照/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Active document snapshots/i)).not.toBeInTheDocument()
    expect(screen.getAllByTestId('document-card')).toHaveLength(1)
    expect(screen.getByTestId('document-grid')).toHaveClass('single-column')
    expect(screen.getByRole('textbox', { name: /JSON 编辑器 文档 1/i })).toBeInTheDocument()
  })

  it('adds a second editor card and switches to multi-card layout', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.click(screen.getByRole('button', { name: /新增文档/i }))

    expect(screen.getAllByTestId('document-card')).toHaveLength(2)
    expect(screen.getByTestId('document-grid')).toHaveClass('has-multiple')
    expect(screen.getByRole('textbox', { name: /JSON 编辑器 文档 2/i })).toBeInTheDocument()
  })

  it('saves and restores the full workbench snapshot', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /JSON Workbench/i })
    fireEvent.click(screen.getByRole('button', { name: /新增文档/i }))

    const doc1 = screen.getByRole('textbox', { name: /JSON 编辑器 文档 1/i }) as HTMLTextAreaElement
    const doc2 = screen.getByRole('textbox', { name: /JSON 编辑器 文档 2/i }) as HTMLTextAreaElement

    fireEvent.change(doc1, {
      target: {
        value: '{"first":1}'
      }
    })
    fireEvent.change(doc2, {
      target: {
        value: '{"second":2}'
      }
    })

    fireEvent.click(screen.getByRole('button', { name: /保存快照/i }))
    expect(screen.getAllByTestId('history-card')).toHaveLength(1)

    fireEvent.change(doc1, {
      target: {
        value: '{"first":99}'
      }
    })
    fireEvent.change(doc2, {
      target: {
        value: '{"second":88}'
      }
    })
    fireEvent.click(screen.getByRole('button', { name: /切换到文档 1/i }))

    fireEvent.click(screen.getByTestId('history-card'))

    expect(doc1.value).toBe('{"first":1}')
    expect(doc2.value).toBe('{"second":2}')
    expect(screen.getAllByTestId('document-card')[1]).toHaveAttribute('data-active', 'true')
  })

  it('shows diagnostics and disables snapshot saving when active json is invalid', async () => {
    render(<App />)

    const editor = (await screen.findByRole('textbox', { name: /JSON 编辑器 文档 1/i })) as HTMLTextAreaElement
    fireEvent.change(editor, {
      target: {
        value: '{\n  "enabled":,\n  "count": 1\n}'
      }
    })

    expect(screen.getByTestId('active-diagnostic')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /保存快照/i })).toBeDisabled()
  })
})
