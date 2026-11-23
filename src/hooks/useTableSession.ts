'use client'

import { useEffect, useState } from 'react'
import { openOrJoinSessionAction } from '@/app/actions/guest'
import { useDeviceFingerprint } from './useDeviceFingerprint'

interface SessionState {
  sessionId: string | null
  sessionToken: string | null
  tableNumber: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Hard-won Rule: The session is opened by an action AFTER mount,
 * never during page GET, so link previews and prefetches don't mark tables busy.
 */
export function useTableSession(qrToken: string) {
  const deviceFingerprint = useDeviceFingerprint()
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    sessionToken: null,
    tableNumber: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    if (!qrToken || !deviceFingerprint) return

    let isMounted = true

    async function initSession() {
      try {
        const res = await openOrJoinSessionAction({
          qrToken,
          deviceFingerprint,
        })

        if (!isMounted) return

        if (res.success && res.sessionId) {
          setSession({
            sessionId: res.sessionId,
            sessionToken: res.sessionToken || null,
            tableNumber: res.tableNumber || null,
            isLoading: false,
            error: null,
          })
        } else {
          setSession(prev => ({
            ...prev,
            isLoading: false,
            error: res.error || 'Failed to open table session',
          }))
        }
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Session initialization error'
        setSession(prev => ({ ...prev, isLoading: false, error: msg }))
      }
    }

    initSession()

    return () => {
      isMounted = false
    }
  }, [qrToken, deviceFingerprint])

  return session
}
