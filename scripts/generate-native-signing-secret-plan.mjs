#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const args = parseArgs(process.argv.slice(2))
const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'
const tag = args.tag || `v${pkg.version}`
const sourceRef = args.sourceRef || '<merged-main-commit>'
const platform = normalizePlatform(args.platform || 'all')
const format = normalizeFormat(args.format || 'markdown')
const secrets = secretDefinitions()
  .filter((secret) => platform === 'all' || secret.platform === platform)
  .map((secret) => ({
    name: secret.name,
    platform: secret.platform,
    required: secret.required,
    label: secret.label,
    value: secret.value,
    prepare: secret.prepare,
    command: secret.command(repo)
  }))

const report = {
  repo,
  tag,
  sourceRef,
  platform,
  secrets,
  requiredSecrets: secrets.filter((secret) => secret.required).map((secret) => secret.name),
  optionalSecrets: secrets.filter((secret) => !secret.required).map((secret) => secret.name),
  verificationCommands: verificationCommands(repo, tag, sourceRef),
  notes: [
    'Do not commit certificate files, passwords, app-specific passwords, or secret values.',
    'GitHub secret values are not readable after upload; the preflight confirms names and CI validates import/sign/notarization.',
    'Linux AppImage release assets currently rely on SHA-256 sidecars and do not require signing secrets.'
  ]
}

if (format === 'json') printJson(report)
else printMarkdown(report)

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printMarkdown (report) {
  console.log('# Native Signing Secret Setup')
  console.log('')
  console.log(`Repository: \`${report.repo}\``)
  console.log(`Release tag: \`${report.tag}\``)
  console.log('')
  console.log('Use this before a `public-trust` Desktop Native Release. It names the GitHub Actions secrets that unblock Developer ID notarization on macOS and Authenticode signing on Windows; it intentionally never includes secret values.')
  console.log('')

  if (!report.secrets.length) {
    console.log('No signing secrets are required for this platform. The current Linux AppImage path relies on attached SHA-256 sidecars and the Linux metadata gate.')
    console.log('')
  } else {
    printSecretTable('Required Secrets', report.secrets.filter((secret) => secret.required))
    printSecretTable('Optional Secrets', report.secrets.filter((secret) => !secret.required))
    printCommandSection(report.secrets)
  }

  console.log('## Verify')
  console.log('')
  console.log('After setting the secrets, confirm the secret names are present and rerun the public-trust gate:')
  console.log('')
  console.log('```sh')
  for (const command of report.verificationCommands) console.log(command)
  console.log('```')
  console.log('')
  console.log('## Notes')
  console.log('')
  for (const note of report.notes) console.log(`- ${note}`)
}

function printSecretTable (heading, rows) {
  console.log(`## ${heading}`)
  console.log('')
  if (!rows.length) {
    console.log('None.')
    console.log('')
    return
  }
  console.log('| Secret | Platform | Value to store | Prepare |')
  console.log('| --- | --- | --- | --- |')
  for (const secret of rows) {
    console.log(`| \`${secret.name}\` | ${platformLabel(secret.platform)} | ${secret.value} | ${secret.prepare} |`)
  }
  console.log('')
}

function printCommandSection (secrets) {
  console.log('## Set Commands')
  console.log('')
  console.log('Use the file commands for certificate payloads. For password, identity, and account values, set the matching environment variable in the current shell, run the command, then unset it.')
  console.log('')
  for (const group of ['macos', 'windows']) {
    const groupSecrets = secrets.filter((secret) => secret.platform === group)
    if (!groupSecrets.length) continue
    console.log(`### ${platformLabel(group)}`)
    console.log('')
    console.log('```sh')
    for (const secret of groupSecrets) {
      console.log(`# ${secret.name}`)
      console.log(secret.command)
    }
    console.log('```')
    console.log('')
  }
}

function verificationCommands (repo, tag, sourceRef) {
  return [
    `gh secret list --repo ${shellQuote(repo)} --json name`,
    `npm run check:native-signing -- --require-public-trust --secret-source github --repo ${shellQuote(repo)}`,
    `npm run check:public-trust-readiness -- --tag ${shellQuote(tag)} --repo ${shellQuote(repo)} --source-ref ${shellQuote(sourceRef)} --signing-secret-source github`
  ]
}

function envSecretCommand (name, repo) {
  return `printf '%s' "$${name}" | gh secret set ${name} --repo ${shellQuote(repo)}`
}

function fileSecretCommand (name, file, repo) {
  return `openssl base64 -A -in ${shellQuote(file)} | gh secret set ${name} --repo ${shellQuote(repo)}`
}

function platformLabel (value) {
  if (value === 'macos') return 'macOS'
  if (value === 'windows') return 'Windows'
  if (value === 'linux') return 'Linux'
  return value
}

function shellQuote (value) {
  const text = String(value || '')
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text
  return `'${text.replace(/'/g, "'\\''")}'`
}

function normalizePlatform (value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'all' || normalized === '*') return 'all'
  if (normalized === 'macos' || normalized === 'mac' || normalized === 'darwin') return 'macos'
  if (normalized === 'windows' || normalized === 'win32') return 'windows'
  if (normalized === 'linux') return 'linux'
  failUsage(`unknown platform: ${value}`)
}

function normalizeFormat (value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'markdown' || normalized === 'md') return 'markdown'
  if (normalized === 'json') return 'json'
  failUsage(`unknown format: ${value}`)
}

