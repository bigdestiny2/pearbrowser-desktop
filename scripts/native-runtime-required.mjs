#!/usr/bin/env node

// The old source commands started PearBrowser through `pear run`. That command
// accepted remote project links and hides the boundary a native v3 browser must
// own. Do not revive it as a fallback. This guard stays explicit until the
// pinned embedded runtime host, local worker boot/shutdown smoke, and native
// package build are present in this checkout.

const mode = process.argv.includes('--smoke') ? 'smoke' : process.argv.includes('--dev') ? 'development' : 'run'

console.error(`PearBrowser v3 ${mode} host is not configured in this source checkout.`)
console.error('Use a verified native package, or complete the embedded pear-runtime host migration first.')
console.error('A remote pear:// record must never be passed to PearRuntime.run().')
process.exitCode = 1
