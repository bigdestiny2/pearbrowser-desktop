if (!globalThis.htm || !globalThis.React) {
  throw new Error('HTM and React UMD runtimes must be loaded first')
}

export const html = globalThis.htm.bind(globalThis.React.createElement)
export default html
