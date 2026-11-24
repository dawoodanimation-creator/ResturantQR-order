'use client'

import { useEffect } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GuestErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Guest ordering connection error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-md">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center mx-auto">
          <WifiOff className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Unable to Connect to Restaurant
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We are experiencing a temporary network issue reaching the ordering system. Your table session and cart are safe.
          </p>
        </div>

        <button
          onClick={() => reset()}
          type="button"
          className="w-full h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          If retrying does not work, please ask your server or counter staff for assistance.
        </p>
      </div>
    </div>
  )
}
