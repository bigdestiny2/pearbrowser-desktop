// Drives the LIVE pearbrowser-desktop tab-runtime bridge headlessly.
import { chromium } from 'playwright'
const HTTP = process.argv[2], WS = process.argv[3]
const url = `http://127.0.0.1:${HTTP}/tab/demo?ws=${WS}`
let failed = false
const ok = (c, m) => { if (!c) { failed = true; console.log('  ✗ ' + m) } else console.log('  ✓ ' + m) }
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('con:'+m.text()) })
console.log('# Live pearbrowser tab-runtime bridge — ' + url)
await p.goto(url)
await p.waitForFunction(() => window.__PEAR_TAB_READY === true, null, { timeout: 12000 }).catch(()=>{})
await p.waitForFunction(() => document.body.innerText.includes('Headless htmx app'), null, { timeout: 12000 })
ok(true, 'worker served the htmx app into the tab over bare-ws (GET / via streamx)')
ok((await p.textContent('#count')).trim() === '0', 'initial count 0')
for (let i=1;i<=3;i++){ await p.click('button:has-text("Count +1")'); await p.waitForFunction(n=>document.querySelector('#count')?.textContent?.trim()===String(n), i, {timeout:5000}) }
ok((await p.textContent('#count')).trim()==='3', 'htmx POST /inc over the live bridge -> count 3')
await p.click('button:has-text("reset")'); await p.waitForFunction(()=>document.querySelector('#count')?.textContent?.trim()==='0',null,{timeout:5000})
ok(true, 'htmx POST /reset over the live bridge -> 0')
ok(((await p.textContent('#who'))||'').includes('pearbrowser backend'), 'in-proc worker label confirms it ran inside the pearbrowser backend')
await p.screenshot({ path: 'live-tab.png' })
if (errs.length){ failed = true; console.log('  errors: '+errs.join(' | ')) }
console.log('\n'+(failed?'LIVE BRIDGE FAILED':'LIVE BRIDGE PASSED — pearbrowser ran a pear-request app headless in a tab, UI streamed over bare-ws'))
await b.close(); process.exit(failed?1:0)
