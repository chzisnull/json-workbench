import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

type WorkbenchListener = (bootstrap: {
  currentWorkspace: { id: string; label: string; windowId: number }
  workspaces: Array<{ id: string; label: string; windowId: number }>
}) => void

let workbenchListener: WorkbenchListener | null = null

vi.mock('@monaco-editor/react', () => {
  const MockEditor = ({
    options,
    defaultValue,
    onChange,
    value
  }: {
    defaultValue?: string
    onChange?: (value: string) => void
    options?: { ariaLabel?: string }
    value?: string
  }): React.JSX.Element => (
    <textarea
      aria-label={options?.ariaLabel ?? 'json editor'}
      onChange={(event) => onChange?.(event.target.value)}
      value={value ?? defaultValue ?? ''}
    />
  )

  const MockDiffEditor = ({
    modified,
    original
  }: {
    modified?: string
    original?: string
  }): React.JSX.Element => (
    <div data-testid="monaco-diff-editor">
      <pre data-testid="diff-original">{original}</pre>
      <pre data-testid="diff-modified">{modified}</pre>
    </div>
  )

  return {
    default: MockEditor,
    DiffEditor: MockDiffEditor
  }
})

beforeEach(() => {
  workbenchListener = null
  delete window.workbench
})

describe('App shell', () => {
  it('renders the default Chinese workbench shell and actions', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /json 工作台/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^历史记录$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /收起历史记录/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建窗口/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /编辑视图/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /对比视图/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /格式化 json/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /压缩 json/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /捕获基线/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument()
  })

  it('collapses the history sidebar and keeps the main workspace usable', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /收起历史记录/i }))

    expect(screen.queryByRole('heading', { name: /^历史记录$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /展开历史记录/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /编辑视图/i })).toBeInTheDocument()
  })

  it('switches the primary UI copy to English', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /english/i }))

    expect(screen.getByRole('heading', { name: /json workbench/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editor view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /diff view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /capture baseline/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collapse history/i })).toBeInTheDocument()
    expect(screen.getByText(/^Compare workflow$/, { selector: '.meta-label' })).toBeInTheDocument()
  })

  it('shows live diagnostics when json becomes invalid', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText(/json 编辑器/i), {
      target: {
        value: '{\n  "name": "json",\n  "enabled":,\n  "count": 1\n}'
      }
    })

    expect(screen.getByText(/json 无效/i)).toBeInTheDocument()
    expect(screen.getByText(/第 3 行，第 13 列/i, { selector: 'strong' })).toBeInTheDocument()
  })

  it('shows compare stats and structured entries after capturing a baseline', () => {
    render(<App />)

    const editor = screen.getByLabelText(/json 编辑器/i) as HTMLTextAreaElement

    fireEvent.change(editor, {
      target: {
        value:
          '{\n  "service": "json-workbench",\n  "version": 1,\n  "flags": {\n    "sync": true\n  }\n}'
      }
    })

    fireEvent.click(screen.getByRole('button', { name: /捕获基线/i }))

    fireEvent.change(editor, {
      target: {
        value:
          '{\n  "service": "json-workbench",\n  "version": 2,\n  "flags": {\n    "sync": true,\n    "restore": true\n  }\n}'
      }
    })

    fireEvent.click(screen.getByRole('button', { name: /对比视图/i }))

    expect(screen.getByText(/^对比就绪$/, { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.getAllByText('1', { selector: '.diff-stat-card strong' })).toHaveLength(2)
    expect(screen.getByText(/\$\.version/i)).toBeInTheDocument()
    expect(screen.getByText(/\$\.flags\.restore/i)).toBeInTheDocument()
  })

  it('syncs workspace labels from the shared workbench channel', async () => {
    const updateWorkspaceLabel = vi.fn().mockResolvedValue({
      currentWorkspace: {
        id: 'workspace-01',
        label: 'Workspace Alpha',
        windowId: 1
      },
      workspaces: [
        {
          id: 'workspace-01',
          label: 'Workspace Alpha',
          windowId: 1
        },
        {
          id: 'workspace-02',
          label: 'Workspace Beta',
          windowId: 2
        }
      ]
    })

    window.workbench = {
      createWorkspaceWindow: vi.fn().mockResolvedValue({
        openedWorkspace: {
          id: 'workspace-02',
          label: 'Workspace Beta',
          windowId: 2
        },
        workspaces: [
          {
            id: 'workspace-01',
            label: 'Workspace 01',
            windowId: 1
          },
          {
            id: 'workspace-02',
            label: 'Workspace Beta',
            windowId: 2
          }
        ]
      }),
      getBootstrap: vi.fn().mockResolvedValue({
        currentWorkspace: {
          id: 'workspace-01',
          label: 'Workspace 01',
          windowId: 1
        },
        workspaces: [
          {
            id: 'workspace-01',
            label: 'Workspace 01',
            windowId: 1
          }
        ]
      }),
      onWorkspacesChanged: vi.fn((listener: WorkbenchListener) => {
        workbenchListener = listener
        return () => undefined
      }),
      updateWorkspaceLabel
    }

    render(<App />)

    const input = await screen.findByDisplayValue('Workspace 01')
    fireEvent.change(input, { target: { value: 'Workspace Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: /保存工作区名称/i }))

    expect(updateWorkspaceLabel).toHaveBeenCalledWith('Workspace Alpha')

    act(() => {
      workbenchListener?.({
        currentWorkspace: {
          id: 'workspace-01',
          label: 'Workspace Alpha',
          windowId: 1
        },
        workspaces: [
          {
            id: 'workspace-01',
            label: 'Workspace Alpha',
            windowId: 1
          },
          {
            id: 'workspace-02',
            label: 'Workspace Beta',
            windowId: 2
          }
        ]
      })
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Workspace Alpha')).toBeInTheDocument()
      expect(screen.getByText(/workspace beta/i)).toBeInTheDocument()
      expect(screen.getByText(/工作区已重命名/i)).toBeInTheDocument()
    })
  })
})
