import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { ENERGY_REFILL_MINUTES, MAX_ENERGY, TAP_REWARD_POINTS, getStreakMultiplier } from '@/lib/constants'

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

    // Calculate seconds until next energy refill
    let nextRefillIn: number | null = null
    if (energy < (user.max_energy as number)) {
      const lastTap = user.last_tap_at ? new Date(user.last_tap_at as string).getTime() : Date.now()
      const minutesSinceLastTap = (Date.now() - lastTap) / 60000
      const minutesInCurrentRefill = minutesSinceLastTap % ENERGY_REFILL_MINUTES
      const secondsUntilRefill = Math.floor((ENERGY_REFILL_MINUTES - minutesInCurrentRefill) * 60)
      nextRefillIn = Math.max(secondsUntilRefill, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        canTap: energy >= 1,
        energy,
        maxEnergy: user.max_energy as number,
        lastTapAt: user.last_tap_at as string | null,
        streak,
        totalTaps: user.total_taps as number,
        nextRefillIn,
        streakMultiplier,
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
    const pointsEarned = Math.floor(TAP_REWARD_POINTS * streakMultiplier)
    const newEnergy = energy - 1
    const newPoints = (user.points as number) + pointsEarned
    const newTotalTaps = (user.total_taps as number) + 1
    const now = new Date().toISOString()

    await turso.execute({
      sql: 'UPDATE users SET energy = ?, points = ?, last_tap_at = ?, streak = ?, last_streak_date = ?, total_taps = ?, updated_at = ? WHERE telegram_id = ?',
      args: [newEnergy, newPoints, now, streak, today, newTotalTaps, now, String(telegramId)],
    })

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        energy: newEnergy,
        streak,
        streakMultiplier,
        totalTaps: newTotalTaps,
      },
    })
  } catch (error) {
    console.error('Tap error:', error)
    return NextResponse.json({ success: false, error: 'Failed to execute tap' }, { status: 500 })
  }
}
