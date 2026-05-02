import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { telegramId, title, description, link, reward_points, reward_usd, country, status, max_completions, payout_admin } = body

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    // Get the task
    const taskResult = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [Number(id)],
    })

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const task = taskResult.rows[0]
    const userIsAdmin = isAdmin(String(telegramId))
    const isPoster = task.posted_by === String(telegramId)

    // Only admin or the task poster can update
    if (!userIsAdmin && !isPoster) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this task' }, { status: 403 })
    }

    // Build dynamic update query
    const updates: string[] = []
    const args: (string | number | null)[] = []

    if (title !== undefined) { updates.push('title = ?'); args.push(title) }
    if (description !== undefined) { updates.push('description = ?'); args.push(description) }
    if (link !== undefined) { updates.push('link = ?'); args.push(link) }
    if (reward_points !== undefined) { updates.push('reward_points = ?'); args.push(reward_points) }
    if (reward_usd !== undefined) { updates.push('reward_usd = ?'); args.push(reward_usd) }
    if (country !== undefined) { updates.push('country = ?'); args.push(country) }
    if (status !== undefined) { updates.push('status = ?'); args.push(status) }
    if (max_completions !== undefined) { updates.push('max_completions = ?'); args.push(max_completions) }
    if (payout_admin !== undefined) { updates.push('payout_admin = ?'); args.push(payout_admin) }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = ?')
    args.push(new Date().toISOString())
    args.push(Number(id))

    await turso.execute({
      sql: `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      args,
    })

    const updatedTask = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [Number(id)],
    })

    return NextResponse.json({
      success: true,
      data: { task: updatedTask.rows[0] },
    })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    // Only admin can delete
    if (!isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Only admin can delete tasks' }, { status: 403 })
    }

    const taskResult = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [Number(id)],
    })

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    await turso.execute({
      sql: 'DELETE FROM tasks WHERE id = ?',
      args: [Number(id)],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 })
  }
}
