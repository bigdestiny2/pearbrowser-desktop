const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pearbrowserRuntime', {
  sessionToken: ipcRenderer.sendSync('pearbrowser:runtime-session'),
  openDevTools: () => ipcRenderer.invoke('pearbrowser:open-devtools'),
  listPearApps: () => ipcRenderer.invoke('pearbrowser:pear-apps:list'),
  installPearApp: (app) => ipcRenderer.invoke('pearbrowser:pear-apps:install', app),
  launchPearApp: (target) => ipcRenderer.invoke('pearbrowser:pear-apps:launch', target),
  onPearAppProgress: (callback) => {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, data) => callback(data)
    ipcRenderer.on('pearbrowser:pear-apps:progress', listener)
    return () => ipcRenderer.removeListener('pearbrowser:pear-apps:progress', listener)
  },
  tabs: {
    load: (request) => ipcRenderer.invoke('pearbrowser:tabs:load', request),
    select: (request) => ipcRenderer.invoke('pearbrowser:tabs:select', request),
    hide: () => ipcRenderer.invoke('pearbrowser:tabs:hide'),
    close: (request) => ipcRenderer.invoke('pearbrowser:tabs:close', request),
    reload: (request) => ipcRenderer.invoke('pearbrowser:tabs:reload', request),
    openDevTools: (request) => ipcRenderer.invoke('pearbrowser:tabs:open-devtools', request),
    captureContext: (request) => ipcRenderer.invoke('pearbrowser:tabs:capture-context', request),
    onTabEvent: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('pearbrowser:tabs:event', listener)
      return () => ipcRenderer.removeListener('pearbrowser:tabs:event', listener)
    }
  }
})
