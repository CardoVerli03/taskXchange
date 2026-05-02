import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const search = searchParams.get('search')

    if (!telegramId || !isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    let sql = 'SELECT * FROM users WHERE 1=1'
    const args: (string | number)[] = []

    if (search) {
      sql += ' AND (username LIKE ? OR telegram_id LIKE ?)'
      args.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY created_at DESC'

    const result = await turso.execute({ sql, args })

    return NextResponse.json({
      success: true,
      data: { users: result.rows },
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, target_telegram_id, is_banned, balance_usd, points, trust_score } = body

    if (!telegramId || !target_telegram_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Only admin can update users
    if (!isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Check target user exists
    const targetResult = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(target_telegram_id)],
    })

    if (targetResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 })
    }

    // Build dynamic update
    const updates: string[] = []
    const args: (string | number | null)[] = []

    if (is_banned !== undefined) { updates.push('is_banned = ?'); args.push(is_banned ? 1 : 0) }
    if (balance_usd !== undefined) { updates.push('balance_usd = ?'); args.push(balance_usd) }
    if (points !== undefined) { updates.push('points = ?'); args.push(points) }
    if (trust_score !== undefined) { updates.push('trust_score = ?'); args.push(Math.min(Math.max(trust_score, 0), 100)) }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = ?')
    args.push(new Date().toISOString())
    args.push(String(target_telegram_id))

    await turso.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE telegram_id = ?`,
      args,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }
}
