'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const PEAR_KEY_RE = /^[13-9a-km-uw-z]{52}$/
const PEAR_VERSION_LINK_RE = /^pear:\/\/(?:[13-9a-km-uw-z]{52}|\d+\.\d+\.[13-9a-km-uw-z]{52}(?:\.[13-9a-km-uw-z]{52})?)$/
const SAFE_APP_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9 ._()+@-]{0,119}$/
const SAFE_PACKAGE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/

function normalizePearInstallLink (value) {
  const raw = String(value || '').trim()
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('Pear v3 install link must be a valid pear:// URL')
  }
  const host = String(parsed.hostname || '').toLowerCase()
  if (parsed.protocol !== 'pear:' || !PEAR_KEY_RE.test(host)) {
    throw new Error('Pear v3 install link must contain a canonical 52-character Pear key')
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
    throw new Error('Pear v3 install link must not contain a path, query, fragment, credentials, or port')
  }
  return `pear://${host}`
}

function safeCatalogId (value, fallback) {
  const id = String(value || '').trim()
  if (!id) return fallback
  if (id.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) throw new Error('Invalid catalogue app id')
  return id
}

function safeDisplayName (value, fallback) {
  const name = String(value || '').trim()
  if (!name) return fallback
  if (name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Invalid catalogue app name')
  return name
}

function guiExtension (platform) {
  if (platform === 'darwin') return '.app'
  if (platform === 'linux') return '.AppImage'
  if (platform === 'win32') return '.msix'
  throw new Error(`Pear v3 native apps are not supported on ${platform}`)
}

function allowedLinuxRoots (homeDir) {
  return [
    path.join(homeDir, 'Applications'),
    path.join(homeDir, 'AppImages'),
    path.join(homeDir, '.local', 'bin')
  ]
}

function validateResolvedTargets (targets, opts = {}) {
  const platform = opts.platform || process.platform
  const homeDir = opts.homeDir || os.homedir()
  const extension = guiExtension(platform)
  if (!Array.isArray(targets) || targets.length !== 1) {
    throw new Error('Pear package contains multiple installable targets; browser installs support one native application only')
  }

  const target = targets[0]
  const app = String(target && target.filename || '').trim()
  const ext = String(target && target.ext || '')
  const dest = target && target.dest == null ? null : path.resolve(String(target.dest))
  if (!SAFE_APP_NAME_RE.test(app) || target.isBin === true || ext !== extension) {
    throw new Error('Pear package contains a non-GUI executable target; browser installs support one native application only')
  }
  if (platform === 'darwin' && dest !== path.join('/Applications', app + extension)) {
    throw new Error('Pear package requested an unexpected macOS install destination')
  }
  if (platform === 'linux' && (!dest || path.basename(dest) !== app + extension || !allowedLinuxRoots(homeDir).includes(path.dirname(dest)))) {
    throw new Error('Pear package requested an unexpected Linux install destination')
  }
  if (platform === 'win32' && dest !== null) {
    throw new Error('Pear package requested an unexpected Windows install destination')
  }

  return { app, ext, dest }
}

function validateInstallEvent (data, opts = {}) {
  const platform = opts.platform || process.platform
  const arch = opts.arch || null
  const homeDir = opts.homeDir || os.homedir()
  const expectedLink = opts.expectedLink ? normalizePearInstallLink(opts.expectedLink) : null
  if (!data || typeof data !== 'object') throw new Error('Pear installer returned invalid application metadata')

  const app = String(data.app || '').trim()
  const packageName = String(data.name || '').trim()
  const extension = guiExtension(platform)
  if (!SAFE_APP_NAME_RE.test(app) || app === '.' || app === '..') {
    throw new Error('Pear package has an unsafe native application name')
  }
  if (!SAFE_PACKAGE_NAME_RE.test(packageName)) throw new Error('Pear package has an unsafe package name')
  if (opts.expectedAppName && app !== String(opts.expectedAppName).trim()) {
    throw new Error('Pear package product name does not match the catalogue entry')
  }

  const key = String(data.key || '')
  const expectedSuffix = `/${app}${extension}`
  const expectedKey = arch && /^[a-z0-9_-]{2,40}$/.test(arch) ? `/by-arch/${platform}-${arch}/app/${app}${extension}` : null
  if ((expectedKey && key !== expectedKey) || (!expectedKey && (!key.startsWith('/by-arch/') || !key.endsWith(expectedSuffix)))) {
    throw new Error('Pear package contains a non-GUI executable target; browser installs support one native application only')
  }

  const upgrade = normalizePearInstallLink(data.upgrade)
  if (expectedLink && upgrade !== expectedLink) {
    throw new Error('Pear package upgrade identity does not match the requested install link')
  }

  let dest = data.dest == null ? null : path.resolve(String(data.dest))
  if (platform === 'darwin') {
    const expected = path.join('/Applications', app + extension)
    if (dest !== expected) throw new Error('Pear package requested an unexpected macOS install destination')
  } else if (platform === 'linux') {
    if (!dest || path.basename(dest) !== app + extension || !allowedLinuxRoots(homeDir).includes(path.dirname(dest))) {
      throw new Error('Pear package requested an unexpected Linux install destination')
    }
  } else if (platform === 'win32' && dest !== null) {
    throw new Error('Pear package requested an unexpected Windows install destination')
  }

  const version = String(data.version || '').trim()
  if (!version || version.length > 80 || /[\u0000-\u001f\u007f]/.test(version)) {
    throw new Error('Pear package has an invalid version')
  }
  const verlink = String(data.verlink || '').trim()
  if (!PEAR_VERSION_LINK_RE.test(verlink)) throw new Error('Pear package has an invalid version link')

  return { app, packageName, version, upgrade, verlink, key, dest }
}

function sanitizeProgress (stats) {
  const download = stats && stats.download
  const upload = stats && stats.upload
  return {
    peers: Number.isFinite(Number(stats && stats.peers)) ? Number(stats.peers) : 0,
    download: {
      bytes: Number.isFinite(Number(download && download.bytes)) ? Number(download.bytes) : 0,
      speed: Number.isFinite(Number(download && download.speed)) ? Number(download.speed) : 0
    },
    upload: {
      bytes: Number.isFinite(Number(upload && upload.bytes)) ? Number(upload.bytes) : 0,
      speed: Number.isFinite(Number(upload && upload.speed)) ? Number(upload.speed) : 0
    }
  }
}

class PearAppLauncher {
  constructor (opts = {}) {
    this.platform = opts.platform || process.platform
    this.arch = opts.arch || process.arch
    this.homeDir = opts.homeDir || os.homedir()
    this.dataFile = opts.dataFile || null
    this.Install = opts.Install || null
    this.shell = opts.shell || null
    this.fs = opts.fs || fs
    this.spawn = opts.spawn || spawn
    this.spawnSync = opts.spawnSync || spawnSync
    this.records = new Map()
    this._load()
  }

  _load () {
    if (!this.dataFile) return
    try {
      const parsed = JSON.parse(this.fs.readFileSync(this.dataFile, 'utf8'))
      for (const record of Array.isArray(parsed && parsed.apps) ? parsed.apps : []) {
        if (!record || typeof record !== 'object') continue
        try {
          const link = normalizePearInstallLink(record.link)
          const installed = validateInstallEvent({
            app: record.app,
            name: record.packageName,
            version: record.version,
            upgrade: record.upgrade,
            verlink: record.verlink,
            key: record.artifactKey,
            dest: record.dest
          }, {
            platform: record.platform,
            arch: record.arch,
            homeDir: this.homeDir,
            expectedLink: link
          })
          this.records.set(link, { ...record, ...installed, artifactKey: installed.key, link })
        } catch {}
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') console.error('Failed to read Pear v3 app records:', err.message)
    }
  }

  _save () {
    if (!this.dataFile) return
    const dir = path.dirname(this.dataFile)
    const tmp = `${this.dataFile}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
    this.fs.mkdirSync(dir, { recursive: true })
    this.fs.writeFileSync(tmp, JSON.stringify({ version: 1, apps: [...this.records.values()] }, null, 2) + '\n', { mode: 0o600 })
    this.fs.renameSync(tmp, this.dataFile)
  }

  _installClass () {
    if (this.Install) return this.Install
    // Lazy-load so source-contract tests and unsupported platforms do not
    // initialize installer networking merely by importing this module.
    return require('pear-install')
  }

  list () {
    return [...this.records.values()].map((record) => ({
      ...record,
      installed: this._isInstalled(record)
    }))
  }

  find (value) {
    const raw = String(value || '').trim()
    if (!raw) return null
    try {
      return this.records.get(normalizePearInstallLink(raw)) || null
    } catch {}
    for (const record of this.records.values()) if (record.id === raw) return record
    return null
  }

  async install (request, onEvent = () => {}) {
    if (!request || typeof request !== 'object') throw new Error('Pear v3 app metadata is required')
    const link = normalizePearInstallLink(request.link)
    const id = safeCatalogId(request.id, link)
    const displayName = safeDisplayName(request.name, id)
    const existing = this.records.get(link)
    if (existing && this._isInstalled(existing)) return { ...existing, installed: true, exists: true }

    const Install = this._installClass()
    const installer = new Install({ link })
    // pear-install 1.2.2 resolves the complete target set before this method is
    // called. Guard that boundary so a package containing an already-present
    // CLI target cannot bypass the per-artifact `app` event validation below.
    if (typeof installer._partitionTargets === 'function') {
      const partitionTargets = installer._partitionTargets
      installer._partitionTargets = (targets, packageName) => {
        validateResolvedTargets(targets, { platform: this.platform, homeDir: this.homeDir })
        return partitionTargets.call(installer, targets, packageName)
      }
    }
    let application = null
    let final = null
    installer.on('installing', (data) => onEvent({ phase: 'connecting', link, host: String(data && data.host || '') }))
    installer.on('stats', (data) => onEvent({ phase: 'downloading', ...sanitizeProgress(data) }))
    installer.on('app', (data) => {
      if (application) throw new Error('Pear package contains multiple installable targets')
      application = validateInstallEvent(data, {
        platform: this.platform,
        arch: this.arch,
        homeDir: this.homeDir,
        expectedLink: link,
        expectedAppName: request.productName
      })
      onEvent({ phase: 'installing', app: application.app, version: application.version })
    })
    installer.on('final', (data) => { final = data })

    try {
      await installer.ready()
    } finally {
      await installer.close()
    }
    if (Array.isArray(installer.targets) && installer.targets.length) {
      validateResolvedTargets(installer.targets, { platform: this.platform, homeDir: this.homeDir })
    }
    if (!application || !final || final.success !== true || Number(final.installed) !== 1) {
      throw new Error('Pear installer did not install exactly one native application')
    }

    const record = {
      id,
      displayName,
      link,
      app: application.app,
      packageName: application.packageName,
      version: application.version,
      upgrade: application.upgrade,
      verlink: application.verlink,
      artifactKey: application.key,
      dest: application.dest,
      platform: this.platform,
      arch: this.arch,
      verification: String(request.verification || 'unverified').slice(0, 40),
      installedAt: Date.now()
    }
    this.records.set(link, record)
    this._save()
    onEvent({ phase: 'complete', app: record.app, version: record.version })
    return { ...record, installed: true, exists: false }
  }

  async launch (value) {
    const record = this.find(value)
    if (!record) throw new Error('Pear v3 app is not registered as installed')
    if (record.platform !== this.platform || record.arch !== this.arch) throw new Error('Pear v3 app was installed for a different operating system or architecture')
    if (!this._isInstalled(record)) throw new Error('Pear v3 app is no longer installed at its recorded OS location')

    if (this.platform === 'darwin') {
      if (!this.shell || typeof this.shell.openPath !== 'function') throw new Error('macOS application launcher is unavailable')
      const error = await this.shell.openPath(record.dest)
      if (error) throw new Error(`Could not launch ${record.app}: ${error}`)
    } else if (this.platform === 'linux') {
      const child = this.spawn(record.dest, [], { detached: true, stdio: 'ignore' })
      child.unref()
    } else if (this.platform === 'win32') {
      const env = { ...process.env, PEARBROWSER_PEAR_PACKAGE: record.packageName }
      const script = [
        "$pkg = Get-AppxPackage -Name $env:PEARBROWSER_PEAR_PACKAGE -ErrorAction Stop | Select-Object -First 1",
        "$app = Get-StartApps | Where-Object { $_.AppID -like ($pkg.PackageFamilyName + '!*') } | Select-Object -First 1",
        "if ($null -eq $app) { throw 'Installed application entry point not found' }",
        'Start-Process (\'shell:AppsFolder\\\' + $app.AppID)'
      ].join('; ')
      const result = this.spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { env, windowsHide: true })
      if (result.status !== 0) {
        const message = String(result.stderr || '').trim() || `PowerShell exited ${result.status}`
        throw new Error(`Could not launch ${record.app}: ${message}`)
      }
    }
    return { ...record, launched: true }
  }

  _isInstalled (record) {
    if (!record || record.platform !== this.platform || record.arch !== this.arch) return false
    if (this.platform === 'darwin' || this.platform === 'linux') {
      return !!record.dest && this.fs.existsSync(record.dest)
    }
    if (this.platform === 'win32') {
      if (!SAFE_PACKAGE_NAME_RE.test(String(record.packageName || ''))) return false
      const env = { ...process.env, PEARBROWSER_PEAR_PACKAGE: record.packageName }
      const script = "$null -ne (Get-AppxPackage -Name $env:PEARBROWSER_PEAR_PACKAGE -ErrorAction SilentlyContinue)"
      const result = this.spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { env, windowsHide: true })
      return result.status === 0 && String(result.stdout || '').trim() === 'True'
    }
    return false
  }
}

module.exports = {
  PearAppLauncher,
  normalizePearInstallLink,
  validateInstallEvent,
  validateResolvedTargets,
  guiExtension
}
