#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = parseArgs(process.argv.slice(2))
const platform = normalizePlatform(args.platform || process.env.RUNNER_OS || 'all')
const secretStore = loadSecretStore(args)
const checks = []
let unreadableSecretValuesWarned = false

if (secretStore.error) {
  add('fail', 'secret-source', 'Could not load signing secret source', secretStore.error, 'Use --secret-source env, authenticate gh for --secret-source github, or provide --github-secrets-file for offline checks.')
}

if (platform === 'all' || platform === 'macos') validateMacOS()
if (platform === 'all' || platform === 'windows') validateWindows()
if (platform === 'all' || platform === 'linux') {
  add('pass', 'linux-release-assets', 'Electron AppImage release artifacts use checksum verification', 'No release signing secrets are required for the current Linux AppImage lane.')
}

const counts = {
  pass: checks.filter((check) => check.status === 'pass').length,
  warn: checks.filter((check) => check.status === 'warn').length,
  fail: checks.filter((check) => check.status === 'fail').length
}
const report = {
  ok: counts.fail === 0,
  mode: args.requirePublicTrust ? 'public-trust' : 'package-proof',
  platform,
  secretSource: secretStore.source,
  repo: secretStore.repo,
  githubEnvironment: secretStore.githubEnvironment,
  counts,
  checks
}

if (args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`PearBrowser native signing credential check (${report.ok ? 'PASS' : 'BLOCKED'})`)
  const source = report.repo
    ? `${report.secretSource}:${report.repo}${report.githubEnvironment ? `/${report.githubEnvironment}` : ''}`
    : report.secretSource
  console.log(`mode=${report.mode} platform=${platform} secretSource=${source} pass=${counts.pass} warn=${counts.warn} fail=${counts.fail}`)
  for (const check of checks) {
    const prefix = check.status.toUpperCase().padEnd(4)
    console.log(`${prefix} ${check.id}: ${check.summary}`)
    if (check.detail) console.log(`     ${check.detail}`)
    if (check.remediation) console.log(`     ${check.remediation}`)
  }
}

process.exit(report.ok ? 0 : 1)

