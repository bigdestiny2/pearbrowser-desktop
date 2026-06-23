import { chromium } from 'playwright'
const HTTP = process.argv[2], WS = process.argv[3]
const url = `http://127.0.0.1:${HTTP}/tab/demo-worker?ws=${WS}`
let failed = false
const ok = (c, m) => { if (!c) { failed = true; console.log('  ✗ ' + m) } else console.log('  ✓ ' + m) }
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('con:'+m.text()) })
console.log('# REAL pear-run worker path — ' + url)
await p.goto(url)
await p.waitForFunction(() => window.__PEAR_TAB_READY === true, null, { timeout: 15000 }).catch(()=>{})
// generous: spawning a real worker process + first GET / can take a few seconds
await p.waitForFunction(() => document.body.innerText.includes('Real pear-request worker'), null, { timeout: 40000 })
ok(true, 'pear-run spawned an ISOLATED worker process; its htmx UI streamed into the tab')
ok((await p.textContent('#count')).trim() === '0', 'initial count 0 (from the worker)')
for (let i=1;i<=4;i++){ await p.click('button:has-text("Count +1")'); await p.waitForFunction(n=>document.querySelector('#count')?.textContent?.trim()===String(n), i, {timeout:8000}) }
ok((await p.textContent('#count')).trim()==='4', 'htmx POST /inc over the worker pipe -> count 4 (stateful worker)')
await p.click('button:has-text("reset")'); await p.waitForFunction(()=>document.querySelector('#count')?.textContent?.trim()==='0',null,{timeout:8000})
ok(true, 'htmx POST /reset over the worker pipe -> 0')
const who = (await p.textContent('#who'))||''
ok(who.includes('isolated pear-run worker'), 'whoami confirms an isolated pear-run worker: "'+who.replace(/<[^>]+>/g,'').trim()+'"')
await p.screenshot({ path: 'live-worker.png' })
if (errs.length){ failed = true; console.log('  errors: '+errs.join(' | ')) }
console.log('\n'+(failed?'PEAR-RUN WORKER PATH FAILED':'PEAR-RUN WORKER PATH PASSED — isolated headless worker, UI streamed into a tab end-to-end'))
await b.close(); process.exit(failed?1:0)
