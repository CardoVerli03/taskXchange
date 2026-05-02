import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'
import { S4S_MAX_ACTIVE_PER_USER } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status') || 'active'

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
    const { telegramId, type, title, description, link, reward_points, reward_usd, country, payout_admin, max_completions } = body

    if (!telegramId || !type || !title || !link || reward_points === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (!['paid', 's4s'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid task type' }, { status: 400 })
    }

    // For 'paid' type, only admin can create
    if (type === 'paid' && !isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Only admin can create paid tasks' }, { status: 403 })
    }

    // For 's4s' type, check active task limit per user
    if (type === 's4s') {
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

    const result = await turso.execute({
      sql: `INSERT INTO tasks (type, title, description, link, reward_points, reward_usd, country, payout_admin, posted_by, status, max_completions, completions_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?)`,
      args: [
        type,
        title,
        description || null,
        link,
        reward_points,
        reward_usd || null,
        country || null,
        payout_admin || null,
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
