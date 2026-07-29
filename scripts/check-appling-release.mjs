#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const applingPackage = JSON.parse(readFileSync(new URL('../appling/package.json', import.meta.url), 'utf8'))
const applingLock = JSON.parse(readFileSync(new URL('../appling/package-lock.json', import.meta.url), 'utf8'))
const cmake = readFileSync(new URL('../appling/CMakeLists.txt', import.meta.url), 'utf8')
const addPearApplingBlock = cmake.match(/add_pear_appling\([\s\S]*?\n\)/)?.[0] || ''

const errors = []
const args = parseArgs(process.argv.slice(2))
const expectedVersion = versionFromTag(args.tag) || rootPackage.version
const productionLink = rootPackage.upgrade || ''
const productionId = productionLink.replace(/^pear:\/\//, '')

const cmakeId = matchValue(/\bID\s+"([^"]+)"/, 'ID', addPearApplingBlock)
const cmakeName = matchValue(/\bNAME\s+"([^"]+)"/, 'NAME', addPearApplingBlock)
const cmakeVersion = matchValue(/^\s+VERSION\s+([0-9]+(?:\.[0-9]+){1,3})/m, 'VERSION', addPearApplingBlock)
const bareHeadersCmakeVersion = matchValue(/\bPEARBROWSER_BARE_HEADERS_VERSION\s+"([^"]+)"/, 'PEARBROWSER_BARE_HEADERS_VERSION')
const expectedBareHeadersVersion = '1.28.7'

