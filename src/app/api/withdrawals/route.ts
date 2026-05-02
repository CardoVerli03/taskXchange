import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'
import { MIN_WITHDRAWAL_USD } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const user_id = searchParams.get('user_id')
    const telegramId = searchParams.get('telegramId')

    let sql = 'SELECT * FROM withdrawals WHERE 1=1'
    const args: (string | number)[] = []

    // If not admin, only show user's own withdrawals
    if (!telegramId || !isAdmin(String(telegramId))) {
      if (user_id) {
        sql += ' AND user_id = ?'
        args.push(user_id)
      } else {
        // Non-admin must provide their own user_id
        return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 })
      }
    } else {
      // Admin can filter by user_id
      if (user_id) {
        sql += ' AND user_id = ?'
        args.push(user_id)
      }
    }

    if (status) {
      sql += ' AND status = ?'
      args.push(status)
    }

    sql += ' ORDER BY created_at DESC'

    const result = await turso.execute({ sql, args })

    return NextResponse.json({
      success: true,
      data: { withdrawals: result.rows },
    })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, amount_usd, wallet_address, crypto_type } = body

    if (!telegramId || !amount_usd || !wallet_address) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Check min withdrawal amount
    // Check app_settings for min_withdrawal_usd
    const settingResult = await turso.execute({
      sql: "SELECT value FROM app_settings WHERE key = 'min_withdrawal_usd'",
      args: [],
    })
    const minWithdrawal = settingResult.rows.length > 0
      ? parseFloat(settingResult.rows[0].value as string)
      : MIN_WITHDRAWAL_USD

    if (amount_usd < minWithdrawal) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}` },
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

    // Check if user has enough balance
    if ((user.balance_usd as number) < amount_usd) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 })
    }

    // Deduct from balance
    const newBalance = (user.balance_usd as number) - amount_usd
    const now = new Date().toISOString()

    await turso.execute({
      sql: 'UPDATE users SET balance_usd = ?, updated_at = ? WHERE telegram_id = ?',
      args: [newBalance, now, String(telegramId)],
    })

    // Create withdrawal request
    const result = await turso.execute({
      sql: `INSERT INTO withdrawals (user_id, amount_usd, amount_crypto, wallet_address, crypto_type, status, tx_hash, processed_by, processed_at, created_at)
            VALUES (?, ?, NULL, ?, ?, 'pending', NULL, NULL, NULL, ?)`,
      args: [
        String(telegramId),
        amount_usd,
        wallet_address,
        crypto_type || 'usdt',
        now,
      ],
    })

    const newWithdrawal = await turso.execute({
      sql: 'SELECT * FROM withdrawals WHERE id = ?',
      args: [result.lastInsertRowid],
    })

    return NextResponse.json({
      success: true,
      data: { withdrawal: newWithdrawal.rows[0] },
    })
  } catch (error) {
    console.error('Create withdrawal error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create withdrawal' }, { status: 500 })
  }
}
