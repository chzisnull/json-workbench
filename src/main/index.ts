import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type {
  CreateWorkspaceWindowResult,
  WorkbenchBootstrap,
  WorkspaceSummary,
  WorkspacesChangedPayload
} from '../shared/workbench'

const workspaces = new Map<number, WorkspaceSummary>()

let workspaceCounter = 0

function createWorkspaceSummary(): WorkspaceSummary {
  workspaceCounter += 1

  return {
    id: `workspace-${String(workspaceCounter).padStart(2, '0')}`,
    label: `Workspace ${String(workspaceCounter).padStart(2, '0')}`,
    windowId: -1
  }
}

function listWorkspaces(): WorkspaceSummary[] {
  return [...workspaces.values()].sort((left, right) => left.windowId - right.windowId)
}

function getBootstrap(windowId: number): WorkbenchBootstrap {
  const currentWorkspace = workspaces.get(windowId)

  if (!currentWorkspace) {
    const fallbackWorkspace: WorkspaceSummary = {
      id: 'workspace-00',
      label: 'Workspace 00',
      windowId
    }

    return {
      currentWorkspace: fallbackWorkspace,
      workspaces: listWorkspaces()
    }
  }

  return {
    currentWorkspace,
    workspaces: listWorkspaces()
  }
}

function broadcastWorkspaceState(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    const payload: WorkspacesChangedPayload = getBootstrap(window.id)
    window.webContents.send('workbench:workspaces-updated', payload)
  }
}

function sanitizeWorkspaceLabel(label: string, fallback: string): string {
  const trimmedLabel = label.trim()

  if (trimmedLabel.length === 0) {
    return fallback
  }

  return trimmedLabel.slice(0, 48)
}

function loadRenderer(window: BrowserWindow): Promise<void> {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  }

  return window.loadFile(join(__dirname, '../renderer/index.html'))
}

function createWindow(): BrowserWindow {
  const windowState = createWorkspaceSummary()

  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const registeredWorkspace = {
    ...windowState,
    windowId: mainWindow.id
  }

  mainWindow.setTitle(`JSON Workbench • ${registeredWorkspace.label}`)
  workspaces.set(mainWindow.id, registeredWorkspace)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    broadcastWorkspaceState()
  })

  mainWindow.on('closed', () => {
    workspaces.delete(mainWindow.id)
    broadcastWorkspaceState()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  void loadRenderer(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.chz.jsonworkbench')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('workbench:get-bootstrap', (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    return getBootstrap(browserWindow?.id ?? -1)
  })

  ipcMain.handle('workbench:create-workspace-window', () => {
    const browserWindow = createWindow()
    const openedWorkspace = workspaces.get(browserWindow.id)

    if (!openedWorkspace) {
      throw new Error('workspace window failed to register')
    }

    const result: CreateWorkspaceWindowResult = {
      openedWorkspace,
      workspaces: listWorkspaces()
    }

    return result
  })

  ipcMain.handle('workbench:update-current-workspace-label', (event, label: string) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const currentWorkspace = browserWindow ? workspaces.get(browserWindow.id) : null

    if (!browserWindow || !currentWorkspace) {
      throw new Error('workspace window not found')
    }

    const nextWorkspace: WorkspaceSummary = {
      ...currentWorkspace,
      label: sanitizeWorkspaceLabel(label, currentWorkspace.label)
    }

    workspaces.set(browserWindow.id, nextWorkspace)
    browserWindow.setTitle(`JSON Workbench • ${nextWorkspace.label}`)

    const payload = getBootstrap(browserWindow.id)
    broadcastWorkspaceState()

    return payload
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
