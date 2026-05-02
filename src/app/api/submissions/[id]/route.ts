import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { telegramId, status, review_note } = body

    if (!telegramId || !status) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status. Must be approved or rejected' }, { status: 400 })
    }

    // Get the submission
    const submissionResult = await turso.execute({
      sql: 'SELECT * FROM submissions WHERE id = ?',
      args: [Number(id)],
    })

    if (submissionResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 })
    }

    const submission = submissionResult.rows[0]

    // Only admin or the task poster can review
    const taskResult = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [submission.task_id as number],
    })

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const task = taskResult.rows[0]
    const userIsAdmin = isAdmin(String(telegramId))
    const isPoster = task.posted_by === String(telegramId)

    if (!userIsAdmin && !isPoster) {
      return NextResponse.json({ success: false, error: 'Not authorized to review this submission' }, { status: 403 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Submission has already been reviewed' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update submission status
    await turso.execute({
      sql: 'UPDATE submissions SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = ? WHERE id = ?',
      args: [status, String(telegramId), review_note || null, now, Number(id)],
    })

    // Get the user who submitted
    const userResult = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [submission.user_id as string],
    })

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0]

      if (status === 'approved') {
        // NEW ECONOMICS: Add reward_usd to user's balance_usd (REAL money)
        // Add reward_points to user's points (game currency)
        const rewardUsd = (task.reward_usd as number) || 0
        const rewardPoints = (task.reward_points as number) || 0

        const newPoints = (user.points as number) + rewardPoints
        const newBalance = Math.round(((user.balance_usd as number) + rewardUsd) * 100) / 100

        // Increase trust_score by 1 (max 100)
        const newTrustScore = Math.min((user.trust_score as number) + 1, 100)

        await turso.execute({
          sql: 'UPDATE users SET points = ?, balance_usd = ?, trust_score = ?, updated_at = ? WHERE telegram_id = ?',
          args: [newPoints, newBalance, newTrustScore, now, submission.user_id as string],
        })

        // Increment task's completions_count
        const newCompletionsCount = (task.completions_count as number) + 1

        let taskStatus = task.status as string
        // If task has max_completions and completions_count >= max_completions, set status to 'completed'
        if (task.max_completions && newCompletionsCount >= (task.max_completions as number)) {
          taskStatus = 'completed'
        }

        await turso.execute({
          sql: 'UPDATE tasks SET completions_count = ?, status = ?, updated_at = ? WHERE id = ?',
          args: [newCompletionsCount, taskStatus, now, task.id as number],
        })
      } else if (status === 'rejected') {
        // Decrease trust_score by 2 (min 0)
        const newTrustScore = Math.max((user.trust_score as number) - 2, 0)

        await turso.execute({
          sql: 'UPDATE users SET trust_score = ?, updated_at = ? WHERE telegram_id = ?',
          args: [newTrustScore, now, submission.user_id as string],
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json({ success: false, error: 'Failed to review submission' }, { status: 500 })
  }
}
