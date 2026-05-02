// Database types
export interface User {
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  points: number
  balance_usd: number
  wallet_address: string | null
  crypto_type: string
  energy: number
  max_energy: number
  streak: number
  last_tap_at: string | null
  last_streak_date: string | null
  total_taps: number
  is_banned: number
  trust_score: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  type: 'paid' | 's4s'
  title: string
  description: string | null
  link: string
  reward_points: number
  reward_usd: number | null
  country: string | null
  payout_admin: number | null
  posted_by: string | null
  status: 'active' | 'paused' | 'completed'
  max_completions: number | null
  completions_count: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: number
  task_id: number
  user_id: string
  proof_url: string | null
  username_used: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  review_note: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Withdrawal {
  id: number
  user_id: string
  amount_usd: number
  amount_crypto: number | null
  wallet_address: string
  crypto_type: string
  status: 'pending' | 'paid' | 'rejected'
  tx_hash: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
}

// API types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface InitUserResponse {
  user: User
  isAdmin: boolean
}

export interface AdminStats {
  totalUsers: number
  activeToday: number
  totalEarned: number
  totalPaidOut: number
  pendingWithdrawals: number
  pendingSubmissions: number
  totalTasks: number
  activeTasks: number
}

// Frontend types
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

export type TabType = 'home' | 'tasks' | 's4s' | 'tap' | 'wallet'

export interface TapState {
  canTap: boolean
  energy: number
  maxEnergy: number
  lastTapAt: string | null
  streak: number
  totalTaps: number
  nextRefillIn: number | null // seconds
  streakMultiplier: number
}
