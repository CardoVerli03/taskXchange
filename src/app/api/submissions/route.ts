import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { S4S_MAX_CLAIMS_PER_USER } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const task_id = searchParams.get('task_id')
    const user_id = searchParams.get('user_id')
    const status = searchParams.get('status')

    let sql = 'SELECT * FROM submissions WHERE 1=1'
    const args: (string | number)[] = []

    if (task_id) {
      sql += ' AND task_id = ?'
      args.push(Number(task_id))
    }

    if (user_id) {
      sql += ' AND user_id = ?'
      args.push(user_id)
    }

    if (status) {
      sql += ' AND status = ?'
      args.push(status)
    }

    sql += ' ORDER BY created_at DESC'

    const result = await turso.execute({ sql, args })

    return NextResponse.json({
      success: true,
      data: { submissions: result.rows },
    })
  } catch (error) {
    console.error('Get submissions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch submissions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, task_id, proof_url, username_used } = body

    if (!telegramId || !task_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user exists and is not banned
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

    // Check if user already submitted for this task
    const existingSubmission = await turso.execute({
      sql: 'SELECT id FROM submissions WHERE task_id = ? AND user_id = ?',
      args: [Number(task_id), String(telegramId)],
    })

    if (existingSubmission.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'You have already submitted for this task' }, { status: 400 })
    }

    // Get task to check type and s4s claims limit
    const taskResult = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [Number(task_id)],
    })

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const task = taskResult.rows[0]

    if (task.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Task is not active' }, { status: 400 })
    }

    // For s4s tasks, check s4s_max_claims_per_user limit
    if (task.type === 's4s') {
      const settingResult = await turso.execute({
        sql: "SELECT value FROM app_settings WHERE key = 's4s_max_claims_per_user'",
        args: [],
      })
      const maxClaims = settingResult.rows.length > 0
        ? parseInt(settingResult.rows[0].value as string)
        : S4S_MAX_CLAIMS_PER_USER

      const claimCount = await turso.execute({
        sql: "SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND task_id IN (SELECT id FROM tasks WHERE type = 's4s') AND status != 'rejected'",
        args: [String(telegramId)],
      })

      if ((claimCount.rows[0].count as number) >= maxClaims) {
        return NextResponse.json(
          { success: false, error: `You can only claim up to ${maxClaims} s4s tasks` },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()

    const result = await turso.execute({
      sql: `INSERT INTO submissions (task_id, user_id, proof_url, username_used, status, reviewed_by, review_note, reviewed_at, created_at)
            VALUES (?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?)`,
      args: [
        Number(task_id),
        String(telegramId),
        proof_url || null,
        username_used || null,
        now,
      ],
    })

    const newSubmission = await turso.execute({
      sql: 'SELECT * FROM submissions WHERE id = ?',
      args: [result.lastInsertRowid],
    })

    return NextResponse.json({
      success: true,
      data: { submission: newSubmission.rows[0] },
    })
  } catch (error) {
    console.error('Create submission error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create submission' }, { status: 500 })
  }
}
