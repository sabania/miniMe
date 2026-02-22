import { BrowserWindow } from 'electron'

/** Send event to all renderer windows */
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args)
  }
}
