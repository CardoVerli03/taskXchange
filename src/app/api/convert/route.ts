import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { POINTS_TO_USD, MIN_CONVERSION_POINTS } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, points } = body

    if (!telegramId || points === undefined || points === null) {
      return NextResponse.json({ success: false, error: 'Missing required fields: telegramId, points' }, { status: 400 })
    }

    const pointsToConvert = Number(points)

    if (isNaN(pointsToConvert) || pointsToConvert < MIN_CONVERSION_POINTS) {
      return NextResponse.json(
        { success: false, error: `Minimum conversion is ${MIN_CONVERSION_POINTS.toLocaleString()} points` },
        { status: 400 }
      )
    }

    // Get user
    const userResult = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(telegramId)],
    })

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    if (user.is_banned) {
      return NextResponse.json({ success: false, error: 'Your account is banned' }, { status: 403 })
    }

    // Check if user has enough points
    if ((user.points as number) < pointsToConvert) {
      return NextResponse.json({ success: false, error: 'Insufficient points' }, { status: 400 })
    }

    // Calculate USD
    const usdReceived = Math.round(pointsToConvert * POINTS_TO_USD * 100) / 100

    if (usdReceived <= 0) {
      return NextResponse.json({ success: false, error: 'Conversion amount too small' }, { status: 400 })
    }

    // Deduct points from user, add usd to balance_usd
    const newPoints = (user.points as number) - pointsToConvert
    const newBalance = Math.round(((user.balance_usd as number) + usdReceived) * 100) / 100
    const now = new Date().toISOString()

    await turso.execute({
      sql: 'UPDATE users SET points = ?, balance_usd = ?, updated_at = ? WHERE telegram_id = ?',
      args: [newPoints, newBalance, now, String(telegramId)],
    })

    // Insert into point_conversions table
    await turso.execute({
      sql: 'INSERT INTO point_conversions (user_id, points, usd_received, created_at) VALUES (?, ?, ?, ?)',
      args: [String(telegramId), pointsToConvert, usdReceived, now],
    })

    return NextResponse.json({
      success: true,
      data: {
        pointsConverted: pointsToConvert,
        usdReceived,
        newBalance,
        newPoints,
      },
    })
  } catch (error) {
    console.error('Convert points error:', error)
    return NextResponse.json({ success: false, error: 'Failed to convert points' }, { status: 500 })
  }
}
