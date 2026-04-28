/**
 * List the contents of a drive directly from a local publisher
 * storage (no swarm involved). Used for diagnosing "did publish()
 * actually write the files?" without waiting on replication.
 *
 * Usage:
 *   node scripts/list-drive.js <publisher-storage-dir> <64-hex-key>
 */
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'

const [, , storage, keyHex] = process.argv
if (!storage || !keyHex) {
  console.error('usage: node scripts/list-drive.js <storage-dir> <64-hex-key>')
  process.exit(2)
}

const store = new Corestore(storage)
const drive = new Hyperdrive(store, b4a.from(keyHex, 'hex'))
await drive.ready()

console.log('drive key:', keyHex)
console.log('drive version:', drive.version)
console.log()
console.log('files:')

let count = 0
for await (const entry of drive.list('/', { recursive: true })) {
  count += 1
  const isFile = entry.value && entry.value.blob
  const size = isFile ? entry.value.blob.byteLength : '(dir)'
  console.log(`  ${isFile ? 'F' : 'D'}  ${entry.key}  ${size}`)
}
console.log()
console.log(count === 0 ? '⚠️  drive is empty' : `${count} entry/entries`)

await store.close()
process.exit(0)
