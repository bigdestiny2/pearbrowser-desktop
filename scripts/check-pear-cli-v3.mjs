#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export const REVIEWED_PEAR_CLI_VERSION = '3.3.0'

export function extractPearCliVersion (output) {
  const matches = Array.from(
    String(output || '').matchAll(/(?:^|[\s/])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?=$|[\s/])/g),
    (match) => match[1]
  )
  if (!matches.length) throw new Error('Pear CLI version output did not contain a semantic version')
  return matches.at(-1)
}

export function extractPearVersionsState (output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) throw new Error('Pear versions output was empty')

  const platformRecords = []
  const runtimeRecords = []
  for (const [index, line] of lines.entries()) {
    let record
    try {
      record = JSON.parse(line)
    } catch {
      throw new Error(`Pear versions output line ${index + 1} was not valid JSON`)
    }

    if (record?.cmd !== 'versions') continue
    if (record?.tag === 'platform') platformRecords.push(record)
    if (record?.tag === 'runtimes') runtimeRecords.push(record)
  }

  if (!platformRecords.length) {
    throw new Error('Pear versions output did not contain a tagged platform record')
  }
  if (platformRecords.length > 1) {
    throw new Error('Pear versions output contained multiple tagged platform records')
  }
  if (!runtimeRecords.length) {
    throw new Error('Pear versions output did not contain a tagged runtimes record')
  }
  if (runtimeRecords.length > 1) {
    throw new Error('Pear versions output contained multiple tagged runtimes records')
  }

  const checkout = platformRecords[0]?.data?.checkout
  if (!checkout || typeof checkout !== 'object') {
    throw new Error('Pear versions platform record did not contain checkout state')
  }
  if (typeof checkout.key !== 'string' || !checkout.key.trim()) {
    throw new Error('Pear versions platform checkout did not contain a key')
  }
  if (!Number.isSafeInteger(checkout.length) || checkout.length <= 0) {
    throw new Error('Pear versions platform checkout did not contain a positive length')
  }
  if (!Number.isSafeInteger(checkout.fork) || checkout.fork < 0) {
    throw new Error('Pear versions platform checkout did not contain a valid fork')
  }

  const reportedPearRuntimeVersion = runtimeRecords[0]?.data?.pear
  const bareVersion = runtimeRecords[0]?.data?.bare
  if (typeof reportedPearRuntimeVersion !== 'string' || !reportedPearRuntimeVersion.trim()) {
    throw new Error('Pear versions runtimes record did not contain the reported Pear runtime version')
  }
  if (typeof bareVersion !== 'string' || !bareVersion.trim()) {
    throw new Error('Pear versions runtimes record did not contain the Bare version')
  }

  return {
    checkout: {
      key: checkout.key.trim(),
      length: checkout.length,
      fork: checkout.fork
    },
    reportedPearRuntimeVersion: reportedPearRuntimeVersion.trim(),
    bareVersion: bareVersion.trim()
  }
}

function versionParts (version, component = 'Pear') {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(version || ''))
  if (!match) throw new Error(`Invalid ${component} version: ${version}`)
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null
  }
}

export function assertSupportedPearCliVersion (version, reviewed = REVIEWED_PEAR_CLI_VERSION) {
  return assertSupportedPearVersion(version, reviewed, 'Pear CLI')
}

function assertSupportedPearVersion (version, reviewed, component) {
  const actual = versionParts(version, component)
  versionParts(reviewed, 'reviewed Pear')
  if (actual.prerelease) throw new Error(`${component} ${version} is a prerelease; use a stable v3 release`)
  if (actual.major < 3) throw new Error(`${component} ${version} is too old; reviewed stable ${reviewed} is required`)
  if (actual.major > 3) throw new Error(`${component} ${version} is outside the reviewed v3 release line`)
  if (version !== reviewed) {
    throw new Error(`${component} ${version} has not been reviewed; use stable ${reviewed}`)
  }
  return version
}

export function checkPearCli ({
  command = process.env.PEAR_CLI || 'pear',
  spawn = spawnSync
} = {}) {
  const spawnOptions = {
    encoding: 'utf8',
    // The legacy npm bootstrap can spend ~20 seconds handing off to the
    // installed runtime before printing the version. Give it enough time to
    // report the actionable v2/v3 result instead of a misleading timeout.
    timeout: 45000,
    windowsHide: true
  }

  const cliResult = spawn(command, ['-v'], spawnOptions)
  if (cliResult.error) throw new Error(`Could not run ${command} -v: ${cliResult.error.message}`)
  if (cliResult.status !== 0) {
    const detail = String(cliResult.stderr || cliResult.stdout || '').trim()
    throw new Error(`${command} -v exited ${cliResult.status}${detail ? `: ${detail}` : ''}`)
  }

  const cliOutput = `${cliResult.stdout || ''}\n${cliResult.stderr || ''}`
  const version = assertSupportedPearCliVersion(extractPearCliVersion(cliOutput))

  const runtimeResult = spawn(command, ['versions', '--json'], spawnOptions)
  if (runtimeResult.error) {
    throw new Error(`Could not run ${command} versions --json: ${runtimeResult.error.message}`)
  }
  if (runtimeResult.status !== 0) {
    const detail = String(runtimeResult.stderr || runtimeResult.stdout || '').trim()
    throw new Error(`${command} versions --json exited ${runtimeResult.status}${detail ? `: ${detail}` : ''}`)
  }

  // Pear v3 moved application runtime ownership out of the CLI and into the
  // separately versioned pear-runtime library. The `runtimes.pear` field is
  // therefore diagnostic metadata, not the v3 platform release identity; the
  // latter is the SemVer printed by `pear -v`. Validate the NDJSON state and
  // report it, while check:pear-v3 independently pins the embedded library.
  const versions = extractPearVersionsState(runtimeResult.stdout)
  return {
    ok: true,
    command,
    version,
    versions,
    reviewed: REVIEWED_PEAR_CLI_VERSION
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    console.log(JSON.stringify(checkPearCli(), null, 2))
  } catch (error) {
    console.error(`Pear v3 CLI check failed: ${error.message}`)
    process.exitCode = 1
  }
}
