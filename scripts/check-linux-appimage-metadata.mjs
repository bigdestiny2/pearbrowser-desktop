#!/usr/bin/env node

import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const EXPECTED = {
  name: 'PearBrowser',
  binary: 'pearbrowser',
  iconName: 'icon',
  category: 'Network',
  desktopId: 'PearBrowser.desktop',
  appstreamId: 'io.github.bigdestiny2.pearbrowser',
  metainfoName: 'io.github.bigdestiny2.pearbrowser.metainfo.xml',
  projectLicense: 'Apache-2.0 AND MIT'
}

const ROOT = new URL('..', import.meta.url)
const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const inspections = []

validateSourceMetadata()

if (args.appdir) {
  validateAppDir(resolve(args.appdir), 'appdir')
}

if (args.buildDir) {
  validateBuildDir(resolve(args.buildDir))
}

if (args.appimage) {
  validateAppImage(resolve(args.appimage))
}

const report = {
  ok: errors.length === 0,
  source: {
    icon: 'appling/assets/linux/icon.png',
    metainfo: `appling/assets/linux/${EXPECTED.metainfoName}`
  },
  inspections,
  warnings,
  errors
}

if (args.json) printJson(report)
else printHuman(report)

process.exit(report.ok ? 0 : 1)

function validateSourceMetadata () {
  const iconPath = pathFromRoot('appling/assets/linux/icon.png')
  const metainfoPath = pathFromRoot(`appling/assets/linux/${EXPECTED.metainfoName}`)

  validateFile(iconPath, 'Linux source icon')
  if (validateFile(metainfoPath, 'Linux AppStream metainfo')) {
    validateMetainfo(readFileSync(metainfoPath, 'utf8'), `appling/assets/linux/${EXPECTED.metainfoName}`)
  }

  inspections.push({
    kind: 'source',
    icon: relativePath(iconPath),
    metainfo: relativePath(metainfoPath)
  })
}

function validateBuildDir (buildDir) {
  if (!existsSync(buildDir)) {
    errors.push(`Linux build directory is missing: ${buildDir}`)
    return
  }

  const appDirs = findPaths(buildDir, (path) => path.endsWith('.AppDir') && isDirectory(path))
  if (appDirs.length) {
    for (const appDir of appDirs) validateAppDir(appDir, 'build-dir')
    return
  }

  const appImages = findPaths(buildDir, (path) => /\.AppImage$/i.test(path) && isFile(path))
  if (appImages.length === 0) {
    errors.push(`Linux build directory has no .AppDir or .AppImage to inspect: ${buildDir}`)
    return
  }
  for (const appImage of appImages) validateAppImage(appImage)
}

function validateAppImage (appImage) {
  if (!validateFile(appImage, 'Linux AppImage')) return
  if (process.platform !== 'linux') {
    errors.push(`AppImage extraction requires Linux; inspect an AppDir instead on ${process.platform}: ${appImage}`)
    return
  }

  const workDir = mkdtempSync(join(tmpdir(), 'pearbrowser-appimage-'))
  try {
    chmodSync(appImage, 0o755)
    const result = spawnSync(appImage, ['--appimage-extract'], {
      cwd: workDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        APPIMAGE_EXTRACT_AND_RUN: '1'
      }
    })
    if (result.status !== 0) {
      const detail = String(result.stderr || result.stdout || '').trim()
      errors.push(`failed to extract AppImage ${appImage}${detail ? `: ${detail}` : ''}`)
      return
    }
    validateAppDir(join(workDir, 'squashfs-root'), 'appimage')
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

function validateAppDir (appDir, kind) {
  if (!existsSync(appDir) || !isDirectory(appDir)) {
    errors.push(`AppDir is missing or not a directory: ${appDir}`)
    return
  }

  const desktopPath = join(appDir, EXPECTED.desktopId)
  const iconPath = join(appDir, `${EXPECTED.iconName}.png`)
  const appRunPath = join(appDir, 'AppRun')
  const metainfoPath = join(appDir, 'usr', 'share', 'metainfo', EXPECTED.metainfoName)

  validateFile(appRunPath, `AppDir AppRun (${appDir})`)
  if (validateFile(desktopPath, `AppDir desktop entry (${appDir})`)) {
    validateDesktopEntry(readFileSync(desktopPath, 'utf8'), desktopPath)
  }
  validateFile(iconPath, `AppDir icon (${appDir})`)
  if (validateFile(metainfoPath, `AppDir AppStream metainfo (${appDir})`)) {
    validateMetainfo(readFileSync(metainfoPath, 'utf8'), metainfoPath)
  }

  inspections.push({
    kind,
    appDir,
    desktop: desktopPath,
    icon: iconPath,
    metainfo: metainfoPath
  })
}

function validateDesktopEntry (text, label) {
  const entry = parseDesktopEntry(text)
  if (!entry.hasDesktopEntry) errors.push(`${label} is missing [Desktop Entry]`)
  requireDesktopValue(entry.values, 'Type', 'Application', label)
  requireDesktopValue(entry.values, 'Name', EXPECTED.name, label)
  requireDesktopValue(entry.values, 'Exec', EXPECTED.binary, label)
  requireDesktopValue(entry.values, 'Icon', EXPECTED.iconName, label)
  const categories = splitCategories(entry.values.Categories)
  if (!categories.includes(EXPECTED.category)) {
    errors.push(`${label} Categories must include ${EXPECTED.category}`)
  }
  if (!entry.values.Comment) errors.push(`${label} must include Comment`)
}

function parseDesktopEntry (text) {
  const values = {}
  let inDesktopEntry = false
  let hasDesktopEntry = false
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const section = line.match(/^\[(.+)]$/)
    if (section) {
      inDesktopEntry = section[1] === 'Desktop Entry'
      if (inDesktopEntry) hasDesktopEntry = true
      continue
    }
    if (!inDesktopEntry) continue
    const match = line.match(/^([A-Za-z0-9-]+)=(.*)$/)
    if (match) values[match[1]] = match[2].trim()
  }
  return { hasDesktopEntry, values }
}

