'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import type { TelegramUser } from '@/lib/types'
import AppShell from '@/components/app-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { Zap } from 'lucide-react'

export default function Home() {
  const { setUser, setIsAdmin, setInitialized, initialized } = useAppStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialized) return

    const initApp = async () => {
      try {
        // Try to get Telegram WebApp data
        const tg = (window as any).Telegram?.WebApp
        let telegramUser: TelegramUser | null = null

        if (tg) {
          tg.ready()
          tg.expand()
          telegramUser = tg.initDataUnsafe?.user || null
        }

        // Prepare user data for init
        const userData = telegramUser
          ? {
              telegramId: String(telegramUser.id),
              username: telegramUser.username || null,
              firstName: telegramUser.first_name || null,
              lastName: telegramUser.last_name || null,
            }
          : {
              // Dev mode - mock user
              telegramId: 'dev_user',
              username: 'devuser',
              firstName: 'Dev',
              lastName: null,
            }

        // Call init API
        const res = await fetch('/api/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        })

        const data = await res.json()

        if (data.success && data.data) {
          setUser(data.data.user)
          setIsAdmin(data.data.isAdmin || false)
        } else {
          setError(data.error || 'Failed to initialize')
        }
      } catch (err) {
        console.error('Init error:', err)
        setError('Network error. Please try again.')
      } finally {
        setInitialized(true)
      }
    }

    initApp()
  }, [initialized, setUser, setIsAdmin, setInitialized])

  // Loading state
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TaskX</h1>
          <p className="text-sm text-zinc-500">Earn Crypto</p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          <Skeleton className="h-12 w-full bg-zinc-800 rounded-xl" />
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-xl" />
          <Skeleton className="h-10 w-full bg-zinc-800 rounded-xl" />
        </div>
        <p className="text-xs text-zinc-600 mt-6">Initializing...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-zinc-500 mb-6 text-center">{error}</p>
        <button
          onClick={() => {
            setError(null)
            setInitialized(false)
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return <AppShell />
}
