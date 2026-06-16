// ESM bridge for schema-sheets.
//
// The Bare/Pear CJS backend can't dynamic-import the bare specifier
// 'schema-sheets' directly ("Cannot find referrer"). A RELATIVE dynamic import
// of this .mjs DOES resolve, and the static import below runs through the ESM
// resolver (which handles node_modules). So sheets-catalog.js does
// `await import('./sheets-import.mjs')` to reach schema-sheets under Bare.
import SchemaSheets from 'schema-sheets'
export default SchemaSheets
