'use client'

import { useAppStore } from '@/hooks/use-app-store'
import {
  formatPoints,
  formatUsd,
  pointsToUsd,
  TAP_REWARD_POINTS,
  getStreakMultiplier,
  getOrbTier,
  ENERGY_REFILL_MINUTES,
  MYSTERY_BOX_INTERVAL,
  DAILY_BONUS_BASE,
  rollMysteryBox,
} from '@/lib/constants'
import type { MysteryBoxResult, DailyBonusResult, OrbTier } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Flame,
  Battery,
  Timer,
  TrendingUp,
  Activity,
  Box,
  Sparkles,
  Gift,
  Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

// ============ TYPES ============
interface FloatingPoint {
  id: number
  points: number
  x: number
  y: number
}

interface Particle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  color: string
}

// ============ ORB TIER CONFIG ============
const orbTierConfig: Record<OrbTier, {
  gradient: string
  glowClass: string
  ringColor: string
  outerRingColor: string
  particleColor: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  icon: string
}> = {
  green: {
    gradient: 'radial-gradient(circle at 35% 35%, #34d399, #059669, #047857)',
    glowClass: 'orb-glow-green',
    ringColor: 'border-emerald-400/30',
    outerRingColor: 'border-emerald-500/10',
    particleColor: '#34d399',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    icon: '🟢',
  },
  gold: {
    gradient: 'radial-gradient(circle at 35% 35%, #fbbf24, #d97706, #b45309)',
    glowClass: 'orb-glow-gold',
    ringColor: 'border-amber-400/30',
    outerRingColor: 'border-amber-500/10',
    particleColor: '#fbbf24',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/20',
    icon: '🟡',
  },
  purple: {
    gradient: 'radial-gradient(circle at 35% 35%, #a78bfa, #7c3aed, #5b21b6)',
    glowClass: 'orb-glow-purple',
    ringColor: 'border-violet-400/30',
    outerRingColor: 'border-violet-500/10',
    particleColor: '#a78bfa',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    badgeBorder: 'border-violet-500/20',
    icon: '🟣',
  },
  diamond: {
    gradient: 'radial-gradient(circle at 35% 35%, #67e8f9, #06b6d4, #0891b2)',
    glowClass: 'orb-glow-diamond',
    ringColor: 'border-cyan-400/30',
    outerRingColor: 'border-cyan-500/10',
    particleColor: '#67e8f9',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/20',
    icon: '💎',
  },
}

const mysteryTierColors: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  common: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/30' },
  uncommon: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/30' },
  rare: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', glow: 'shadow-violet-500/30' },
  legendary: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/30' },
}

