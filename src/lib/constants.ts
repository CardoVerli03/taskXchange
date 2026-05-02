export const ADMIN_TELEGRAM_ID = '8262090447'

export const POINTS_TO_USD = 0.00001 // 1000 points = $0.01
export const MIN_WITHDRAWAL_USD = 0.50
export const TAP_REWARD_POINTS = 1
export const MAX_ENERGY = 10
export const ENERGY_REFILL_MINUTES = 144 // 2.4 hours per energy
export const S4S_MAX_ACTIVE_PER_USER = 3
export const S4S_MAX_CLAIMS_PER_USER = 3

export const STREAK_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.2,
  4: 1.3,
  5: 1.4,
  6: 1.45,
  7: 1.5,
  14: 2.0,
  30: 3.0,
}

export function getStreakMultiplier(streak: number): number {
  const milestones = Object.keys(STREAK_MULTIPLIERS).map(Number).sort((a, b) => b - a)
  for (const milestone of milestones) {
    if (streak >= milestone) return STREAK_MULTIPLIERS[milestone]
  }
  return 1.0
}

export const COUNTRIES = [
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'GLOBAL', name: 'All Countries', flag: '🌍' },
]

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatPoints(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`
  return points.toString()
}

export function pointsToUsd(points: number): number {
  return points * POINTS_TO_USD
}
