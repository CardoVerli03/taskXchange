import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import {
  ENERGY_REFILL_MINUTES,
  MAX_ENERGY,
  TAP_REWARD_POINTS,
  getStreakMultiplier,
  getOrbTier,
  DAILY_BONUS_BASE,
  MYSTERY_BOX_INTERVAL,
  rollMysteryBox,
} from '@/lib/constants'

function recalculateEnergy(user: { energy: number; max_energy: number; last_tap_at: string | null }): number {
  let energy = user.energy
  if (user.last_tap_at) {
    const lastTap = new Date(user.last_tap_at).getTime()
    const minutesElapsed = Math.floor((Date.now() - lastTap) / 60000)
    const energyGained = Math.floor(minutesElapsed / ENERGY_REFILL_MINUTES)
    if (energyGained > 0) {
      energy = Math.min(energy + energyGained, user.max_energy)
    }
  } else {
    energy = user.max_energy
  }
  return energy
}

function calcNextRefillSeconds(user: { energy: number; max_energy: number; last_tap_at: string | null }): number | null {
  if (user.energy >= user.max_energy) return null
  const lastTap = user.last_tap_at ? new Date(user.last_tap_at).getTime() : Date.now()
  const minutesSinceLastTap = (Date.now() - lastTap) / 60000
  const minutesInCurrentRefill = minutesSinceLastTap % ENERGY_REFILL_MINUTES
  const secondsUntilRefill = Math.floor((ENERGY_REFILL_MINUTES - minutesInCurrentRefill) * 60)
  return Math.max(secondsUntilRefill, 0)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [telegramId],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]
    const energy = recalculateEnergy(user as { energy: number; max_energy: number; last_tap_at: string | null })
    const streak = (user.streak as number) || 1
    const streakMultiplier = getStreakMultiplier(streak)
    const nextRefillIn = calcNextRefillSeconds({ energy, max_energy: user.max_energy as number, last_tap_at: user.last_tap_at as string | null })
    const orbTier = getOrbTier(streak)

    return NextResponse.json({
      success: true,
      data: {
        canTap: energy >= 1,
        energy,
        maxEnergy: user.max_energy as number,
        streak,
        totalTaps: user.total_taps as number,
        nextRefillIn,
        streakMultiplier,
        orbTier,
      },
    })
  } catch (error) {
    console.error('Get tap state error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get tap state' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(telegramId)],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]

    // Check if banned
    if (user.is_banned) {
      return NextResponse.json({ success: false, error: 'Your account is banned' }, { status: 403 })
    }

    // Recalculate energy
    const energy = recalculateEnergy(user as { energy: number; max_energy: number; last_tap_at: string | null })

    if (energy < 1) {
      return NextResponse.json({ success: false, error: 'No energy available' }, { status: 400 })
    }

    // Handle streak
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastStreakDate = user.last_streak_date as string | null
    let streak = (user.streak as number) || 1

    if (lastStreakDate === today) {
      // Keep streak as is
    } else if (lastStreakDate === yesterday) {
      streak = streak + 1
    } else {
      streak = 1
    }

    const streakMultiplier = getStreakMultiplier(streak)

    // Calculate reward: TAP_REWARD_POINTS * streakMultiplier (fractional points allowed as float, floor when saving)
    const rawPointsEarned = TAP_REWARD_POINTS * streakMultiplier
    const pointsEarned = Math.floor(rawPointsEarned)

    // Daily bonus logic: If last_daily_bonus_date is not today, award DAILY_BONUS_BASE * streak points
    let dailyBonus: { claimed: boolean; points: number } = { claimed: false, points: 0 }
    const lastDailyBonusDate = user.last_daily_bonus_date as string | null
    let dailyBonusPoints = 0

    if (lastDailyBonusDate !== today) {
      dailyBonusPoints = Math.floor(DAILY_BONUS_BASE * streak)
      dailyBonus = { claimed: true, points: dailyBonusPoints }
    }

    // Calculate new totals
    const newEnergy = energy - 1
    const newPoints = (user.points as number) + pointsEarned + dailyBonusPoints
    const newTotalTaps = (user.total_taps as number) + 1

    // Mystery box logic: After incrementing total_taps, check if (total_taps % MYSTERY_BOX_INTERVAL === 0)
    let mysteryBox: { triggered: boolean; reward: number; tier: string } = { triggered: false, reward: 0, tier: '' }
    let mysteryBoxPoints = 0
    let newMysteryBoxes = user.total_mystery_boxes as number

    if (newTotalTaps % MYSTERY_BOX_INTERVAL === 0) {
      const boxResult = rollMysteryBox()
      mysteryBox = { triggered: true, reward: boxResult.reward, tier: boxResult.tier }
      mysteryBoxPoints = boxResult.reward
      newMysteryBoxes = newMysteryBoxes + 1
    }

    const finalPoints = newPoints + mysteryBoxPoints
    const now = new Date().toISOString()

    await turso.execute({
      sql: `UPDATE users SET energy = ?, points = ?, last_tap_at = ?, streak = ?, last_streak_date = ?,
            last_daily_bonus_date = ?, total_taps = ?, total_mystery_boxes = ?, updated_at = ?
            WHERE telegram_id = ?`,
      args: [
        newEnergy,
        finalPoints,
        now,
        streak,
        today,
        dailyBonus.claimed ? today : (user.last_daily_bonus_date as string | null),
        newTotalTaps,
        newMysteryBoxes,
        now,
        String(telegramId),
      ],
    })

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        energy: newEnergy,
        streak,
        streakMultiplier,
        totalTaps: newTotalTaps,
        dailyBonus,
        mysteryBox,
      },
    })
  } catch (error) {
    console.error('Tap error:', error)
    return NextResponse.json({ success: false, error: 'Failed to execute tap' }, { status: 500 })
  }
}
