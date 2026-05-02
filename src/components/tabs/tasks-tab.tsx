'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, pointsToUsd, formatUsd, COUNTRIES } from '@/lib/constants'
import type { Task, Submission } from '@/lib/types'
import { motion } from 'framer-motion'
import {
  Briefcase,
  ExternalLink,
  Send,
  Globe,
  Filter,
  Loader2,
  Inbox,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function TasksTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [countryFilter, setCountryFilter] = useState('all')
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [usernameUsed, setUsernameUsed] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: 'paid', status: 'active' })
      if (countryFilter && countryFilter !== 'all') {
        params.set('country', countryFilter)
      }
      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      if (data.success) {
        setTasks(data.data?.tasks || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [countryFilter, toast])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleSubmitProof = async () => {
    if (!user || !selectedTask) return
    if (!proofUrl.trim()) {
      toast({ title: 'Error', description: 'Proof URL is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          task_id: selectedTask.id,
          proof_url: proofUrl.trim(),
          username_used: usernameUsed.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Submitted!', description: 'Your proof has been submitted for review' })
        setSubmitDialogOpen(false)
        setProofUrl('')
        setUsernameUsed('')
        setSelectedTask(null)
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to submit', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openTaskLink = (link: string) => {
    window.open(link, '_blank', 'noopener')
  }

  const getCountryInfo = (code: string | null) => {
    if (!code) return null
    return COUNTRIES.find((c) => c.code === code)
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Earn Rewards</h1>
          <p className="text-sm text-zinc-500">Complete tasks to earn crypto</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900 border-white/10">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all">All Countries</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/5 bg-zinc-900">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 bg-zinc-800" />
                    <Skeleton className="h-8 w-24 bg-zinc-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-white/5 bg-zinc-900">
          <CardContent className="p-8 text-center">
            <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">No Tasks Available</h3>
            <p className="text-sm text-zinc-500">Check back later for new earning opportunities</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            const country = getCountryInfo(task.country)
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className="border-white/5 bg-zinc-900 hover:border-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white leading-tight flex-1 mr-2">
                        {task.title}
                      </h3>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                        +{formatPoints(task.reward_points)} pts
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      {country && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{country.flag}</span>
                          <span className="text-xs text-zinc-400">{country.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-400 font-medium">
                          {formatUsd(pointsToUsd(task.reward_points))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        onClick={() => openTaskLink(task.link)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" />
                        Start Task
                      </Button>
                      <Dialog
                        open={submitDialogOpen && selectedTask?.id === task.id}
                        onOpenChange={(open) => {
                          setSubmitDialogOpen(open)
                          if (open) setSelectedTask(task)
                          else {
                            setSelectedTask(null)
                            setProofUrl('')
                            setUsernameUsed('')
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs"
                          >
                            <Send className="w-3 h-3 mr-1.5" />
                            Submit Proof
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-white/10 text-white">
                          <DialogHeader>
                            <DialogTitle className="text-white">Submit Proof</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                              <p className="text-xs text-zinc-400">Task</p>
                              <p className="text-sm text-white font-medium">{task.title}</p>
                              <p className="text-xs text-emerald-400 mt-0.5">+{formatPoints(task.reward_points)} pts</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="proof-url" className="text-zinc-300 text-xs">
                                Proof URL (Google Drive, ImgBB, etc.)
                              </Label>
                              <Input
                                id="proof-url"
                                placeholder="https://drive.google.com/..."
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="username-used" className="text-zinc-300 text-xs">
                                Username used (optional)
                              </Label>
                              <Input
                                id="username-used"
                                placeholder="your_username"
                                value={usernameUsed}
                                onChange={(e) => setUsernameUsed(e.target.value)}
                                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
                              />
                            </div>
                            <Button
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleSubmitProof}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                              )}
                              Submit Proof
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
