import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, wallet_address, crypto_type } = body

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    if (!wallet_address) {
      return NextResponse.json({ success: false, error: 'Wallet address is required' }, { status: 400 })
    }

    const validCryptoTypes = ['LTC', 'SOL']
    const cryptoType = validCryptoTypes.includes(crypto_type) ? crypto_type : 'LTC'

    await turso.execute({
      sql: 'UPDATE users SET wallet_address = ?, crypto_type = ?, updated_at = ? WHERE telegram_id = ?',
      args: [wallet_address, cryptoType, new Date().toISOString(), String(telegramId)],
    })

    const updatedUser = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [String(telegramId)],
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser.rows[0] },
    })
  } catch (error) {
    console.error('Update wallet error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update wallet' }, { status: 500 })
  }
}