function validateMacOS () {
  const p12 = secret('PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64')
  const p12Password = secret('PEARBROWSER_MACOS_CERTIFICATE_PASSWORD')
  const keychainPassword = secret('PEARBROWSER_MACOS_KEYCHAIN_PASSWORD')
  const identity = secret('PEARBROWSER_MACOS_SIGNING_IDENTITY') || '-'
  const keychain = secret('PEARBROWSER_MACOS_SIGNING_KEYCHAIN')
  const appleId = secret('PEARBROWSER_MACOS_NOTARY_APPLE_ID')
  const notaryPassword = secret('PEARBROWSER_MACOS_NOTARY_PASSWORD')
  const teamId = secret('PEARBROWSER_MACOS_NOTARY_TEAM_ID')

  const certConfigured = Boolean(p12 || p12Password)
  if (!certConfigured) {
    if (args.requirePublicTrust) {
      add('fail', 'macos-certificate', 'macOS Developer ID certificate is missing', 'PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64 and PEARBROWSER_MACOS_CERTIFICATE_PASSWORD are required for public macOS distribution.', 'Export the Developer ID Application certificate as a .p12, base64-encode it, and add both GitHub Actions secrets.')
    } else {
      add('warn', 'macos-certificate', 'macOS Developer ID certificate is not configured', 'The package-proof workflow may produce an ad-hoc signed Electron .app.zip Actions artifact; it cannot create or publish a GitHub Release.', 'Add PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64, PEARBROWSER_MACOS_CERTIFICATE_PASSWORD, and PEARBROWSER_MACOS_SIGNING_IDENTITY to the protected production environment before public distribution.')
    }
  } else if (!p12 || !p12Password) {
    add('fail', 'macos-certificate', 'macOS certificate secret pair is incomplete', missingDetail({
      PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64: p12,
      PEARBROWSER_MACOS_CERTIFICATE_PASSWORD: p12Password
    }), 'Configure the certificate payload and password together.')
  } else {
    validateBase64('PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64', p12)
    if (identity === '-') {
      add('fail', 'macos-signing-identity', 'macOS certificate is configured but signing identity is still ad-hoc', 'PEARBROWSER_MACOS_SIGNING_IDENTITY must name the Developer ID Application identity when a certificate is provided.', 'Set PEARBROWSER_MACOS_SIGNING_IDENTITY to the codesign identity shown by security find-identity.')
    } else {
      const detail = keychain
        ? `identity=${identity}; keychain supplied by PEARBROWSER_MACOS_SIGNING_KEYCHAIN`
        : `identity=${identity}; CI will create a temporary signing keychain`
      add('pass', 'macos-certificate', 'macOS Developer ID certificate payload is complete', detail)
      if (!secretStore.readValues) {
        noteUnreadableSecretValues()
      } else if (!/Developer ID Application/i.test(identity)) {
        add('warn', 'macos-signing-identity', 'macOS signing identity does not mention Developer ID Application', `identity=${identity}`, 'Confirm the identity resolves to a Developer ID Application certificate before publishing public macOS assets.')
      }
    }
  }

  if (keychainPassword) {
    add('pass', 'macos-keychain-password', 'macOS temporary keychain password is configured', 'PEARBROWSER_MACOS_KEYCHAIN_PASSWORD is optional; CI falls back to the run id when absent.')
  }

  const notaryCount = [appleId, notaryPassword, teamId].filter(Boolean).length
  if (notaryCount === 0) {
    if (args.requirePublicTrust) {
      add('fail', 'macos-notary', 'macOS notarization credentials are missing', 'PEARBROWSER_MACOS_NOTARY_APPLE_ID, PEARBROWSER_MACOS_NOTARY_PASSWORD, and PEARBROWSER_MACOS_NOTARY_TEAM_ID are required for public macOS distribution.', 'Add all three notarization secrets before rerunning the native release workflow.')
    } else {
      add('warn', 'macos-notary', 'macOS notarization credentials are not configured', 'Package-proof skips notarytool/stapler; its .app.zip is not public-trust-cleared and is not attached to a release.', 'Add PEARBROWSER_MACOS_NOTARY_APPLE_ID, PEARBROWSER_MACOS_NOTARY_PASSWORD, and PEARBROWSER_MACOS_NOTARY_TEAM_ID to the protected production environment before public distribution.')
    }
  } else if (notaryCount < 3) {
    add('fail', 'macos-notary', 'macOS notarization secret set is incomplete', missingDetail({
      PEARBROWSER_MACOS_NOTARY_APPLE_ID: appleId,
      PEARBROWSER_MACOS_NOTARY_PASSWORD: notaryPassword,
      PEARBROWSER_MACOS_NOTARY_TEAM_ID: teamId
    }), 'Configure all three notarization secrets together.')
  } else if (identity === '-') {
    add('fail', 'macos-notary', 'macOS notarization is configured without a real signing identity', 'notarytool requires a Developer ID signed app; PEARBROWSER_MACOS_SIGNING_IDENTITY is still "-".', 'Set PEARBROWSER_MACOS_SIGNING_IDENTITY and provide the matching Developer ID certificate.')
  } else {
    const detail = secretStore.readValues
      ? `apple-id=${appleId}; team-id=${teamId}; password=(redacted)`
      : 'GitHub secret names are present; notary credential values are not readable by this preflight.'
    add('pass', 'macos-notary', 'macOS notarization credential set is complete', detail)
    if (!secretStore.readValues) noteUnreadableSecretValues()
  }
}

