'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, pointsToUsd, formatUsd, getOrbTier } from '@/lib/constants'
import { motion } from 'framer-motion'
import {
  Flame,
  Briefcase,
  Zap,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Star,
  Activity,
  X,
  Coins,
  DollarSign,
  Sparkles,
  Box,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Submission } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const orbTierColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20' },
  gold: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/20' },
  purple: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/20' },
  diamond: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20' },
}

export default function HomeTab() {
  const { user, setActiveTab } = useAppStore()
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`/api/submissions?user_id=${user.telegram_id}`)
        const data = await res.json()
        if (data.success) {
          setRecentSubmissions((data.data?.submissions || []).slice(0, 5))
        }
      } catch {
        // silently fail
      } finally {
        setLoadingSubmissions(false)
      }
    }
    fetchSubmissions()
  }, [user])

  if (!user) return null

  const energyPercent = user.max_energy > 0 ? (user.energy / user.max_energy) * 100 : 0
  const orbTier = getOrbTier(user.streak)
  const tierColors = orbTierColors[orbTier]

  const quickActions = [
    { label: 'View Tasks', icon: Briefcase, tab: 'tasks' as const, color: 'emerald' },
    { label: 'Start Tapping', icon: Zap, tab: 'tap' as const, color: 'amber' },
    { label: 'Post S4S', icon: ArrowLeftRight, tab: 's4s' as const, color: 'violet' },
  ]

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'text-amber-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: 'text-violet-400' },
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-white">
          Hey, {user.first_name || user.username || 'User'}
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">Ready to earn today?</p>
      </motion.div>

      {/* Two Balance Cards Side by Side */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 gap-3"
      >
        {/* Points Card */}
        <Card className="border-white/5 bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 card-gradient-emerald" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Points</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatPoints(user.points)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">points</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{formatUsd(pointsToUsd(user.points))}</span>
            </div>
          </CardContent>
        </Card>

        {/* USD Card */}
        <Card className="border-white/5 bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 card-gradient-amber" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">USD</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatUsd(user.balance_usd)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">available</p>
            <Button
              size="sm"
              className="mt-2 w-full h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setActiveTab('wallet')}
            >
              Withdraw
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{user.energy}</p>
            <p className="text-[10px] text-zinc-500">Energy</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <div className={`flex items-center justify-center gap-1 mb-1`}>
              <Flame className={`w-4 h-4 ${tierColors.text} ${user.streak > 0 ? 'streak-pulse' : ''}`} />
            </div>
            <p className="text-lg font-bold text-white">{user.streak}</p>
            <p className="text-[10px] text-zinc-500">Streak</p>
            <Badge className={`mt-1 text-[9px] h-4 px-1 ${tierColors.bg} ${tierColors.text} border ${tierColors.border}`}>
              {orbTier}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-3 text-center">
            <Star className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{user.trust_score}</p>
            <p className="text-[10px] text-zinc-500">Trust Score</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Energy Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-zinc-400">Energy</span>
              </div>
              <span className="text-xs text-zinc-500">{user.energy}/{user.max_energy}</span>
            </div>
            <Progress value={energyPercent} className={`h-2.5 bg-zinc-800 [&>div]:${
              energyPercent > 50 ? 'bg-emerald-500' : energyPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
            } [&>div]:rounded-full`} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const colors = colorMap[action.color]
            return (
              <Button
                key={action.tab}
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-4 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl"
                onClick={() => setActiveTab(action.tab)}
              >
                <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                  <action.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <span className="text-xs font-medium text-zinc-300">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Recent Activity</h2>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-0">
            {loadingSubmissions ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4 bg-zinc-800" />
                      <Skeleton className="h-2 w-1/2 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No activity yet</p>
                <p className="text-xs text-zinc-600 mt-1">Complete tasks to see your history</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        {sub.status === 'pending' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        ) : sub.status === 'approved' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white">Task #{sub.task_id}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        sub.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : sub.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
