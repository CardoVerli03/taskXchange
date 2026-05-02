'use client'

import { useAppStore } from '@/hooks/use-app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Briefcase,
  ArrowLeftRight,
  Zap,
  Wallet,
  Shield,
  X,
} from 'lucide-react'
import type { TabType } from '@/lib/types'
import HomeTab from '@/components/tabs/home-tab'
import TasksTab from '@/components/tabs/tasks-tab'
import S4sTab from '@/components/tabs/s4s-tab'
import TapTab from '@/components/tabs/tap-tab'
import WalletTab from '@/components/tabs/wallet-tab'
import AdminTab from '@/components/tabs/admin-tab'
import { formatPoints, pointsToUsd, formatUsd } from '@/lib/constants'
import { Button } from '@/components/ui/button'

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: Briefcase },
  { id: 's4s', label: 'Swap', icon: ArrowLeftRight },
  { id: 'tap', label: 'Tap', icon: Zap },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
]

const tabComponents: Record<TabType, React.ComponentType> = {
  home: HomeTab,
  tasks: TasksTab,
  s4s: S4sTab,
  tap: TapTab,
  wallet: WalletTab,
}

export default function AppShell() {
  const { user, activeTab, setActiveTab, isAdmin, showAdmin, setShowAdmin } = useAppStore()

  const ActiveTabComponent = tabComponents[activeTab]

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">TaskX</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-sm font-semibold text-emerald-400">
              {user ? formatPoints(user.points) : '0'}
            </span>
            <span className="text-xs text-zinc-500">pts</span>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => setShowAdmin(!showAdmin)}
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full"
          >
            <ActiveTabComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 flex items-center justify-around px-2 py-2 border-t border-white/5 bg-zinc-950/90 backdrop-blur-xl z-20 safe-area-bottom">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdmin && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Admin Panel</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white"
                onClick={() => setShowAdmin(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-[calc(100vh-52px)] overflow-y-auto">
              <AdminTab />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
