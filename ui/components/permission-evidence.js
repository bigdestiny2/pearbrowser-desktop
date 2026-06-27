import { useEffect, useState } from 'react'
import { normalizeLoginGrant } from '../lib/permissions.js'

export function usePermissionEvidence (rpc, C) {
  const [state, setState] = useState({ loginGrants: [], swarmGrants: [] })
  useEffect(() => {
    if (!(rpc && C && C.CMD_LOGIN_LIST_GRANTS && C.CMD_SWARM_LIST_GRANTS)) return
    let cancelled = false
    const load = async () => {
      try {
        const [loginRes, swarmRes] = await Promise.all([
          rpc.request(C.CMD_LOGIN_LIST_GRANTS).catch(() => ({ grants: [] })),
          rpc.request(C.CMD_SWARM_LIST_GRANTS).catch(() => ({ grants: [] }))
        ])
        if (cancelled) return
        setState({
          loginGrants: (Array.isArray(loginRes?.grants) ? loginRes.grants : []).map(normalizeLoginGrant).filter((g) => g.driveKey),
          swarmGrants: (Array.isArray(swarmRes?.grants) ? swarmRes.grants : []).filter((g) => g?.driveKey)
        })
      } catch {
        if (!cancelled) setState({ loginGrants: [], swarmGrants: [] })
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [rpc, C])
  return state
}
