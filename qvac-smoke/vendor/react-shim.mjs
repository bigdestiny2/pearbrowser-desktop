const React = globalThis.React

if (!React) throw new Error('React UMD runtime was not loaded')

export default React
export const {
  createElement,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState
} = React