if (rootPackage.version !== expectedVersion) {
  errors.push(`package.json version ${rootPackage.version} does not match release tag ${args.tag}`)
}
if (!/^pear:\/\/[a-z0-9]{52}$/i.test(productionLink)) {
  errors.push(`package.json upgrade is not a Pear OTA channel: ${productionLink || '(missing)'}`)
}
if (cmakeId !== productionId) {
  errors.push(`appling CMake ID ${cmakeId || '(missing)'} does not match production key ${productionId || '(missing)'}`)
}
if (cmakeName !== 'PearBrowser') {
  errors.push(`appling CMake NAME must be PearBrowser, got ${cmakeName || '(missing)'}`)
}
if (cmakeVersion !== rootPackage.version) {
  errors.push(`appling CMake VERSION ${cmakeVersion || '(missing)'} does not match package version ${rootPackage.version}`)
}
if (applingPackage.name !== 'pearbrowser-desktop-appling') {
  errors.push(`appling package name must be pearbrowser-desktop-appling, got ${applingPackage.name || '(missing)'}`)
}
if (applingPackage.private !== true) {
  errors.push('appling package must stay private')
}
if (applingLock.name !== applingPackage.name) {
  errors.push(`appling package-lock name must be ${applingPackage.name}, got ${applingLock.name || '(missing)'}`)
}
const cmakePearRange = applingPackage.devDependencies?.['cmake-pear']
const cmakePearVersion = applingLock.packages?.['node_modules/cmake-pear']?.version
const bareMakeRange = applingPackage.devDependencies?.['bare-make']
const bareMakeVersion = applingLock.packages?.['node_modules/bare-make']?.version
const bareHeadersRange = applingPackage.devDependencies?.['bare-headers']
const bareHeadersVersion = applingLock.packages?.['node_modules/bare-headers']?.version
if (!bareMakeRange) {
  errors.push('appling package must declare bare-make in devDependencies')
} else if (!bareMakeVersion) {
  errors.push('appling package-lock must include bare-make')
}
if (bareHeadersCmakeVersion !== expectedBareHeadersVersion) {
  errors.push(`appling CMake PEARBROWSER_BARE_HEADERS_VERSION must be ${expectedBareHeadersVersion}, got ${bareHeadersCmakeVersion || '(missing)'}`)
}
if (!/function\s*\(\s*download_bare_headers\s+result\s*\)/.test(cmake)) {
  errors.push('appling CMakeLists.txt must override download_bare_headers to avoid npm latest drift')
}
if (!/\bset\(PEARBROWSER_MACOS_SIGNING_IDENTITY\s+"-"\s+CACHE/.test(cmake)) {
  errors.push('appling CMake PEARBROWSER_MACOS_SIGNING_IDENTITY must default to ad-hoc "-" when no env/cache value is provided')
}
if (!/function\s*\(\s*code_sign_macos\s+target\s*\)/.test(cmake)) {
  errors.push('appling CMakeLists.txt must override code_sign_macos for ad-hoc local signing')
}
if (!/\bset\(PEARBROWSER_WINDOWS_SIGNING_SUBJECT\s+"CN=PearBrowser Desktop"\s+CACHE/.test(cmake)) {
  errors.push('appling CMake PEARBROWSER_WINDOWS_SIGNING_SUBJECT must default to CN=PearBrowser Desktop')
}
if (!/function\s*\(\s*code_sign_windows\s+target\s*\)/.test(cmake)) {
  errors.push('appling CMakeLists.txt must override code_sign_windows so unsigned MSIX CI builds can package without certificates')
}
if (!/WINDOWS_SIGNING_SUBJECT\s+"\$\{PEARBROWSER_WINDOWS_SIGNING_SUBJECT\}"/.test(cmake)) {
  errors.push('appling CMake add_pear_appling must pass PEARBROWSER_WINDOWS_SIGNING_SUBJECT')
}
if (!/WINDOWS_SIGNING_THUMBPRINT\s+"\$\{PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT\}"/.test(cmake)) {
  errors.push('appling CMake add_pear_appling must pass PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT')
}
if (bareHeadersRange !== expectedBareHeadersVersion) {
  errors.push(`appling package must pin bare-headers to ${expectedBareHeadersVersion}, got ${bareHeadersRange || '(missing)'}`)
} else if (bareHeadersVersion !== expectedBareHeadersVersion) {
  errors.push(`appling package-lock must resolve bare-headers ${expectedBareHeadersVersion}, got ${bareHeadersVersion || '(missing)'}`)
}
if (!cmakePearRange) {
  errors.push('appling package must declare cmake-pear in devDependencies')
} else if (!cmakePearVersion) {
  errors.push('appling package-lock must include cmake-pear')
} else if (!/^3\./.test(cmakePearVersion)) {
  errors.push(`appling package-lock must resolve cmake-pear 3.x, got ${cmakePearVersion}`)
}
const expectedScripts = {
  generate: 'bare-make generate',
  build: 'bare-make build',
  package: 'node ../scripts/collect-appling-artifacts.mjs'
}
for (const [script, command] of Object.entries(expectedScripts)) {
  const actual = applingPackage.scripts?.[script]
  if (!actual) errors.push(`appling package is missing npm script: ${script}`)
  else if (actual !== command) errors.push(`appling package script ${script} must be "${command}", got "${actual}"`)
}

for (const [label, path] of [
  ['splash image', '../appling/assets/splash.png'],
  ['macOS icon', '../appling/assets/darwin/icon.png'],
  ['macOS icns icon', '../appling/assets/darwin/icon.icns'],
  ['Windows icon', '../appling/assets/win32/icon.png'],
  ['Linux icon', '../appling/assets/linux/icon.png'],
  ['Linux AppStream metainfo', '../appling/assets/linux/io.github.bigdestiny2.pearbrowser.metainfo.xml']
]) {
  const url = new URL(path, import.meta.url)
  if (!existsSync(url)) errors.push(`appling ${label} is missing: ${path.replace('../', '')}`)
  else if (statSync(url).size === 0) errors.push(`appling ${label} is empty: ${path.replace('../', '')}`)
}

if (!/PEARBROWSER_LINUX_METAINFO/.test(cmake)) {
  errors.push('appling CMakeLists.txt must name the Linux AppStream metainfo source')
}
if (!/usr\/share\/metainfo\/io\.github\.bigdestiny2\.pearbrowser\.metainfo\.xml/.test(cmake)) {
  errors.push('appling CMakeLists.txt must copy Linux AppStream metainfo into the AppDir')
}

if (errors.length) {
  console.error('Appling release metadata check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Appling release metadata ok: PearBrowser ${rootPackage.version} -> ${productionLink}`)

function parseArgs (argv) {
  const parsed = { tag: '' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') {
      const value = argv[++i] || ''
      if (!value || value.startsWith('--')) errors.push('--tag requires a value')
      else parsed.tag = value
    } else {
      errors.push(`unknown argument: ${arg}`)
    }
  }
  return parsed
}

function versionFromTag (tag) {
  if (!tag) return ''
  const normalized = tag.replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    errors.push(`release tag must look like vX.Y.Z, got ${tag}`)
    return ''
  }
  return normalized.slice(1)
}

function matchValue (regex, label, source = cmake) {
  const match = source.match(regex)
  if (!match) errors.push(`appling CMakeLists.txt is missing ${label}`)
  return match?.[1] || ''
}