function validateWindows () {
  const pfx = secret('PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64')
  const pfxPassword = secret('PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD')
  const deferredAzure = {
    AZURE_TENANT_ID: secret('AZURE_TENANT_ID'),
    AZURE_CLIENT_ID: secret('AZURE_CLIENT_ID'),
    AZURE_CLIENT_SECRET: secret('AZURE_CLIENT_SECRET'),
    AZURE_TRUSTED_SIGNING_ENDPOINT: secret('AZURE_TRUSTED_SIGNING_ENDPOINT'),
    AZURE_TRUSTED_SIGNING_ACCOUNT: secret('AZURE_TRUSTED_SIGNING_ACCOUNT'),
    AZURE_TRUSTED_SIGNING_CERT_PROFILE: secret('AZURE_TRUSTED_SIGNING_CERT_PROFILE')
  }
  const azureConfigured = Object.values(deferredAzure).some(Boolean)
  const certConfigured = Boolean(pfx || pfxPassword)

  if (azureConfigured) {
    add('warn', 'windows-azure-deferred', 'Azure Trusted Signing is not an accepted v0.9.1 release credential', 'The electron-builder 26 Azure route installs a mutable TrustedSigning PowerShell module at build time, so this lane remains deferred.', 'Use the reviewed PFX certificate/password route for v0.9.1. Re-enable Azure only after its module and integration are version-pinned and reviewed.')
  }

  if (!certConfigured) {
    if (args.requirePublicTrust) {
      add('fail', 'windows-certificate', 'Windows PFX signing certificate is missing', 'PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64 and PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD are both required for the public-trust NSIS installer.', 'Export the Authenticode code-signing certificate and private key as a password-protected .pfx, base64-encode it, and add both secrets to the protected production environment.')
    } else {
      add('warn', 'windows-certificate', 'Windows PFX signing certificate is not configured', 'Package-proof may upload an unsigned NSIS .exe as an Actions artifact; it cannot create or publish a GitHub Release.', 'Add PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64 and PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD to the protected production environment before public distribution.')
    }
  } else if (!pfx || !pfxPassword) {
    add('fail', 'windows-certificate', 'Windows certificate secret pair is incomplete', missingDetail({
      PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64: pfx,
      PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD: pfxPassword
    }), 'Configure the PFX payload and password together.')
  } else {
    validateBase64('PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64', pfx)
    add('pass', 'windows-certificate', 'Windows PFX signing certificate payload is complete', 'electron-builder will use this PFX to Authenticode-sign the application executable, uninstaller, and final NSIS .exe before release verification.')
  }
}

function validateBase64 (name, value) {
  if (!secretStore.readValues) {
    noteUnreadableSecretValues()
    return
  }
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) {
    add('fail', `${name.toLowerCase()}-base64`, `${name} is empty`, '', 'Provide a non-empty base64-encoded certificate payload.')
    return
  }
  if (normalized.length % 4 !== 0 || !/^[a-z0-9+/]+={0,2}$/i.test(normalized)) {
    add('fail', `${name.toLowerCase()}-base64`, `${name} is not valid standard base64`, `length=${normalized.length}`, 'Encode the binary certificate with standard base64, not base64url.')
    return
  }
  const decoded = Buffer.from(normalized, 'base64')
  if (decoded.length === 0) {
    add('fail', `${name.toLowerCase()}-base64`, `${name} decodes to an empty payload`, '', 'Re-export and re-encode the certificate payload.')
  }
}

function add (status, id, summary, detail = '', remediation = '') {
  checks.push({ status, id, summary, detail, remediation })
}

function secret (name) {
  return secretStore.value(name)
}

function missingDetail (vars) {
  const missing = Object.entries(vars).filter(([, value]) => !value).map(([name]) => name)
  return `missing ${missing.join(', ')}`
}

function loadSecretStore (args) {
  const source = normalizeSecretSource(args.secretSource || (args.githubSecretsFile ? 'github' : 'env'))
  if (source === 'env') {
    return {
      source,
      repo: '',
      githubEnvironment: '',
      readValues: true,
      error: '',
      value: (name) => (process.env[name] || '').trim()
    }
  }

  const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'
  // Public-trust credentials belong to the protected environment. Never
  // silently inspect repository-wide secrets when the operator selects the
  // GitHub source; an explicit environment can override this for test/staging.
  const githubEnvironment = args.githubEnvironment || 'production'
  try {
    const names = args.githubSecretsFile
      ? namesFromGithubSecretsJson(readFileSync(args.githubSecretsFile, 'utf8'))
      : namesFromGithubSecretsJson(execFileSync('gh', [
        'secret',
        'list',
        '--repo',
        repo,
        ...(githubEnvironment ? ['--env', githubEnvironment] : []),
        '--json',
        'name'
      ], { encoding: 'utf8' }))
    return {
      source,
      repo,
      githubEnvironment,
      readValues: false,
      error: '',
      value: (name) => names.has(name) ? name : ''
    }
  } catch (err) {
    const stderr = err?.stderr ? String(err.stderr).trim() : ''
    return {
      source,
      repo,
      githubEnvironment,
      readValues: false,
      error: stderr || (err && err.message ? err.message : String(err)),
      value: () => ''
    }
  }
}

