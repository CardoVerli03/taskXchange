export const ADMIN_TELEGRAM_ID = '8262090447'

// Economics: 100,000 points = $1.00 USD
export const POINTS_TO_USD = 0.00001 // 1 point = $0.00001
export const MIN_WITHDRAWAL_USD = 1.00
export const MIN_CONVERSION_POINTS = 10000 // minimum 10,000 points to convert (= $0.10)

export const TAP_REWARD_POINTS = 1
export const MAX_ENERGY = 10
export const ENERGY_REFILL_MINUTES = 144 // 2.4 hours per energy refill
export const S4S_MAX_ACTIVE_PER_USER = 3
export const S4S_MAX_CLAIMS_PER_USER = 3
export const MYSTERY_BOX_INTERVAL = 50 // every 50th tap
export const DAILY_BONUS_BASE = 100 // base daily bonus points

// Streak multipliers for TAP rewards only
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

// Orb tier based on streak
export function getOrbTier(streak: number): 'green' | 'gold' | 'purple' | 'diamond' {
  if (streak >= 30) return 'diamond'
  if (streak >= 14) return 'purple'
  if (streak >= 7) return 'gold'
  return 'green'
}

// Mystery box rewards
export const MYSTERY_BOX_TIERS = {
  common:    { chance: 0.60, min: 5,    max: 20   },   // 60% chance
  uncommon:  { chance: 0.30, min: 50,   max: 100  },   // 30% chance
  rare:      { chance: 0.08, min: 200,  max: 500  },   // 8% chance
  legendary: { chance: 0.02, min: 1000, max: 2000 },   // 2% chance
}

export function rollMysteryBox(): { tier: keyof typeof MYSTERY_BOX_TIERS; reward: number } {
  const roll = Math.random()
  let cumulative = 0

  for (const [tier, config] of Object.entries(MYSTERY_BOX_TIERS)) {
    cumulative += config.chance
    if (roll <= cumulative) {
      const reward = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min
      return { tier: tier as keyof typeof MYSTERY_BOX_TIERS, reward }
    }
  }

  return { tier: 'common', reward: 5 }
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
  return points.toLocaleString()
}

export function pointsToUsd(points: number): number {
  return points * POINTS_TO_USD
}

export function usdToPoints(usd: number): number {
  return Math.ceil(usd / POINTS_TO_USD)
}
