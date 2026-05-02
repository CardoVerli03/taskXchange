import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'
import { S4S_MAX_ACTIVE_PER_USER } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const statusParam = searchParams.get('status')
    const telegramId = searchParams.get('telegramId')
    const country = searchParams.get('country')

    // Admin can see all statuses. Regular users see only active tasks.
    const isUserAdmin = telegramId ? isAdmin(String(telegramId)) : false
    const status = statusParam && statusParam !== 'all' ? statusParam : (isUserAdmin ? null : 'active')

    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const args: (string | number)[] = []

    if (type) {
      sql += ' AND type = ?'
      args.push(type)
    }

    if (status) {
      sql += ' AND status = ?'
      args.push(status)
    }

    if (country) {
      sql += ' AND (country = ? OR country IS NULL OR country = ?)'
      args.push(country, 'GLOBAL')
    }

    sql += ' ORDER BY created_at DESC'

    const result = await turso.execute({ sql, args })

    // For s4s tasks, also get the poster's username
    const tasks = await Promise.all(
      result.rows.map(async (task) => {
        if (task.type === 's4s' && task.posted_by) {
          const poster = await turso.execute({
            sql: 'SELECT username FROM users WHERE telegram_id = ?',
            args: [task.posted_by as string],
          })
          return { ...task, poster_username: poster.rows[0]?.username || null }
        }
        return task
      })
    )

    return NextResponse.json({
      success: true,
      data: { tasks },
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, type, title, description, link, reward_usd, reward_points, country, payout_admin, max_completions } = body

    if (!telegramId || !type || !title || !link) {
      return NextResponse.json({ success: false, error: 'Missing required fields: telegramId, type, title, link' }, { status: 400 })
    }

    if (!['paid', 's4s'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid task type. Must be paid or s4s' }, { status: 400 })
    }

    // For 'paid' type: ONLY admin can create, reward_usd is REQUIRED
    if (type === 'paid') {
      if (!isAdmin(String(telegramId))) {
        return NextResponse.json({ success: false, error: 'Only admin can create paid tasks' }, { status: 403 })
      }
      if (reward_usd === undefined || reward_usd === null || reward_usd <= 0) {
        return NextResponse.json({ success: false, error: 'reward_usd is required and must be > 0 for paid tasks' }, { status: 400 })
      }
    }

    // For 's4s' type: any user can create, reward_points is REQUIRED, reward_usd should be 0
    if (type === 's4s') {
      if (reward_points === undefined || reward_points === null || reward_points <= 0) {
        return NextResponse.json({ success: false, error: 'reward_points is required and must be > 0 for s4s tasks' }, { status: 400 })
      }

      // Check app_settings for s4s_max_active_per_user
      const settingResult = await turso.execute({
        sql: "SELECT value FROM app_settings WHERE key = 's4s_max_active_per_user'",
        args: [],
      })
      const maxActive = settingResult.rows.length > 0
        ? parseInt(settingResult.rows[0].value as string)
        : S4S_MAX_ACTIVE_PER_USER

      const activeCount = await turso.execute({
        sql: "SELECT COUNT(*) as count FROM tasks WHERE posted_by = ? AND type = 's4s' AND status = 'active'",
        args: [String(telegramId)],
      })

      if ((activeCount.rows[0].count as number) >= maxActive) {
        return NextResponse.json(
          { success: false, error: `You can only have ${maxActive} active s4s tasks at a time` },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()
    const finalRewardUsd = type === 'paid' ? reward_usd : 0
    const finalRewardPoints = type === 's4s' ? reward_points : (reward_points || 0)
    const finalPayoutAdmin = type === 'paid' ? (payout_admin || 0) : null

    const result = await turso.execute({
      sql: `INSERT INTO tasks (type, title, description, link, reward_points, reward_usd, country, payout_admin, posted_by, status, max_completions, completions_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?)`,
      args: [
        type,
        title,
        description || null,
        link,
        finalRewardPoints,
        finalRewardUsd,
        country || null,
        finalPayoutAdmin,
        String(telegramId),
        max_completions || null,
        now,
        now,
      ],
    })

    const newTask = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [result.lastInsertRowid],
    })

    return NextResponse.json({
      success: true,
      data: { task: newTask.rows[0] },
    })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 })
  }
}
