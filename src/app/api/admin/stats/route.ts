import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'
import type { AdminStats } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId || !isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Total users
    const totalUsersResult = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM users',
      args: [],
    })
    const totalUsers = totalUsersResult.rows[0].count as number

    // Active today (updated_at is today)
    const today = new Date().toISOString().split('T')[0]
    const activeTodayResult = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM users WHERE DATE(updated_at) = ?",
      args: [today],
    })
    const activeToday = activeTodayResult.rows[0].count as number

    // Total earned (sum of balance_usd)
    const totalEarnedResult = await turso.execute({
      sql: 'SELECT COALESCE(SUM(balance_usd), 0) as total FROM users',
      args: [],
    })
    const balanceSum = totalEarnedResult.rows[0].total as number

    // Total paid out (sum of paid withdrawals)
    const totalPaidOutResult = await turso.execute({
      sql: "SELECT COALESCE(SUM(amount_usd), 0) as total FROM withdrawals WHERE status = 'paid'",
      args: [],
    })
    const totalPaidOut = totalPaidOutResult.rows[0].total as number

    // Total earned = balance + already paid out
    const totalEarned = balanceSum + totalPaidOut

    // Pending withdrawals count
    const pendingWithdrawalsResult = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'",
      args: [],
    })
    const pendingWithdrawals = pendingWithdrawalsResult.rows[0].count as number

    // Pending submissions count
    const pendingSubmissionsResult = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM submissions WHERE status = 'pending'",
      args: [],
    })
    const pendingSubmissions = pendingSubmissionsResult.rows[0].count as number

    // Total tasks
    const totalTasksResult = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM tasks',
      args: [],
    })
    const totalTasks = totalTasksResult.rows[0].count as number

    // Active tasks
    const activeTasksResult = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM tasks WHERE status = 'active'",
      args: [],
    })
    const activeTasks = activeTasksResult.rows[0].count as number

    const stats: AdminStats = {
      totalUsers,
      activeToday,
      totalEarned,
      totalPaidOut,
      pendingWithdrawals,
      pendingSubmissions,
      totalTasks,
      activeTasks,
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
