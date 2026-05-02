import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { telegramId, status, tx_hash, amount_crypto } = body

    if (!telegramId || !status) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (!['paid', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status. Must be paid or rejected' }, { status: 400 })
    }

    // Only admin can process withdrawals
    if (!isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Only admin can process withdrawals' }, { status: 403 })
    }

    // Get the withdrawal
    const withdrawalResult = await turso.execute({
      sql: 'SELECT * FROM withdrawals WHERE id = ?',
      args: [Number(id)],
    })

    if (withdrawalResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Withdrawal not found' }, { status: 404 })
    }

    const withdrawal = withdrawalResult.rows[0]

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Withdrawal has already been processed' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Process the withdrawal
    await turso.execute({
      sql: 'UPDATE withdrawals SET status = ?, tx_hash = ?, amount_crypto = ?, processed_by = ?, processed_at = ? WHERE id = ?',
      args: [
        status,
        tx_hash || null,
        amount_crypto || null,
        String(telegramId),
        now,
        Number(id),
      ],
    })

    // If rejected, refund amount_usd to user's balance
    if (status === 'rejected') {
      const userResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE telegram_id = ?',
        args: [withdrawal.user_id as string],
      })

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        const newBalance = (user.balance_usd as number) + (withdrawal.amount_usd as number)

        await turso.execute({
          sql: 'UPDATE users SET balance_usd = ?, updated_at = ? WHERE telegram_id = ?',
          args: [newBalance, now, withdrawal.user_id as string],
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Process withdrawal error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process withdrawal' }, { status: 500 })
  }
}
