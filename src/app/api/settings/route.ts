import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { isAdmin } from '@/lib/telegram'

export async function GET() {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM app_settings',
      args: [],
    })

    const settings: Record<string, string> = {}
    for (const row of result.rows) {
      settings[row.key as string] = row.value as string
    }

    return NextResponse.json({
      success: true,
      data: { settings },
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, settings } = body

    if (!telegramId || !settings) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Only admin can update settings
    if (!isAdmin(String(telegramId))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      await turso.execute({
        sql: `INSERT INTO app_settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, String(value)],
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
