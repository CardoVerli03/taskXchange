'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, pointsToUsd, formatUsd, TAP_REWARD_POINTS, getStreakMultiplier, ENERGY_REFILL_MINUTES } from '@/lib/constants'
import type { TapState } from '@/lib/types'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  Zap,
  Flame,
  Battery,
  Timer,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface FloatingPoint {
  id: number
  points: number
  x: number
  y: number
}

export default function TapTab() {
  const { user, addPoints, setEnergy, setStreak } = useAppStore()
  const { toast } = useToast()
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([])
  const [isTapping, setIsTapping] = useState(false)
  const [nextRefillSeconds, setNextRefillSeconds] = useState<number | null>(null)
  const [tapping, setTapping] = useState(false)
  const floatingIdRef = useRef(0)
  const tapButtonRef = useRef<HTMLButtonElement>(null)

  // Calculate next refill time
  useEffect(() => {
    if (!user) return
    if (user.energy >= user.max_energy) {
      setNextRefillSeconds(null)
      return
    }

    const calculateRefill = () => {
      if (!user.last_tap_at) {
        setNextRefillSeconds(ENERGY_REFILL_MINUTES * 60)
        return
      }
      const lastTap = new Date(user.last_tap_at).getTime()
      const now = Date.now()
      const refillIntervalMs = ENERGY_REFILL_MINUTES * 60 * 1000
      const nextRefillAt = lastTap + refillIntervalMs
      const diff = Math.max(0, Math.floor((nextRefillAt - now) / 1000))
      setNextRefillSeconds(diff)
    }

    calculateRefill()
    const interval = setInterval(calculateRefill, 1000)
    return () => clearInterval(interval)
  }, [user])

  const streakMultiplier = user ? getStreakMultiplier(user.streak) : 1.0
  const energyPercent = user && user.max_energy > 0 ? (user.energy / user.max_energy) * 100 : 0
  const canTap = user ? user.energy > 0 : false

  const handleTap = useCallback(async () => {
    if (!user || !canTap || tapping) return

    setTapping(true)
    setIsTapping(true)

    try {
      const res = await fetch('/api/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegram_id }),
      })
      const data = await res.json()

      if (data.success) {
        const reward = data.data.pointsEarned || TAP_REWARD_POINTS
        const newEnergy = data.data.energy ?? user.energy - 1
        const newStreak = data.data.streak ?? user.streak

        addPoints(reward)
        setEnergy(newEnergy)
        if (newStreak !== user.streak) {
          setStreak(newStreak)
        }

        // Add floating point
        const buttonEl = tapButtonRef.current
        if (buttonEl) {
          const rect = buttonEl.getBoundingClientRect()
          const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 60
          const y = rect.top
          const id = ++floatingIdRef.current
          setFloatingPoints((prev) => [...prev, { id, points: reward, x, y }])
          setTimeout(() => {
            setFloatingPoints((prev) => prev.filter((fp) => fp.id !== id))
          }, 800)
        }
      } else {
        if (data.error?.includes('energy')) {
          toast({ title: 'No Energy', description: 'Wait for your energy to refill', variant: 'destructive' })
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Tap failed', variant: 'destructive' })
    } finally {
      setTapping(false)
      setTimeout(() => setIsTapping(false), 100)
    }
  }, [user, canTap, tapping, addPoints, setEnergy, setStreak, toast])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!user) return null

  return (
    <div className="p-4 flex flex-col items-center pb-8 relative overflow-hidden">
      {/* Streak Display */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-6"
      >
        <Card className="border-white/5 bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 card-gradient-amber" />
          <CardContent className="relative flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Flame className={`w-5 h-5 text-amber-400 ${user.streak > 0 ? 'streak-pulse' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Day {user.streak} Streak
                </p>
                <p className="text-xs text-zinc-500">
                  {streakMultiplier > 1 ? `${streakMultiplier}x multiplier active` : 'Keep going for bonuses!'}
                </p>
              </div>
            </div>
            {streakMultiplier > 1 && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                {streakMultiplier}x
              </Badge>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tap Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative my-8"
      >
        <motion.button
          ref={tapButtonRef}
          onClick={handleTap}
          disabled={!canTap || tapping}
          className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-100 ${
            canTap
              ? 'tap-glow cursor-pointer'
              : 'cursor-not-allowed'
          }`}
          style={{
            background: canTap
              ? 'radial-gradient(circle at 35% 35%, #34d399, #059669, #047857)'
              : 'radial-gradient(circle at 35% 35%, #52525b, #3f3f46, #27272a)',
          }}
          whileTap={canTap ? { scale: 0.92 } : {}}
        >
          <div className="flex flex-col items-center gap-1">
            <Zap className={`w-12 h-12 ${canTap ? 'text-white' : 'text-zinc-500'}`} />
            <span className={`text-lg font-bold ${canTap ? 'text-white' : 'text-zinc-500'}`}>
              TAP
            </span>
            {streakMultiplier > 1 && canTap && (
              <span className="text-xs font-semibold text-amber-200">
                {streakMultiplier}x
              </span>
            )}
          </div>

          {/* Ring decoration */}
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              canTap ? 'border-emerald-400/30' : 'border-zinc-600/30'
            }`}
          />
          <div
            className={`absolute -inset-2 rounded-full border ${
              canTap ? 'border-emerald-500/10' : 'border-zinc-700/10'
            }`}
          />
        </motion.button>
      </motion.div>

      {/* Energy Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full mb-6"
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-zinc-400">Energy</span>
              </div>
              <span className="text-xs text-zinc-500">
                {user.energy} / {user.max_energy}
              </span>
            </div>
            <Progress
              value={energyPercent}
              className={`h-3 bg-zinc-800 rounded-full [&>div]:${
                energyPercent > 50 ? 'bg-emerald-500' : energyPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
              } [&>div]:rounded-full`}
            />
            {!canTap && nextRefillSeconds !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <Timer className="w-3 h-3 text-zinc-500" />
                <span className="text-xs text-zinc-500">
                  Next energy in {formatTime(nextRefillSeconds)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full grid grid-cols-2 gap-3"
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{user.total_taps.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Total Taps</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <p className="text-xl font-bold text-amber-400">
              {formatUsd(pointsToUsd(user.total_taps * TAP_REWARD_POINTS))}
            </p>
            <p className="text-xs text-zinc-500">Earned from Taps</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Floating Points */}
      <AnimatePresence>
        {floatingPoints.map((fp) => (
          <motion.div
            key={fp.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -60, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed pointer-events-none z-50"
            style={{
              left: fp.x,
              top: fp.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="text-lg font-bold text-emerald-400 whitespace-nowrap">
              +{fp.points}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
