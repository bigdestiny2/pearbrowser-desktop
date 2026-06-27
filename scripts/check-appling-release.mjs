#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const applingPackage = JSON.parse(readFileSync(new URL('../appling/package.json', import.meta.url), 'utf8'))
const cmake = readFileSync(new URL('../appling/CMakeLists.txt', import.meta.url), 'utf8')

const errors = []
const args = parseArgs(process.argv.slice(2))
const expectedVersion = versionFromTag(args.tag) || rootPackage.version
const productionLink = pearConfig.links?.production || ''
const productionId = productionLink.replace(/^pear:\/\//, '')

const cmakeId = matchValue(/\bID\s+"([^"]+)"/, 'ID')
const cmakeName = matchValue(/\bNAME\s+"([^"]+)"/, 'NAME')
const cmakeVersion = matchValue(/^\s+VERSION\s+([0-9]+(?:\.[0-9]+){1,3})/m, 'VERSION')

if (rootPackage.version !== expectedVersion) {
  errors.push(`package.json version ${rootPackage.version} does not match release tag ${args.tag}`)
}
if (!/^pear:\/\/[a-z0-9]{52}$/i.test(productionLink)) {
  errors.push(`pear.json links.production is not a pear:// link: ${productionLink || '(missing)'}`)
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
  ['Windows icon', '../appling/assets/win32/icon.png'],
  ['Linux icon', '../appling/assets/linux/icon.png']
]) {
  const url = new URL(path, import.meta.url)
  if (!existsSync(url)) errors.push(`appling ${label} is missing: ${path.replace('../', '')}`)
  else if (statSync(url).size === 0) errors.push(`appling ${label} is empty: ${path.replace('../', '')}`)
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

function matchValue (regex, label) {
  const match = cmake.match(regex)
  if (!match) errors.push(`appling CMakeLists.txt is missing ${label}`)
  return match?.[1] || ''
}
