#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const applingPackage = JSON.parse(readFileSync(new URL('../appling/package.json', import.meta.url), 'utf8'))
const cmake = readFileSync(new URL('../appling/CMakeLists.txt', import.meta.url), 'utf8')

const args = parseArgs(process.argv.slice(2))
const errors = []
const expectedVersion = versionFromTag(args.tag) || rootPackage.version
const productionLink = pearConfig.links?.production || ''
const productionId = productionLink.replace(/^pear:\/\//, '')

const cmakeId = matchValue(/\bID\s+"([^"]+)"/, 'ID')
const cmakeName = matchValue(/\bNAME\s+"([^"]+)"/, 'NAME')
const cmakeVersion = matchValue(/^\s+VERSION\s+([0-9]+(?:\.[0-9]+){1,3})/m, 'VERSION')

if (rootPackage.version !== expectedVersion) {
  errors.push(`package.json version ${rootPackage.version} does not match release tag ${args.tag}`)
}
if (!/^pear:\/\/[a-z0-9]+$/i.test(productionLink)) {
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
for (const script of ['generate', 'build', 'package']) {
  if (!applingPackage.scripts?.[script]) errors.push(`appling package is missing npm script: ${script}`)
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
    if (argv[i] === '--tag') parsed.tag = argv[++i] || ''
  }
  return parsed
}

function versionFromTag (tag) {
  if (!tag) return ''
  const version = tag.replace(/^refs\/tags\//, '').replace(/^v/, '')
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    errors.push(`release tag must look like vX.Y.Z, got ${tag}`)
    return ''
  }
  return version
}

function matchValue (regex, label) {
  const match = cmake.match(regex)
  if (!match) errors.push(`appling CMakeLists.txt is missing ${label}`)
  return match?.[1] || ''
}
