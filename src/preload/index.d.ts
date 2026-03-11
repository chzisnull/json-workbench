import { ElectronAPI } from '@electron-toolkit/preload'
import type { WorkbenchApi } from '../shared/workbench'

declare global {
  interface Window {
    electron: ElectronAPI
    workbench?: WorkbenchApi
  }
}