function parseArgs (argv) {
  const parsed = {
    repo: '',
    tag: '',
    sourceRef: '',
    platform: '',
    format: ''
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--repo') {
      parsed.repo = argv[++i] || ''
      if (!parsed.repo || parsed.repo.startsWith('--')) failUsage('--repo requires a value')
    } else if (arg === '--tag') {
      parsed.tag = argv[++i] || ''
      if (!parsed.tag || parsed.tag.startsWith('--')) failUsage('--tag requires a value')
    } else if (arg === '--source-ref') {
      parsed.sourceRef = argv[++i] || ''
      if (!parsed.sourceRef || parsed.sourceRef.startsWith('--')) failUsage('--source-ref requires a value')
    } else if (arg === '--platform') {
      parsed.platform = argv[++i] || ''
      if (!parsed.platform || parsed.platform.startsWith('--')) failUsage('--platform requires a value')
    } else if (arg === '--format') {
      parsed.format = argv[++i] || ''
      if (!parsed.format || parsed.format.startsWith('--')) failUsage('--format requires a value')
    } else if (arg === '--json') {
      parsed.format = 'json'
    } else {
      failUsage(`unknown argument: ${arg}`)
    }
  }
  return parsed
}

function failUsage (message) {
  console.error(message)
  console.error('usage: node scripts/generate-native-signing-secret-plan.mjs [--repo owner/repo] [--tag v0.5.0] [--source-ref main] [--platform all|macos|windows|linux] [--format markdown|json] [--json]')
  process.exit(2)
}

function secretDefinitions () {
  return [
  {
    name: 'PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64',
    platform: 'macos',
    required: true,
    label: 'Developer ID certificate payload',
    value: 'Standard base64 of the exported Developer ID Application .p12 certificate.',
    prepare: 'Export the Developer ID Application certificate and private key as DeveloperIDApplication.p12.',
    command: (repo) => fileSecretCommand('PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64', 'DeveloperIDApplication.p12', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_CERTIFICATE_PASSWORD',
    platform: 'macos',
    required: true,
    label: 'Developer ID certificate password',
    value: 'Password for the exported .p12 certificate.',
    prepare: 'Use the password chosen while exporting DeveloperIDApplication.p12.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_CERTIFICATE_PASSWORD', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_SIGNING_IDENTITY',
    platform: 'macos',
    required: true,
    label: 'Developer ID signing identity',
    value: 'Exact codesign identity, for example Developer ID Application: PearBrowser Desktop (TEAMID).',
    prepare: 'Run security find-identity -v -p codesigning on the Mac that has the certificate.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_SIGNING_IDENTITY', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_NOTARY_APPLE_ID',
    platform: 'macos',
    required: true,
    label: 'Apple notarization account',
    value: 'Apple ID email used with notarytool.',
    prepare: 'Use the Apple developer account that can notarize for the signing team.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_NOTARY_APPLE_ID', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_NOTARY_PASSWORD',
    platform: 'macos',
    required: true,
    label: 'Apple notarization password',
    value: 'App-specific password or notarytool-compatible password for the Apple ID.',
    prepare: 'Create an app-specific password for the Apple ID when two-factor auth is enabled.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_NOTARY_PASSWORD', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_NOTARY_TEAM_ID',
    platform: 'macos',
    required: true,
    label: 'Apple developer team ID',
    value: '10-character Apple Developer Team ID.',
    prepare: 'Read the Team ID from the Apple Developer account or certificate details.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_NOTARY_TEAM_ID', repo)
  },
  {
    name: 'PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64',
    platform: 'windows',
    required: true,
    label: 'Windows code-signing certificate payload',
    value: 'Standard base64 of the exported .pfx code-signing certificate.',
    prepare: 'Export the Authenticode code-signing certificate and private key as PearBrowserSigning.pfx.',
    command: (repo) => fileSecretCommand('PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64', 'PearBrowserSigning.pfx', repo)
  },
  {
    name: 'PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD',
    platform: 'windows',
    required: true,
    label: 'Windows code-signing certificate password',
    value: 'Password for the exported .pfx certificate.',
    prepare: 'Use the password chosen while exporting PearBrowserSigning.pfx.',
    command: (repo) => envSecretCommand('PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_KEYCHAIN_PASSWORD',
    platform: 'macos',
    required: false,
    label: 'Temporary macOS CI keychain password',
    value: 'Password for the temporary CI signing keychain.',
    prepare: 'Leave unset unless the default run-id keychain password is unsuitable.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_KEYCHAIN_PASSWORD', repo)
  },
  {
    name: 'PEARBROWSER_MACOS_SIGNING_KEYCHAIN',
    platform: 'macos',
    required: false,
    label: 'Existing macOS signing keychain',
    value: 'Path or name of an existing keychain on the runner.',
    prepare: 'Usually leave unset so CI creates a temporary keychain from the .p12 secret.',
    command: (repo) => envSecretCommand('PEARBROWSER_MACOS_SIGNING_KEYCHAIN', repo)
  },
  {
    name: 'PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT',
    platform: 'windows',
    required: false,
    label: 'Windows signing certificate thumbprint',
    value: '40-hex-character SHA-1 certificate thumbprint.',
    prepare: 'Leave unset so CI uses the imported PFX certificate thumbprint, or read it from certmgr.',
    command: (repo) => envSecretCommand('PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT', repo)
  },
  {
    name: 'PEARBROWSER_WINDOWS_SIGNING_SUBJECT',
    platform: 'windows',
    required: false,
    label: 'Windows MSIX signing subject',
    value: 'Certificate subject, default CN=PearBrowser Desktop.',
    prepare: 'Set only when the production certificate subject differs from the default.',
    command: (repo) => envSecretCommand('PEARBROWSER_WINDOWS_SIGNING_SUBJECT', repo)
  }
  ]
}
