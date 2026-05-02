import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { ENERGY_REFILL_MINUTES, MAX_ENERGY } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 })
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [telegramId],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]

    // Recalculate energy based on time since last tap
    let energy = user.energy as number
    const maxEnergy = user.max_energy as number
    const lastTapAt = user.last_tap_at as string | null

    if (lastTapAt) {
      const lastTap = new Date(lastTapAt).getTime()
      const now = Date.now()
      const minutesElapsed = Math.floor((now - lastTap) / 60000)
      const energyGained = Math.floor(minutesElapsed / ENERGY_REFILL_MINUTES)

      if (energyGained > 0) {
        energy = Math.min(energy + energyGained, maxEnergy)
      }
    } else {
      // If never tapped, user should have full energy
      energy = maxEnergy
    }

    // Update energy in DB if it changed
    if (energy !== (user.energy as number)) {
      await turso.execute({
        sql: 'UPDATE users SET energy = ?, updated_at = ? WHERE telegram_id = ?',
        args: [energy, new Date().toISOString(), telegramId],
      })
    }

    // Return user with recalculated energy
    const updatedUser = { ...user, energy }

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 })
  }
}
