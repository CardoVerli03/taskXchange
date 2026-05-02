import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

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

    // Total balance held by users (unpaid balance)
    const balanceSumResult = await turso.execute({
      sql: 'SELECT COALESCE(SUM(balance_usd), 0) as total FROM users',
      args: [],
    })
    const balanceSum = balanceSumResult.rows[0].total as number

    // Total paid out (sum of paid withdrawals)
    const totalPaidOutResult = await turso.execute({
      sql: "SELECT COALESCE(SUM(amount_usd), 0) as total FROM withdrawals WHERE status = 'paid'",
      args: [],
    })
    const totalPaidOut = totalPaidOutResult.rows[0].total as number

    // Total earned by users = balance held + already paid out
    const totalEarned = Math.round((balanceSum + totalPaidOut) * 100) / 100

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

    // Admin profit: CPA revenue (payout_admin * completions_count for each task) minus total paid to users
    const cpaRevenueResult = await turso.execute({
      sql: "SELECT COALESCE(SUM(payout_admin * completions_count), 0) as total FROM tasks WHERE payout_admin IS NOT NULL AND completions_count > 0",
      args: [],
    })
    const cpaRevenue = cpaRevenueResult.rows[0].total as number

    // Total reward_usd paid out to users via approved submissions
    const totalRewardsPaidResult = await turso.execute({
      sql: `SELECT COALESCE(SUM(t.reward_usd), 0) as total
            FROM submissions s
            JOIN tasks t ON s.task_id = t.id
            WHERE s.status = 'approved' AND t.reward_usd > 0`,
      args: [],
    })
    const totalRewardsPaid = totalRewardsPaidResult.rows[0].total as number

    const adminProfit = Math.round((cpaRevenue - totalRewardsPaid) * 100) / 100

    const stats = {
      totalUsers,
      activeToday,
      totalEarned,
      totalPaidOut,
      pendingWithdrawals,
      pendingSubmissions,
      totalTasks,
      activeTasks,
      adminProfit,
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
