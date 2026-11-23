'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'rqr_device_fp'

function getSnapshot(): string {
  if (typeof window === 'undefined') return ''
  let fp = localStorage.getItem(STORAGE_KEY)
  if (!fp) {
    fp = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    localStorage.setItem(STORAGE_KEY, fp)
  }
  return fp
}

function getServerSnapshot(): string {
  return ''
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

/**
 * Returns a persistent random device UUID stored in localStorage.
 * Hard-won Rule #6: Rate limit per device, not per session.
 */
export function useDeviceFingerprint(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
