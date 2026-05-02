'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, pointsToUsd, formatUsd, MIN_WITHDRAWAL_USD, POINTS_TO_USD, ADMIN_TELEGRAM_ID } from '@/lib/constants'
import type { Withdrawal } from '@/lib/types'
import { motion } from 'framer-motion'
import {
  Wallet,
  Shield,
  Copy,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Info,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function WalletTab() {
  const { user, isAdmin, setShowAdmin, setWalletAddress } = useAppStore()
  const { toast } = useToast()
  const [walletAddr, setWalletAddr] = useState('')
  const [cryptoType, setCryptoType] = useState('LTC')
  const [savingWallet, setSavingWallet] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)
  const [secretTapCount, setSecretTapCount] = useState(0)
  const secretTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user) {
      setWalletAddr(user.wallet_address || '')
      setCryptoType(user.crypto_type || 'LTC')
    }
  }, [user])

  const fetchWithdrawals = useCallback(async () => {
    if (!user) return
    try {
      setLoadingWithdrawals(true)
      const res = await fetch(`/api/withdrawals?user_id=${user.telegram_id}`)
      const data = await res.json()
      if (data.success) {
        setWithdrawals(data.data?.withdrawals || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoadingWithdrawals(false)
    }
  }, [user])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handleSaveWallet = async () => {
    if (!user) return
    setSavingWallet(true)
    try {
      const res = await fetch('/api/users/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          wallet_address: walletAddr,
          crypto_type: cryptoType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setWalletAddress(walletAddr)
        toast({ title: 'Saved', description: 'Wallet address updated' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setSavingWallet(false)
    }
  }

  const handleWithdraw = async () => {
    if (!user) return
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < MIN_WITHDRAWAL_USD) {
      toast({ title: 'Error', description: `Minimum withdrawal is ${formatUsd(MIN_WITHDRAWAL_USD)}`, variant: 'destructive' })
      return
    }
    if (amount > user.balance_usd) {
      toast({ title: 'Error', description: 'Insufficient balance', variant: 'destructive' })
      return
    }
    if (!user.wallet_address) {
      toast({ title: 'Error', description: 'Set your wallet address first', variant: 'destructive' })
      return
    }

    setWithdrawing(true)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          amount_usd: amount,
          wallet_address: user.wallet_address,
          crypto_type: cryptoType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Requested!', description: 'Withdrawal request submitted' })
        setWithdrawAmount('')
        fetchWithdrawals()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to request withdrawal', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleSecretTap = () => {
    if (secretTapTimer.current) clearTimeout(secretTapTimer.current)
    const newCount = secretTapCount + 1
    setSecretTapCount(newCount)
    if (newCount >= 5) {
      setSecretTapCount(0)
      if (isAdmin) {
        setShowAdmin(true)
      }
    }
    secretTapTimer.current = setTimeout(() => setSecretTapCount(0), 2000)
  }

  const trustScoreColor = user
    ? user.trust_score > 70
      ? 'text-emerald-400'
      : user.trust_score >= 30
      ? 'text-amber-400'
      : 'text-red-400'
    : 'text-zinc-500'

  const trustScoreBg = user
    ? user.trust_score > 70
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : user.trust_score >= 30
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-red-500/10 border-red-500/20'
    : 'bg-zinc-800 border-zinc-700'

  const pointsNeeded = withdrawAmount ? Math.ceil(parseFloat(withdrawAmount) / POINTS_TO_USD) : 0

  if (!user) return null

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-emerald-500/30">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-lg font-bold">
                  {(user.first_name || user.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  {user.first_name || user.username || 'User'}
                </h2>
                {user.username && (
                  <p className="text-sm text-zinc-500">@{user.username}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${trustScoreBg} ${trustScoreColor} border text-xs`}>
                    <Star className="w-3 h-3 mr-1" />
                    Trust: {user.trust_score}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
              <Calendar className="w-3 h-3" />
              Joined {new Date(user.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="border-white/5 bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 card-gradient-emerald" />
          <CardContent className="relative p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Balance</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">{formatPoints(user.points)}</span>
              <span className="text-sm text-zinc-500">points</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">{formatUsd(user.balance_usd)}</span>
              <span className="text-xs text-zinc-500">available</span>
            </div>
            <Separator className="my-3 bg-white/5" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500">Total Points</p>
                <p className="text-sm font-semibold text-white">{formatPoints(user.points)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">USD Value</p>
                <p className="text-sm font-semibold text-amber-400">{formatUsd(pointsToUsd(user.points))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Wallet Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-white">Wallet Settings</h3>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Crypto Type</Label>
              <Select value={cryptoType} onValueChange={setCryptoType}>
                <SelectTrigger className="bg-zinc-800 border-white/10 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="LTC">LTC - Litecoin</SelectItem>
                  <SelectItem value="SOL">SOL - Solana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Wallet Address ({cryptoType})</Label>
              <Input
                placeholder={`Enter your ${cryptoType} wallet address`}
                value={walletAddr}
                onChange={(e) => setWalletAddr(e.target.value)}
                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-9 text-sm"
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm"
              onClick={handleSaveWallet}
              disabled={savingWallet}
            >
              {savingWallet ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Save Wallet
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Withdraw Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Withdraw</h3>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-800/50 border border-white/5">
              <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
              <div className="text-xs text-zinc-500">
                <p>Minimum: {formatUsd(MIN_WITHDRAWAL_USD)}</p>
                <p>Available: {formatUsd(user.balance_usd)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Amount (USD)</Label>
              <Input
                type="number"
                min={MIN_WITHDRAWAL_USD}
                step="0.01"
                placeholder="0.50"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-9 text-sm"
              />
              {pointsNeeded > 0 && (
                <p className="text-xs text-zinc-500">
                  Requires {formatPoints(pointsNeeded)} points
                </p>
              )}
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-9 text-sm"
              onClick={handleWithdraw}
              disabled={withdrawing || !user.wallet_address}
            >
              {withdrawing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 mr-2" />
              )}
              Request Withdrawal
            </Button>
            {!user.wallet_address && (
              <p className="text-xs text-red-400">Set your wallet address above first</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Transaction History</h3>
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-0">
            {loadingWithdrawals ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                      <Skeleton className="h-2 w-1/3 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="p-6 text-center">
                <Wallet className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No withdrawals yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {formatUsd(w.amount_usd)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {w.crypto_type} &middot; {new Date(w.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        w.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : w.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }
                    >
                      {w.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {w.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {w.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                      {w.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Secret Admin Access */}
      <div className="pt-4 text-center">
        <button
          onClick={handleSecretTap}
          className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          v1.0.0
        </button>
      </div>
    </div>
  )
}
