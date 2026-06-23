/**
 * Browser-injectable bundle: exposes window.createPearRequest (+ a Buffer
 * polyfill the pear-request client needs) so a tab can swap in the
 * stream-backed XMLHttpRequest. esbuild -> IIFE.
 */
import { Buffer } from 'buffer'
if (!globalThis.Buffer) globalThis.Buffer = Buffer

import { create } from 'pear-request/client'
globalThis.createPearRequest = create
