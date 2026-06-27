import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expected = [
  ['p2p-hiverelay', '0.20.2', '../../00-core/hiverelay/packages/core/package.json'],
  ['p2p-hiverelay-client', '0.20.2', '../../00-core/hiverelay/packages/client/package.json'],
  ['p2p-hiverelay-verifier', '0.20.2', '../../00-core/hiverelay/packages/verifier/package.json']
]

const missing = []
const mismatched = []

for (const [name, version, rel] of expected) {
  const path = resolve(process.cwd(), rel)
  if (!existsSync(path)) {
    missing.push(rel)
    continue
  }

  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'))
    if (pkg.name !== name || pkg.version !== version) {
      mismatched.push(`${rel} expected ${name}@${version}, found ${pkg.name || '(missing name)'}@${pkg.version || '(missing version)'}`)
    }
  } catch (err) {
    mismatched.push(`${rel} could not be read: ${err.message}`)
  }
}

if (missing.length || mismatched.length) {
  console.error('PearBrowser desktop currently uses local HiveRelay workspace packages.')
  console.error('')
  console.error('Expected repository layout:')
  console.error('  pear-ecosystem/')
  console.error('    00-core/hiverelay/')
  console.error('    01-browser/pearbrowser-desktop/')
  console.error('')
  console.error('Clone the sibling HiveRelay repo before installing:')
  console.error('  mkdir -p pear-ecosystem/00-core pear-ecosystem/01-browser')
  console.error('  git clone https://github.com/bigdestiny2/p2p-hiverelay pear-ecosystem/00-core/hiverelay')
  console.error('  git clone https://github.com/bigdestiny2/pearbrowser-desktop pear-ecosystem/01-browser/pearbrowser-desktop')
  console.error('  cd pear-ecosystem/01-browser/pearbrowser-desktop')
  console.error('  npm install')
  console.error('')
  console.error('Missing:')
  for (const rel of missing) console.error(`  - ${rel}`)
  if (mismatched.length) {
    console.error('Mismatched:')
    for (const msg of mismatched) console.error(`  - ${msg}`)
  }
  console.error('')
  console.error('Release note: the HiveRelay 0.20.2 packages are not published to npm, so a standalone pearbrowser-desktop clone is not enough yet.')
  process.exit(1)
}
