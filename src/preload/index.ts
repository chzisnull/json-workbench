import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { WorkbenchApi, WorkspacesChangedPayload } from '../shared/workbench'

const workbenchApi: WorkbenchApi = {
  getBootstrap: () => ipcRenderer.invoke('workbench:get-bootstrap'),
  createWorkspaceWindow: () => ipcRenderer.invoke('workbench:create-workspace-window'),
  updateWorkspaceLabel: (label) =>
    ipcRenderer.invoke('workbench:update-current-workspace-label', label),
  onWorkspacesChanged: (listener) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspacesChangedPayload
    ): void => {
      listener(payload)
    }

    ipcRenderer.on('workbench:workspaces-updated', subscription)

    return () => {
      ipcRenderer.removeListener('workbench:workspaces-updated', subscription)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('workbench', workbenchApi)
  } catch (error) {
    console.error(error)
  }
} else {
  const targetWindow = window as typeof window & {
    electron: typeof electronAPI
    workbench: WorkbenchApi
  }

  targetWindow.electron = electronAPI
  targetWindow.workbench = workbenchApi
}
