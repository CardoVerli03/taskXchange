'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { formatPoints, S4S_MAX_ACTIVE_PER_USER } from '@/lib/constants'
import type { Task } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftRight,
  ExternalLink,
  Send,
  Plus,
  X,
  Loader2,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  User,
  Coins,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function S4sTab() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [usernameUsed, setUsernameUsed] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Post form state
  const [postTitle, setPostTitle] = useState('')
  const [postLink, setPostLink] = useState('')
  const [postReward, setPostReward] = useState('50')
  const [postDescription, setPostDescription] = useState('')
  const [posting, setPosting] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tasks?type=s4s&status=active')
      const data = await res.json()
      if (data.success) {
        setTasks(data.data?.tasks || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handlePostTask = async () => {
    if (!user) return
    if (!postTitle.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' })
      return
    }
    if (!postLink.trim()) {
      toast({ title: 'Error', description: 'Link is required', variant: 'destructive' })
      return
    }
    const reward = parseInt(postReward)
    if (!reward || reward <= 0) {
      toast({ title: 'Error', description: 'Reward must be greater than 0', variant: 'destructive' })
      return
    }

    setPosting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          type: 's4s',
          title: postTitle.trim(),
          link: postLink.trim(),
          reward_points: reward,
          description: postDescription.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Posted!', description: 'Your S4S link is now live' })
        setShowPostForm(false)
        setPostTitle('')
        setPostLink('')
        setPostReward('50')
        setPostDescription('')
        fetchTasks()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to post', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setPosting(false)
    }
  }

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

  const myActiveTasks = tasks.filter((t) => t.posted_by === user?.telegram_id)

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">S4S - Sign for Sign</h1>
          <p className="text-sm text-zinc-500">Grow together with other users</p>
        </div>
        <Button
          size="sm"
          className={`h-8 text-xs ${
            showPostForm
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          onClick={() => setShowPostForm(!showPostForm)}
        >
          {showPostForm ? (
            <>
              <X className="w-3 h-3 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" /> Post Link
            </>
          )}
        </Button>
      </div>

      {/* Post Form */}
      <AnimatePresence>
        {showPostForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-emerald-500/20 bg-zinc-900 overflow-hidden">
              <div className="absolute inset-0 card-gradient-emerald opacity-50" />
              <CardContent className="relative p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Post Your Link</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="s4s-title" className="text-xs text-zinc-400">
                    Title *
                  </Label>
                  <Input
                    id="s4s-title"
                    placeholder="e.g., Follow me on Twitter"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s4s-link" className="text-xs text-zinc-400">
                    Link *
                  </Label>
                  <Input
                    id="s4s-link"
                    placeholder="https://t.me/..."
                    value={postLink}
                    onChange={(e) => setPostLink(e.target.value)}
                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s4s-reward" className="text-xs text-zinc-400">
                    Reward (points)
                  </Label>
                  <Input
                    id="s4s-reward"
                    type="number"
                    min="1"
                    value={postReward}
                    onChange={(e) => setPostReward(e.target.value)}
                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s4s-desc" className="text-xs text-zinc-400">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="s4s-desc"
                    placeholder="Instructions for others..."
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 text-sm min-h-[60px]"
                  />
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/80">
                    Make sure to approve submissions to keep your trust score. You have {myActiveTasks.length}/{S4S_MAX_ACTIVE_PER_USER} active posts.
                  </p>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handlePostTask}
                  disabled={posting}
                >
                  {posting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                  )}
                  Post S4S Link
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Browse S4S Tasks</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-white/5 bg-zinc-900">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 bg-zinc-800" />
                    <Skeleton className="h-8 w-24 bg-zinc-800" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-white/5 bg-zinc-900">
            <CardContent className="p-8 text-center">
              <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">No S4S Tasks</h3>
              <p className="text-sm text-zinc-500">Be the first to post your link!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
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
                        <Coins className="w-3 h-3 mr-1" />
                        +{formatPoints(task.reward_points)}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs text-zinc-400">
                        Posted by {task.posted_by || 'Anonymous'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        onClick={() => window.open(task.link, '_blank', 'noopener')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" />
                        Claim & Sign Up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs"
                        onClick={() => {
                          setSelectedTask(task)
                          setSubmitDialogOpen(true)
                        }}
                      >
                        <Send className="w-3 h-3 mr-1.5" />
                        Submit Proof
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Proof Dialog */}
      <Dialog
        open={submitDialogOpen}
        onOpenChange={(open) => {
          setSubmitDialogOpen(open)
          if (!open) {
            setSelectedTask(null)
            setProofUrl('')
            setUsernameUsed('')
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Submit Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedTask && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                <p className="text-xs text-zinc-400">Task</p>
                <p className="text-sm text-white font-medium">{selectedTask.title}</p>
                <p className="text-xs text-emerald-400 mt-0.5">+{formatPoints(selectedTask.reward_points)} pts</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="s4s-proof-url" className="text-zinc-300 text-xs">
                Proof URL (Google Drive, ImgBB, etc.)
              </Label>
              <Input
                id="s4s-proof-url"
                placeholder="https://drive.google.com/..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s4s-username-used" className="text-zinc-300 text-xs">
                Username used (optional)
              </Label>
              <Input
                id="s4s-username-used"
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
  )
}
