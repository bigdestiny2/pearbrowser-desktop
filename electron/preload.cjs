const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pearbrowserRuntime', {
  sessionToken: ipcRenderer.sendSync('pearbrowser:runtime-session'),
  openDevTools: () => ipcRenderer.invoke('pearbrowser:open-devtools')
})