function namesFromGithubSecretsJson (text) {
  const parsed = JSON.parse(String(text || '[]'))
  const entries = Array.isArray(parsed) ? parsed : parsed.secrets
  if (!Array.isArray(entries)) throw new Error('GitHub secret list must be an array or an object with a secrets array')
  return new Set(entries
    .map((entry) => typeof entry === 'string' ? entry : entry?.name)
    .filter(Boolean)
    .map(String))
}

function normalizeSecretSource (value) {
  const source = String(value || '').toLowerCase()
  if (source === 'env' || source === 'environment') return 'env'
  if (source === 'github' || source === 'github-actions' || source === 'actions') return 'github'
  failUsage(`unknown secret source: ${value}`)
}

function noteUnreadableSecretValues () {
  if (secretStore.readValues || unreadableSecretValuesWarned) return
  unreadableSecretValuesWarned = true
  add('warn', 'secret-values-unreadable', 'GitHub Actions secret values are not readable by this preflight', 'Secret names are present; the native release workflow still validates certificate import, signing, and notarization when it runs.')
}

function parseArgs (argv) {
  const parsed = {
    platform: '',
    json: false,
    requirePublicTrust: false,
    secretSource: '',
    repo: '',
    githubEnvironment: '',
    githubSecretsFile: ''
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--platform') {
      parsed.platform = argv[++i] || ''
      if (!parsed.platform || parsed.platform.startsWith('--')) failUsage('--platform requires a value')
    } else if (arg === '--secret-source') {
      parsed.secretSource = argv[++i] || ''
      if (!parsed.secretSource || parsed.secretSource.startsWith('--')) failUsage('--secret-source requires a value')
    } else if (arg === '--repo') {
      parsed.repo = argv[++i] || ''
      if (!parsed.repo || parsed.repo.startsWith('--')) failUsage('--repo requires a value')
    } else if (arg === '--github-environment') {
      parsed.githubEnvironment = argv[++i] || ''
      if (!parsed.githubEnvironment || parsed.githubEnvironment.startsWith('--')) failUsage('--github-environment requires a value')
    } else if (arg === '--github-secrets-file') {
      parsed.githubSecretsFile = argv[++i] || ''
      if (!parsed.githubSecretsFile || parsed.githubSecretsFile.startsWith('--')) failUsage('--github-secrets-file requires a value')
    } else if (arg === '--github-secrets') {
      parsed.secretSource = 'github'
    } else if (arg === '--json') {
      parsed.json = true
    } else if (arg === '--require-public-trust') {
      parsed.requirePublicTrust = true
    } else {
      failUsage(`unknown argument: ${arg}`)
    }
  }
  return parsed
}

function normalizePlatform (value) {
  const normalized = String(value || '').toLowerCase()
  if (['all', '*'].includes(normalized)) return 'all'
  if (['macos', 'mac', 'darwin'].includes(normalized)) return 'macos'
  if (['windows', 'win32'].includes(normalized)) return 'windows'
  if (['linux'].includes(normalized)) return 'linux'
  failUsage(`unknown platform: ${value}`)
}

function failUsage (message) {
  console.error(message)
  console.error('usage: node scripts/check-native-signing-credentials.mjs [--platform all|macos|windows|linux] [--require-public-trust] [--secret-source env|github] [--repo owner/repo] [--github-environment name] [--github-secrets-file secrets.json] [--json]')
  process.exit(2)
}
