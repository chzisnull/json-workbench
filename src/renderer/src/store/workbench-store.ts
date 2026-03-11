import { create } from 'zustand'
import {
  createFallbackBootstrap,
  type ViewMode,
  type WorkbenchBootstrap,
  type WorkspaceSummary
} from '../../../shared/workbench'

interface WorkbenchState {
  bootstrap: WorkbenchBootstrap
  isHydrated: boolean
  viewMode: ViewMode
  hydrate: (bootstrap: WorkbenchBootstrap) => void
  setViewMode: (viewMode: ViewMode) => void
  syncWorkspaces: (workspaces: WorkspaceSummary[]) => void
}

const fallbackBootstrap = createFallbackBootstrap()

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  bootstrap: fallbackBootstrap,
  isHydrated: false,
  viewMode: 'editor',
  hydrate: (bootstrap) => set({ bootstrap, isHydrated: true }),
  setViewMode: (viewMode) => set({ viewMode }),
  syncWorkspaces: (workspaces) =>
    set((state) => ({
      bootstrap: {
        ...state.bootstrap,
        workspaces
      }
    }))
}))
