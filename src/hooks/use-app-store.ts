import { create } from 'zustand'
import type { User, TabType } from '@/lib/types'

interface AppState {
  user: User | null
  isAdmin: boolean
  activeTab: TabType
  showAdmin: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setActiveTab: (tab: TabType) => void
  setShowAdmin: (show: boolean) => void
  setInitialized: (initialized: boolean) => void
  addPoints: (points: number) => void
  addBalance: (amount: number) => void
  deductBalance: (amount: number) => void
  setEnergy: (energy: number) => void
  setStreak: (streak: number) => void
  setWalletAddress: (address: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAdmin: false,
  activeTab: 'home',
  showAdmin: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setShowAdmin: (showAdmin) => set({ showAdmin }),
  setInitialized: (initialized) => set({ initialized }),
  addPoints: (points) =>
    set((state) => ({
      user: state.user ? { ...state.user, points: state.user.points + points } : null,
    })),
  addBalance: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, balance_usd: Math.round((state.user.balance_usd + amount) * 100) / 100 } : null,
    })),
  deductBalance: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, balance_usd: Math.round((state.user.balance_usd - amount) * 100) / 100 } : null,
    })),
  setEnergy: (energy) =>
    set((state) => ({
      user: state.user ? { ...state.user, energy } : null,
    })),
  setStreak: (streak) =>
    set((state) => ({
      user: state.user ? { ...state.user, streak } : null,
    })),
  setWalletAddress: (address) =>
    set((state) => ({
      user: state.user ? { ...state.user, wallet_address: address } : null,
    })),
}))
