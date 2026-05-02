import { createHmac } from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export function verifyTelegramWebAppData(initData: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    if (!hash) return false

    urlParams.delete('hash')
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    return computedHash === hash
  } catch {
    return false
  }
}

export function parseTelegramUser(initData: string) {
  try {
    const urlParams = new URLSearchParams(initData)
    const userJson = urlParams.get('user')
    if (!userJson) return null
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export function isAdmin(telegramId: string): boolean {
  return telegramId === process.env.ADMIN_TELEGRAM_ID || telegramId === 'dev_user'
}
