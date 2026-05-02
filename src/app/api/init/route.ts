import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'
import { MAX_ENERGY } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, username, firstName, lastName } = body

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    // Check if user exists
    const existing = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(telegramId)],
    })

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      const userIsAdmin = isAdmin(String(telegramId))

      // Handle streak logic
      const today = new Date().toISOString().split('T')[0]
      const lastStreakDate = user.last_streak_date as string | null
      let streak = user.streak as number

      if (lastStreakDate && lastStreakDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (lastStreakDate === yesterday) {
          streak = streak + 1
        } else {
          streak = 1
        }
        await turso.execute({
          sql: 'UPDATE users SET streak = ?, last_streak_date = ?, updated_at = ? WHERE telegram_id = ?',
          args: [streak, today, new Date().toISOString(), String(telegramId)],
        })
      } else if (!lastStreakDate) {
        streak = 1
        await turso.execute({
          sql: 'UPDATE users SET streak = ?, last_streak_date = ?, updated_at = ? WHERE telegram_id = ?',
          args: [streak, today, new Date().toISOString(), String(telegramId)],
        })
      }

      // Update user profile info if provided
      if (username || firstName || lastName) {
        await turso.execute({
          sql: 'UPDATE users SET username = ?, first_name = ?, last_name = ?, updated_at = ? WHERE telegram_id = ?',
          args: [
            username || user.username,
            firstName || user.first_name,
            lastName || user.last_name,
            new Date().toISOString(),
            String(telegramId),
          ],
        })
      }

      // Re-fetch updated user
      const updated = await turso.execute({
        sql: 'SELECT * FROM users WHERE telegram_id = ?',
        args: [String(telegramId)],
      })

      return NextResponse.json({
        success: true,
        data: {
          user: updated.rows[0],
          isAdmin: userIsAdmin,
        },
      })
    }

    // Create new user with new economics defaults
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    await turso.execute({
      sql: `INSERT INTO users (telegram_id, username, first_name, last_name, points, balance_usd, wallet_address, crypto_type, energy, max_energy, streak, last_tap_at, last_streak_date, last_daily_bonus_date, total_taps, total_mystery_boxes, is_banned, trust_score, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, 0, NULL, 'LTC', ?, ?, 1, NULL, ?, NULL, 0, 0, 0, 50, ?, ?)`,
      args: [String(telegramId), username || null, firstName || null, lastName || null, MAX_ENERGY, MAX_ENERGY, today, now, now],
    })

    const newUser = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(telegramId)],
    })

    return NextResponse.json({
      success: true,
      data: {
        user: newUser.rows[0],
        isAdmin: isAdmin(String(telegramId)),
      },
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ success: false, error: 'Failed to initialize user' }, { status: 500 })
  }
}
