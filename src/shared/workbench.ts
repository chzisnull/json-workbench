export type ViewMode = 'editor' | 'diff'

export interface WorkspaceSummary {
  id: string
  label: string
  windowId: number
}

export interface WorkbenchBootstrap {
  currentWorkspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
}

export interface CreateWorkspaceWindowResult {
  openedWorkspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
}

export interface WorkspacesChangedPayload {
  currentWorkspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
}

export interface WorkbenchApi {
  getBootstrap: () => Promise<WorkbenchBootstrap>
  createWorkspaceWindow: () => Promise<CreateWorkspaceWindowResult>
  updateWorkspaceLabel: (label: string) => Promise<WorkspacesChangedPayload>
  onWorkspacesChanged: (listener: (payload: WorkspacesChangedPayload) => void) => () => void
}

const fallbackWorkspace: WorkspaceSummary = {
  id: 'workspace-01',
  label: 'Workspace 01',
  windowId: 1
}

export const createFallbackBootstrap = (): WorkbenchBootstrap => ({
  currentWorkspace: fallbackWorkspace,
  workspaces: [fallbackWorkspace]
})
