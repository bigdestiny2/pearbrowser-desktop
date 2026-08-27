#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync
} from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const defaultRoot = resolve(dirname(scriptPath), '..')
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies'
]
const forbiddenPackages = new Set(['pear', 'pear-electron', 'pear-run'])
const ignoredDirectories = new Set([
  '.git',
  '.codex-worktrees',
  '.worktrees',
  'build',
  'dist',
  'node_modules',
  'outputs',
  'pearbrowser-storage'
])
const sourceExtensions = new Set(['.cjs', '.js', '.mjs', '.sh'])
const retiredCommandPatterns = [
  ['shared CLI launcher', /\bpear\s+run\b/i],
  ['v2 release mutation', /\bpear\s+release\b/i],
  ['legacy sidecar command', /\bpear\s+sidecar\b/i],
  ['legacy sidecar key switch', /\bsidecar\s+--key\b/i],
  ['removed non-interactive flag', /--no-ask\b/i],
  ['legacy compact staging', /\bpear\s+stage\s+--compact\b/i]
]
const retiredSourceCommandPatterns = [
  ['shared CLI launcher', /(?:^|\n)\s*pear\s+run\b|[`'"]pear\s+run(?=\s+(?!(?:host|launcher|path)\b)|[`'"])/im],
  ['v2 release mutation', /(?:^|\n)\s*pear\s+release\b|[`'"]pear\s+release(?=\s+(?!(?:length|line|link|metadata)\b)|[`'"])/im],
  ['legacy sidecar command', /(?:^|\n)\s*pear\s+sidecar\b|[`'"]pear\s+sidecar(?=\s|[`'"])/im],
  ['legacy sidecar key switch', /\bsidecar\s+--key\b/i],
  ['removed non-interactive flag', /--no-ask\b/i],
  ['legacy compact staging', /\bpear\s+stage\s+--compact\b/i]
]

function readJson (path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk (root, include) {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(join(directory, entry.name))
        continue
      }
      if (entry.isFile() && include(entry.name, join(directory, entry.name))) {
        files.push(join(directory, entry.name))
      }
    }
  }
  visit(root)
  return files
}

function displayPath (root, path) {
  return relative(root, path) || '.'
}

function allDependencies (manifest) {
  const entries = []
  for (const section of dependencySections) {
    for (const [name, version] of Object.entries(manifest[section] || {})) {
      entries.push({ section, name, version })
    }
  }
  return entries
}

function lockPackageName (path) {
  const marker = 'node_modules/'
  const index = path.lastIndexOf(marker)
  return index === -1 ? null : path.slice(index + marker.length)
}

function assertExactRegistryEntry (errors, lock, name, version) {
  const entry = lock.packages?.[`node_modules/${name}`]
  if (entry?.version !== version) {
    errors.push(`${name} must resolve exactly to ${version}; found ${entry?.version || '(missing)'}`)
    return
  }

  const expectedResolved = `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`
  if (entry.resolved !== expectedResolved) {
    errors.push(`${name}@${version} must resolve from its canonical npm registry tarball`)
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(String(entry.integrity || ''))) {
    errors.push(`${name}@${version} must have a sha512 lockfile integrity digest`)
  }
}

function collectProductionSource (root) {
  const files = []
  for (const directory of ['backend', 'electron', 'qvac-smoke', 'scripts', 'ui', 'workers']) {
    const path = join(root, directory)
    if (!existsSync(path)) continue
    files.push(...walk(path, (name, fullPath) => {
      if (fullPath === scriptPath) return false
      return sourceExtensions.has(extname(name))
    }))
  }

  const rootEntry = join(root, 'index.js')
  if (existsSync(rootEntry)) files.push(rootEntry)

  for (const path of [
    join(root, 'README.md'),
    join(root, 'docs', 'INSTALL_NATIVE_PACKAGES.md'),
    join(root, 'docs', 'PEARBROWSER-APP-COMPAT-STANDARD.md'),
    join(root, 'docs', 'PEAR_V3_MIGRATION.md'),
    join(root, 'docs', 'CURRENT_STATUS_AUDIT_2026-06-23.md')
  ]) {
    if (existsSync(path)) files.push(path)
  }
  return files
}

export function checkPearV3Contract ({ root = defaultRoot } = {}) {
  root = resolve(root)
  const errors = []
  const packagePath = join(root, 'package.json')
  const lockPath = join(root, 'package-lock.json')
  const hostPath = join(root, 'electron', 'main.cjs')
  const workerPath = join(root, 'workers', 'main.js')

  for (const path of [packagePath, lockPath, hostPath, workerPath]) {
    if (!existsSync(path)) errors.push(`required v3 contract file is missing: ${displayPath(root, path)}`)
  }
  if (errors.length) throw new Error(`Pear v3 contract failed:\n- ${errors.join('\n- ')}`)

  const pkg = readJson(packagePath)
  const lock = readJson(lockPath)

  if (pkg.main !== 'electron/main.cjs') errors.push('package main must remain the native Electron host')
  if (pkg.pear?.type !== 'desktop') errors.push('package pear.type must remain desktop')
  if (!/^pear:\/\/[13-9a-km-uw-z]{52}$/.test(String(pkg.upgrade || ''))) {
    errors.push('package upgrade must remain a canonical root Pear OTA key')
  }

  const expectedDirect = {
    'pear-install': '1.2.2',
    'pear-runtime': '1.3.1'
  }
  for (const [name, version] of Object.entries(expectedDirect)) {
    if (pkg.dependencies?.[name] !== version) {
      errors.push(`${name} must be an exact ${version} production dependency`)
    }
    if (lock.packages?.['']?.dependencies?.[name] !== version) {
      errors.push(`${name} lockfile root must exactly match package.json at ${version}`)
    }
    assertExactRegistryEntry(errors, lock, name, version)
  }
  if (allDependencies(pkg).some(({ name }) => name === 'pear-runtime-updater')) {
    errors.push('pear-runtime-updater must remain transitive through pear-runtime')
  }
  assertExactRegistryEntry(errors, lock, 'pear-runtime-updater', '3.4.0')
  if (lock.packages?.['node_modules/pear-runtime']?.dependencies?.['pear-runtime-updater'] !== '^3.0.0') {
    errors.push('pear-runtime must retain its audited ^3.0.0 updater dependency boundary')
  }

  const packageFiles = walk(root, name => name === 'package.json')
  for (const path of packageFiles) {
    const manifest = readJson(path)
    for (const { section, name } of allDependencies(manifest)) {
      if (forbiddenPackages.has(name)) {
        errors.push(`${displayPath(root, path)} ${section} contains forbidden legacy package ${name}`)
      }
    }
    for (const [name, command] of Object.entries(manifest.scripts || {})) {
      for (const [label, pattern] of retiredCommandPatterns) {
        if (pattern.test(String(command))) {
          errors.push(`${displayPath(root, path)} script ${name} contains ${label}`)
        }
      }
    }
  }

  const lockFiles = walk(root, name => name === 'package-lock.json')
  for (const path of lockFiles) {
    const candidate = readJson(path)
    for (const [lockPath, entry] of Object.entries(candidate.packages || {})) {
      const name = lockPackageName(lockPath)
      if (forbiddenPackages.has(name)) {
        errors.push(`${displayPath(root, path)} resolves forbidden legacy package ${name}`)
      }
      for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const dependency of Object.keys(entry?.[section] || {})) {
          if (forbiddenPackages.has(dependency)) {
            errors.push(`${displayPath(root, path)} ${lockPath || '<root>'} ${section} references forbidden legacy package ${dependency}`)
          }
        }
      }
    }
  }

  const sourceFiles = collectProductionSource(root)
  for (const path of sourceFiles) {
    const source = readFileSync(path, 'utf8')
    for (const [label, pattern] of retiredSourceCommandPatterns) {
      if (pattern.test(source)) errors.push(`${displayPath(root, path)} contains ${label} wording`)
    }
  }

  const executableSource = sourceFiles.filter(path => sourceExtensions.has(extname(path)))
  const runtimeImports = []
  const runtimeCalls = []
  const runtimeConstructors = []
  for (const path of executableSource) {
    const source = readFileSync(path, 'utf8')
    runtimeImports.push(...Array.from(source.matchAll(/require\s*\(\s*['"]pear-runtime['"]\s*\)|from\s+['"]pear-runtime['"]/g), () => path))
    runtimeConstructors.push(...Array.from(source.matchAll(/\bnew\s+PearRuntime\s*\(/g), () => path))
    runtimeCalls.push(...Array.from(source.matchAll(/\bpearRuntime\s*\.\s*run\s*\(/g), () => path))
  }

  if (runtimeImports.length !== 1 || runtimeImports[0] !== hostPath) {
    errors.push(`pear-runtime must be imported only by electron/main.cjs; found ${runtimeImports.map(path => displayPath(root, path)).join(', ') || 'none'}`)
  }
  if (runtimeConstructors.length !== 1 || runtimeConstructors[0] !== hostPath) {
    errors.push(`PearRuntime must be constructed only by electron/main.cjs; found ${runtimeConstructors.map(path => displayPath(root, path)).join(', ') || 'none'}`)
  }
  if (runtimeCalls.length !== 1 || runtimeCalls[0] !== hostPath) {
    errors.push(`PearRuntime worker startup must have exactly one local host call; found ${runtimeCalls.map(path => displayPath(root, path)).join(', ') || 'none'}`)
  }

  const host = readFileSync(hostPath, 'utf8')
  const localWorkerCall = /\bpearRuntime\s*\.\s*run\s*\(\s*require\.resolve\s*\(\s*(['"])\.\.\/workers\/main\.js\1\s*\)\s*,\s*\[\s*pearRuntime\.storage\s*,\s*sessionToken\s*\]\s*\)/
  if (!localWorkerCall.test(host)) {
    errors.push('electron/main.cjs must start only the bundled workers/main.js entrypoint with host-owned arguments')
  }
  if (lstatSync(workerPath).isSymbolicLink()) {
    errors.push('workers/main.js must not be a symbolic link')
  } else {
    const realRoot = realpathSync(root)
    const realWorker = realpathSync(workerPath)
    if (realWorker !== realRoot && !realWorker.startsWith(realRoot + sep)) {
      errors.push('workers/main.js must resolve inside the application source tree')
    }
  }

  if (errors.length) throw new Error(`Pear v3 contract failed:\n- ${errors.join('\n- ')}`)

  return {
    ok: true,
    direct: expectedDirect,
    updater: '3.4.0',
    worker: displayPath(root, workerPath),
    checkedPackages: packageFiles.map(path => displayPath(root, path)),
    checkedLocks: lockFiles.map(path => displayPath(root, path)),
    checkedSources: sourceFiles.length
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    console.log(JSON.stringify(checkPearV3Contract(), null, 2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
