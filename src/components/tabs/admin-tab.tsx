'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, formatUsd, COUNTRIES } from '@/lib/constants'
import type { Task, Submission, Withdrawal, User as UserType, AdminStats, AppSetting } from '@/lib/types'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Briefcase,
  FileCheck,
  Wallet,
  Users,
  Settings,
  Loader2,
  Check,
  X,
  Pause,
  Play,
  Trash2,
  Plus,
  Search,
  Ban,
  ShieldCheck,
  Eye,
  ExternalLink,
  Clock,
  DollarSign,
  TrendingUp,
  Coins,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

type AdminSubTab = 'dashboard' | 'tasks' | 'submissions' | 'withdrawals' | 'users' | 'settings'

export default function AdminTab() {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('dashboard')

  return (
    <div className="p-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as AdminSubTab)}>
        <TabsList className="w-full bg-zinc-900 border border-white/5 h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <BarChart3 className="w-3 h-3 mr-1" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <Briefcase className="w-3 h-3 mr-1" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <FileCheck className="w-3 h-3 mr-1" />
            Proofs
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <Wallet className="w-3 h-3 mr-1" />
            Payouts
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <Users className="w-3 h-3 mr-1" />
            Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex-1 min-w-0">
            <Settings className="w-3 h-3 mr-1" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="tasks">
          <AdminTasksTab />
        </TabsContent>
        <TabsContent value="submissions">
          <AdminSubmissionsTab />
        </TabsContent>
        <TabsContent value="withdrawals">
          <AdminWithdrawalsTab />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>
        <TabsContent value="settings">
          <AdminSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* =========== Dashboard =========== */
function DashboardTab() {
  const { user } = useAppStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/admin/stats?telegramId=${user.telegram_id}`)
        const data = await res.json()
        if (data.success) setStats(data.data)
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-white/5 bg-zinc-900">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 bg-zinc-800 mb-2" />
              <Skeleton className="h-6 w-12 bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'emerald' },
    { label: 'Active Today', value: stats.activeToday, icon: ShieldCheck, color: 'amber' },
    { label: 'Total Earned', value: formatUsd(stats.totalEarned), icon: BarChart3, color: 'emerald' },
    { label: 'Total Paid', value: formatUsd(stats.totalPaidOut), icon: Wallet, color: 'violet' },
    { label: 'Pending Payouts', value: stats.pendingWithdrawals, icon: Clock, color: 'amber' },
    { label: 'Pending Proofs', value: stats.pendingSubmissions, icon: FileCheck, color: 'red' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: Briefcase, color: 'emerald' },
    { label: 'Active Tasks', value: stats.activeTasks, icon: Play, color: 'amber' },
  ] : []

  // Calculate admin profit if we have the data
  if (stats && stats.adminProfit !== undefined) {
    statCards.push({
      label: 'Admin Profit',
      value: formatUsd(stats.adminProfit),
      icon: TrendingUp,
      color: 'emerald',
    })
  }

  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {statCards.map((card) => {
        const colors = colorMap[card.color]
        const Icon = card.icon
        return (
          <Card key={card.label} className="border-white/5 bg-zinc-900">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <p className="text-lg font-bold text-white">{card.value}</p>
              <p className="text-xs text-zinc-500">{card.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/* =========== Tasks =========== */
function AdminTasksTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  // Add/Edit form
  const [formTitle, setFormTitle] = useState('')
  const [formLink, setFormLink] = useState('')
  const [formType, setFormType] = useState<'paid' | 's4s'>('paid')
  const [formRewardUsd, setFormRewardUsd] = useState('0.25')
  const [formRewardPoints, setFormRewardPoints] = useState('0')
  const [formPayoutAdmin, setFormPayoutAdmin] = useState('')
  const [formCountry, setFormCountry] = useState('GLOBAL')
  const [formDesc, setFormDesc] = useState('')
  const [formMaxCompletions, setFormMaxCompletions] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tasks?status=active&limit=50')
      const data = await res.json()
      if (data.success) setTasks(data.data?.tasks || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const resetForm = () => {
    setFormTitle('')
    setFormLink('')
    setFormType('paid')
    setFormRewardUsd('0.25')
    setFormRewardPoints('0')
    setFormPayoutAdmin('')
    setFormCountry('GLOBAL')
    setFormDesc('')
    setFormMaxCompletions('')
    setEditTask(null)
    setShowAddForm(false)
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setFormTitle(task.title)
    setFormLink(task.link)
    setFormType(task.type)
    setFormRewardUsd(String(task.reward_usd || 0))
    setFormRewardPoints(String(task.reward_points || 0))
    setFormPayoutAdmin(String(task.payout_admin || ''))
    setFormCountry(task.country || 'GLOBAL')
    setFormDesc(task.description || '')
    setFormMaxCompletions(task.max_completions ? String(task.max_completions) : '')
    setShowAddForm(true)
  }

  const calculatedProfit = (() => {
    const rewardUsd = parseFloat(formRewardUsd) || 0
    const payout = parseFloat(formPayoutAdmin) || 0
    return payout - rewardUsd
  })()

  const handleSaveTask = async () => {
    if (!user) return
    if (!formTitle.trim() || !formLink.trim()) {
      toast({ title: 'Error', description: 'Title and link are required', variant: 'destructive' })
      return
    }
    const rewardPoints = parseInt(formRewardPoints) || 0
    const rewardUsd = parseFloat(formRewardUsd) || 0
    const payoutAdmin = parseFloat(formPayoutAdmin) || null

    if (formType === 'paid' && rewardUsd <= 0) {
      toast({ title: 'Error', description: 'Paid tasks must have a USD reward > 0', variant: 'destructive' })
      return
    }

    setFormSaving(true)
    try {
      const url = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks'
      const method = editTask ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        telegramId: user.telegram_id,
        type: formType,
        title: formTitle.trim(),
        link: formLink.trim(),
        reward_points: rewardPoints,
        reward_usd: rewardUsd,
        payout_admin: payoutAdmin,
        country: formCountry === 'GLOBAL' ? null : formCountry,
        description: formDesc.trim() || null,
        max_completions: formMaxCompletions ? parseInt(formMaxCompletions) : null,
      }
      if (!editTask) {
        body.status = 'active'
      } else {
        body.status = editTask.status
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: editTask ? 'Updated' : 'Created', description: 'Task saved' })
        resetForm()
        fetchTasks()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setFormSaving(false)
    }
  }

  const handleTogglePause = async (task: Task) => {
    if (!user) return
    const newStatus = task.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegram_id, status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Updated', description: `Task ${newStatus}` })
        fetchTasks()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!user) return
    if (!confirm('Delete this task?')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegram_id }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Deleted', description: 'Task removed' })
        fetchTasks()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Manage Tasks</h3>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
          onClick={() => {
            resetForm()
            setShowAddForm(true)
          }}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Task
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-emerald-500/20 bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white">{editTask ? 'Edit Task' : 'New Task'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as 'paid' | 's4s')}>
                  <SelectTrigger className="bg-zinc-800 border-white/10 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="s4s">S4S</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Country</Label>
                <Select value={formCountry} onValueChange={setFormCountry}>
                  <SelectTrigger className="bg-zinc-800 border-white/10 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Title *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-zinc-800 border-white/10 text-white h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Link *</Label>
              <Input value={formLink} onChange={(e) => setFormLink(e.target.value)} className="bg-zinc-800 border-white/10 text-white h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="bg-zinc-800 border-white/10 text-white text-xs min-h-[50px]" />
            </div>

            {/* USD Reward - BIG prominent field */}
            {formType === 'paid' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Reward USD (what user earns) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRewardUsd}
                      onChange={(e) => setFormRewardUsd(e.target.value)}
                      className="bg-zinc-800 border-amber-500/20 text-amber-400 font-bold text-lg h-12 pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Your Payout (CPA pays you)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formPayoutAdmin}
                      onChange={(e) => setFormPayoutAdmin(e.target.value)}
                      className="bg-zinc-800 border-white/10 text-white h-9 pl-7 text-sm"
                    />
                  </div>
                </div>
                {parseFloat(formPayoutAdmin) > 0 && (
                  <div className={`p-2.5 rounded-lg border ${
                    calculatedProfit >= 0
                      ? 'bg-emerald-500/5 border-emerald-500/10'
                      : 'bg-red-500/5 border-red-500/10'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className={`w-3.5 h-3.5 ${calculatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                      <span className={`text-sm font-bold ${calculatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Your Profit: {formatUsd(calculatedProfit)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Payout ({formatUsd(parseFloat(formPayoutAdmin) || 0)}) - Reward ({formatUsd(parseFloat(formRewardUsd) || 0)})
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Reward Points */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Bonus Points (optional, on top of USD)
              </Label>
              <Input
                type="number"
                min="0"
                value={formRewardPoints}
                onChange={(e) => setFormRewardPoints(e.target.value)}
                className="bg-zinc-800 border-white/10 text-white h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Max Completions</Label>
              <Input
                type="number"
                min="0"
                value={formMaxCompletions}
                onChange={(e) => setFormMaxCompletions(e.target.value)}
                className="bg-zinc-800 border-white/10 text-white h-8 text-xs"
                placeholder="Unlimited"
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs" onClick={handleSaveTask} disabled={formSaving}>
                {formSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                Save
              </Button>
              <Button variant="ghost" className="h-8 text-xs text-zinc-400" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No tasks yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tasks.map((task) => (
            <Card key={task.id} className="border-white/5 bg-zinc-900">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{task.title}</span>
                      <Badge variant="secondary" className={`text-[10px] ${task.type === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'}`}>
                        {task.type}
                      </Badge>
                      <Badge variant="secondary" className={`text-[10px] ${task.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.reward_usd > 0 && (
                        <span className="text-xs font-bold text-amber-400">{formatUsd(task.reward_usd)} USD</span>
                      )}
                      {task.reward_points > 0 && (
                        <span className="text-xs text-emerald-400">+{formatPoints(task.reward_points)} pts</span>
                      )}
                      <span className="text-xs text-zinc-500">{task.completions_count} completions</span>
                    </div>
                    {task.payout_admin && task.payout_admin > 0 && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Payout: {formatUsd(task.payout_admin)} | Profit: {formatUsd(task.payout_admin - (task.reward_usd || 0))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => openEdit(task)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-amber-400" onClick={() => handleTogglePause(task)}>
                      {task.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========== Submissions =========== */
function AdminSubmissionsTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  const fetchSubmissions = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch(`/api/submissions?status=${filter}`)
      const data = await res.json()
      if (data.success) setSubmissions(data.data?.submissions || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load submissions', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filter, toast, user])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleReview = async (subId: number, status: 'approved' | 'rejected', note?: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/submissions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegram_id, status, review_note: note || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Reviewed', description: `Submission ${status}` })
        fetchSubmissions()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'ghost'}
            className={`h-7 text-xs ${filter === s ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No {filter} submissions</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {submissions.map((sub) => (
            <Card key={sub.id} className="border-white/5 bg-zinc-900">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Task #{sub.task_id}</p>
                    <p className="text-xs text-zinc-500">User: {sub.user_id} &middot; {new Date(sub.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${
                    sub.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                    sub.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {sub.status}
                  </Badge>
                </div>
                {sub.proof_url && (
                  <a href={sub.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View Proof
                  </a>
                )}
                {sub.username_used && (
                  <p className="text-xs text-zinc-500">Username: {sub.username_used}</p>
                )}
                {sub.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs flex-1" onClick={() => handleReview(sub.id, 'approved')}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-7 text-xs flex-1" onClick={() => handleReview(sub.id, 'rejected')}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========== Withdrawals =========== */
function AdminWithdrawalsTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'paid' | 'rejected'>('pending')
  const [txHashes, setTxHashes] = useState<Record<number, string>>({})

  const fetchWithdrawals = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch(`/api/withdrawals?status=${filter}&telegramId=${user.telegram_id}`)
      const data = await res.json()
      if (data.success) setWithdrawals(data.data?.withdrawals || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load withdrawals', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filter, toast, user])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handleProcess = async (wId: number, status: 'paid' | 'rejected') => {
    if (!user) return
    try {
      const res = await fetch(`/api/withdrawals/${wId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          status,
          tx_hash: status === 'paid' ? txHashes[wId] || null : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Updated', description: `Withdrawal ${status}` })
        fetchWithdrawals()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        {(['pending', 'paid', 'rejected'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'ghost'}
            className={`h-7 text-xs ${filter === s ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : withdrawals.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No {filter} withdrawals</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {withdrawals.map((w) => (
            <Card key={w.id} className="border-white/5 bg-zinc-900">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{formatUsd(w.amount_usd)}</p>
                    <p className="text-xs text-zinc-500">User: {w.user_id} &middot; {w.crypto_type}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{w.wallet_address}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${
                    w.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                    w.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {w.status}
                  </Badge>
                </div>
                {w.status === 'pending' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="TX Hash (for marking paid)"
                      value={txHashes[w.id] || ''}
                      onChange={(e) => setTxHashes({ ...txHashes, [w.id]: e.target.value })}
                      className="bg-zinc-800 border-white/10 text-white h-7 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs flex-1" onClick={() => handleProcess(w.id, 'paid')}>
                        <Check className="w-3 h-3 mr-1" /> Mark Paid
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-7 text-xs flex-1" onClick={() => handleProcess(w.id, 'rejected')}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========== Users =========== */
function AdminUsersTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/admin/users?telegramId=${user.telegram_id}&search=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      if (data.success) setUsers(data.data?.users || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to search users', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    if (!user) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          target_telegram_id: userId,
          is_banned: isBanned ? 0 : 1,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Updated', description: `User ${isBanned ? 'unbanned' : 'banned'}` })
        handleSearch()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="bg-zinc-800 border-white/10 text-white h-8 text-xs"
        />
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={handleSearch}>
          <Search className="w-3 h-3" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : searched && users.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No users found</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((u) => (
            <Card key={u.telegram_id} className="border-white/5 bg-zinc-900">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{u.first_name || u.username || u.telegram_id}</span>
                      {u.is_banned ? (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Banned</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{u.telegram_id}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-emerald-400">{formatPoints(u.points)} pts</span>
                      <span className="text-xs text-amber-400">{formatUsd(u.balance_usd)}</span>
                      <span className="text-xs text-zinc-500">Trust: {u.trust_score}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs ${u.is_banned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                    onClick={() => handleToggleBan(u.telegram_id, !!u.is_banned)}
                  >
                    <Ban className="w-3 h-3 mr-1" />
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========== Settings =========== */
function AdminSettingsTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success) {
          const settingsObj = data.data?.settings || {}
          const items: AppSetting[] = Object.entries(settingsObj).map(([key, value]) => ({
            key,
            value: String(value),
          }))
          setSettings(items)
          setEditValues(settingsObj as Record<string, string>)
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [toast])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegram_id, settings: editValues }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Saved', description: 'Settings updated' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full bg-zinc-800 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">App Settings</h3>
      {settings.map((setting) => (
        <div key={setting.key} className="space-y-1">
          <Label className="text-xs text-zinc-400">{setting.key}</Label>
          <Input
            value={editValues[setting.key] || ''}
            onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
            className="bg-zinc-800 border-white/10 text-white h-8 text-xs"
          />
        </div>
      ))}
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  )
}
