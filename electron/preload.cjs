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
  }
})