export default function TapTab() {
  const { user, addPoints, setEnergy, setStreak } = useAppStore()
  const { toast } = useToast()
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [nextRefillSeconds, setNextRefillSeconds] = useState<number | null>(null)
  const [tapping, setTapping] = useState(false)
  const [showMysteryBox, setShowMysteryBox] = useState(false)
  const [mysteryBoxResult, setMysteryBoxResult] = useState<MysteryBoxResult | null>(null)
  const [mysteryBoxPhase, setMysteryBoxPhase] = useState<'shake' | 'open' | 'reveal'>('shake')
  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [dailyBonusResult, setDailyBonusResult] = useState<DailyBonusResult | null>(null)
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false)

  const floatingIdRef = useRef(0)
  const particleIdRef = useRef(0)
  const tapButtonRef = useRef<HTMLButtonElement>(null)
  const tapCountSinceLastMystery = useRef(0)

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
  const orbTier = user ? getOrbTier(user.streak) : 'green'
  const tierConfig = orbTierConfig[orbTier]
  const energyPercent = user && user.max_energy > 0 ? (user.energy / user.max_energy) * 100 : 0
  const canTap = user ? user.energy > 0 : false

  // Spawn particles from the orb
  const spawnParticles = useCallback((cx: number, cy: number, count: number = 7) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const distance = 60 + Math.random() * 40
      newParticles.push({
        id: ++particleIdRef.current,
        x: cx,
        y: cy,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: tierConfig.particleColor,
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)))
    }, 600)
  }, [tierConfig.particleColor])

  // Handle tap
  const handleTap = useCallback(async () => {
    if (!user || !canTap || tapping) return

    setTapping(true)

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

        // Spawn floating point
        const buttonEl = tapButtonRef.current
        if (buttonEl) {
          const rect = buttonEl.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const fx = cx + (Math.random() - 0.5) * 60
          const fy = rect.top - 10
          const id = ++floatingIdRef.current
          setFloatingPoints((prev) => [...prev, { id, points: reward, x: fx, y: fy }])
          setTimeout(() => {
            setFloatingPoints((prev) => prev.filter((fp) => fp.id !== id))
          }, 900)

          // Spawn particles
          spawnParticles(cx, cy)
        }

        // Check for daily bonus (first tap of the day)
        const today = new Date().toISOString().split('T')[0]
        if (user.last_daily_bonus_date !== today && !dailyBonusClaimed) {
          const bonusPoints = Math.floor(DAILY_BONUS_BASE * streakMultiplier)
          setDailyBonusResult({ claimed: true, points: bonusPoints, streak: newStreak })
          setShowDailyBonus(true)
          setDailyBonusClaimed(true)
        }

        // Check for mystery box
        tapCountSinceLastMystery.current += 1
        if (tapCountSinceLastMystery.current >= MYSTERY_BOX_INTERVAL) {
          tapCountSinceLastMystery.current = 0
          const mbResult = rollMysteryBox()
          setMysteryBoxResult({ triggered: true, reward: mbResult.reward, tier: mbResult.tier })
          setShowMysteryBox(true)
          setMysteryBoxPhase('shake')

          // Add mystery box points
          addPoints(mbResult.reward)

          // Phase transitions
          setTimeout(() => setMysteryBoxPhase('open'), 600)
          setTimeout(() => setMysteryBoxPhase('reveal'), 1100)
          setTimeout(() => {
            setShowMysteryBox(false)
            setMysteryBoxResult(null)
          }, 4000)
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
    }
  }, [user, canTap, tapping, addPoints, setEnergy, setStreak, toast, spawnParticles, streakMultiplier, dailyBonusClaimed])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!user) return null

  return (
    <div className="p-4 flex flex-col items-center pb-8 relative overflow-hidden">
      {/* ============ STREAK DISPLAY ============ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-4"
      >
        <Card className="border-white/5 bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 card-gradient-amber opacity-60" />
          <CardContent className="relative flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${tierConfig.badgeBg} flex items-center justify-center`}>
                <Flame className={`w-5 h-5 ${tierConfig.badgeText} ${user.streak > 0 ? 'streak-pulse' : ''}`} />
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
            <div className="flex items-center gap-2">
              <Badge className={`${tierConfig.badgeBg} ${tierConfig.badgeText} border ${tierConfig.badgeBorder} capitalize`}>
                {orbTier}
              </Badge>
              {streakMultiplier > 1 && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {streakMultiplier}x
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============ THE ORB ============ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative my-4"
      >
        <motion.button
          ref={tapButtonRef}
          onClick={handleTap}
          disabled={!canTap || tapping}
          className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-100 ${
            canTap
              ? `${tierConfig.glowClass} cursor-pointer`
              : 'cursor-not-allowed'
          }`}
          style={{
            background: canTap
              ? tierConfig.gradient
              : 'radial-gradient(circle at 35% 35%, #52525b, #3f3f46, #27272a)',
          }}
          whileTap={canTap ? { scale: 0.9 } : {}}
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

          {/* Inner Ring */}
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              canTap ? tierConfig.ringColor : 'border-zinc-600/30'
            }`}
          />
          {/* Outer Ring */}
          <div
            className={`absolute -inset-3 rounded-full border ${
              canTap ? tierConfig.outerRingColor : 'border-zinc-700/10'
            }`}
          />
          {/* Diamond shimmer overlay */}
          {orbTier === 'diamond' && canTap && (
            <div className="absolute inset-0 rounded-full diamond-shimmer" />
          )}
        </motion.button>
      </motion.div>

      {/* ============ ENERGY BAR ============ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full mb-4"
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Battery className={`w-4 h-4 text-emerald-400 ${!canTap ? 'energy-pulse' : ''}`} />
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

      {/* ============ STATS ROW ============ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full grid grid-cols-3 gap-3"
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{user.total_taps.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500">Total Taps</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-400">
              {formatUsd(pointsToUsd(user.total_taps * TAP_REWARD_POINTS))}
            </p>
            <p className="text-[10px] text-zinc-500">Earned Tapping</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <Box className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-violet-400">{user.total_mystery_boxes}</p>
            <p className="text-[10px] text-zinc-500">Mystery Boxes</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============ FLOATING POINTS ============ */}
      <AnimatePresence>
        {floatingPoints.map((fp) => (
          <motion.div
            key={fp.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -80, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="fixed pointer-events-none z-50"
            style={{
              left: fp.x,
              top: fp.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="text-lg font-bold text-emerald-400 whitespace-nowrap drop-shadow-lg">
              +{fp.points}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ============ PARTICLES ============ */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: p.x, top: p.y, scale: 1, opacity: 1 }}
            animate={{ left: p.x + p.dx, top: p.y + p.dy, scale: 0, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed w-2 h-2 rounded-full pointer-events-none z-40"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>

      {/* ============ MYSTERY BOX OVERLAY ============ */}
      <AnimatePresence>
        {showMysteryBox && mysteryBoxResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowMysteryBox(false)
              setMysteryBoxResult(null)
            }}
          >
            <div className="flex flex-col items-center gap-4">
              {mysteryBoxPhase === 'shake' && (
                <motion.div
                  className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center border-2 border-violet-400/30 mystery-box-shake"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Box className="w-14 h-14 text-violet-200" />
                </motion.div>
              )}

              {mysteryBoxPhase === 'open' && (
                <motion.div
                  className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center border-2 border-violet-400/30 mystery-box-open"
                >
                  <Box className="w-14 h-14 text-violet-200" />
                </motion.div>
              )}

              {mysteryBoxPhase === 'reveal' && (
                <motion.div
                  className="flex flex-col items-center gap-3 mystery-box-reveal"
                >
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 ${
                    mysteryTierColors[mysteryBoxResult.tier].bg
                  } ${mysteryTierColors[mysteryBoxResult.tier].border} shadow-lg ${
                    mysteryTierColors[mysteryBoxResult.tier].glow
                  }`}>
                    <Gift className={`w-10 h-10 ${mysteryTierColors[mysteryBoxResult.tier].text}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-medium uppercase tracking-wider ${mysteryTierColors[mysteryBoxResult.tier].text}`}>
                      {mysteryBoxResult.tier}
                    </p>
                    <h2 className="text-2xl font-bold text-white mt-1">
                      MYSTERY BOX!
                    </h2>
                    <p className={`text-3xl font-bold mt-2 ${mysteryTierColors[mysteryBoxResult.tier].text}`}>
                      +{mysteryBoxResult.reward} pts
                    </p>
                  </div>

                  {/* Celebration particles for legendary */}
                  {mysteryBoxResult.tier === 'legendary' && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const angle = (Math.PI * 2 * i) / 20
                        const dist = 100 + Math.random() * 100
                        return (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                              left: '50%',
                              top: '50%',
                              backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#67e8f9', '#a78bfa'][i % 5],
                            }}
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                            animate={{
                              x: Math.cos(angle) * dist,
                              y: Math.sin(angle) * dist,
                              scale: 0,
                              opacity: 0,
                            }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              <p className="text-xs text-zinc-500">Tap anywhere to dismiss</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ DAILY BONUS MODAL ============ */}
      <AnimatePresence>
        {showDailyBonus && dailyBonusResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              className="flex flex-col items-center gap-4 bonus-pop"
              onClick={() => setShowDailyBonus(false)}
            >
              <div className="w-28 h-28 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center bonus-glow">
                <Star className="w-12 h-12 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
                  Daily Bonus
                </p>
                <h2 className="text-2xl font-bold text-white mt-1">
                  Day {dailyBonusResult.streak} Bonus!
                </h2>
                <p className="text-3xl font-bold text-amber-400 mt-2">
                  +{dailyBonusResult.points} pts
                </p>
              </div>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white mt-2"
                onClick={() => setShowDailyBonus(false)}
              >
                Claim!
              </Button>

              {/* Confetti-like particles */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 12
                  const dist = 80 + Math.random() * 80
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        backgroundColor: ['#fbbf24', '#f59e0b', '#34d399', '#a78bfa'][i % 4],
                      }}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        scale: 0,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