function requireDesktopValue (values, key, expected, label) {
  if (!values[key]) errors.push(`${label} is missing ${key}`)
  else if (values[key] !== expected) errors.push(`${label} ${key} must be ${expected}, got ${values[key]}`)
}

function validateMetainfo (xml, label) {
  const text = String(xml || '')
  if (!/<component\b[^>]*type="desktop-application"/.test(text)) {
    errors.push(`${label} component must be type="desktop-application"`)
  }
  requireXmlText(text, 'id', EXPECTED.appstreamId, label)
  requireXmlText(text, 'metadata_license', 'CC0-1.0', label)
  requireXmlText(text, 'project_license', EXPECTED.projectLicense, label)
  requireXmlText(text, 'name', EXPECTED.name, label)
  requireXmlText(text, 'summary', 'Peer-to-peer browser and app store', label)
  requireXmlText(text, 'binary', EXPECTED.binary, label)

  const launchable = text.match(/<launchable\b[^>]*type="desktop-id"[^>]*>([^<]+)<\/launchable>/)
  if (!launchable) errors.push(`${label} must include launchable type="desktop-id"`)
  else if (launchable[1].trim() !== EXPECTED.desktopId) {
    errors.push(`${label} launchable desktop-id must be ${EXPECTED.desktopId}, got ${launchable[1].trim()}`)
  }

  if (!new RegExp(`<category>\\s*${escapeRegex(EXPECTED.category)}\\s*<\\/category>`).test(text)) {
    errors.push(`${label} categories must include ${EXPECTED.category}`)
  }
  if (!/<url\b[^>]*type="homepage"[^>]*>https:\/\/github\.com\/bigdestiny2\/pearbrowser-desktop<\/url>/.test(text)) {
    errors.push(`${label} must include the PearBrowser GitHub homepage URL`)
  }
}

function requireXmlText (text, tag, expected, label) {
  const match = text.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*<\\/${tag}>`))
  if (!match) errors.push(`${label} is missing <${tag}>`)
  else if (match[1].trim() !== expected) errors.push(`${label} <${tag}> must be ${expected}, got ${match[1].trim()}`)
}

function validateFile (path, label) {
  if (!existsSync(path)) {
    errors.push(`${label} is missing: ${path}`)
    return false
  }
  if (!isFile(path)) {
    errors.push(`${label} is not a file: ${path}`)
    return false
  }
  if (statSync(path).size <= 0) {
    errors.push(`${label} is empty: ${path}`)
    return false
  }
  return true
}

function findPaths (root, predicate) {
  const matches = []
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()
    let entries = []
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        if (predicate(path)) matches.push(path)
        stack.push(path)
      } else if (predicate(path)) {
        matches.push(path)
      }
    }
  }
  return matches.sort((a, b) => a.length - b.length || basename(a).localeCompare(basename(b)))
}

function splitCategories (value) {
  return String(value || '').split(';').map((part) => part.trim()).filter(Boolean)
}

function isFile (path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function isDirectory (path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function pathFromRoot (path) {
  return new URL(`../${path}`, import.meta.url)
}

function relativePath (urlOrPath) {
  const path = String(urlOrPath?.pathname || urlOrPath)
  const root = String(ROOT.pathname)
  return path.startsWith(root) ? path.slice(root.length + (root.endsWith('/') ? 0 : 1)) : path
}

function parseArgs (argv) {
  const parsed = {
    appdir: '',
    appimage: '',
    buildDir: '',
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--appdir') parsed.appdir = requireValue(argv, ++i, arg)
    else if (arg === '--appimage') parsed.appimage = requireValue(argv, ++i, arg)
    else if (arg === '--build-dir') parsed.buildDir = requireValue(argv, ++i, arg)
    else if (arg === '--json') parsed.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown argument: ${arg}`)
  }
  return parsed
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/check-linux-appimage-metadata.mjs [--build-dir appling/build] [--appdir path] [--appimage path] [--json]')
  process.exit(code)
}

function escapeRegex (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printHuman (report) {
  console.log(`PearBrowser Linux AppImage metadata (${report.ok ? 'PASS' : 'BLOCKED'})`)
  for (const inspection of report.inspections) {
    if (inspection.kind === 'source') {
      console.log(`- source: ${inspection.icon}, ${inspection.metainfo}`)
    } else {
      console.log(`- ${inspection.kind}: ${inspection.appDir}`)
    }
  }
  for (const warning of report.warnings) console.warn(`warning: ${warning}`)
  for (const error of report.errors) console.error(`error: ${error}`)
}
