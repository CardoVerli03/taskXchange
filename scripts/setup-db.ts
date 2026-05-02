import { createClient } from '@libsql/client'

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function setup() {
  console.log('Dropping old tables...')

  try { await turso.execute('DROP TABLE IF EXISTS submissions') } catch {}
  try { await turso.execute('DROP TABLE IF EXISTS withdrawals') } catch {}
  try { await turso.execute('DROP TABLE IF EXISTS point_conversions') } catch {}
  try { await turso.execute('DROP TABLE IF EXISTS tasks') } catch {}
  try { await turso.execute('DROP TABLE IF EXISTS users') } catch {}
  try { await turso.execute('DROP TABLE IF EXISTS app_settings') } catch {}

  console.log('Creating database tables...')

  await turso.execute(`
    CREATE TABLE users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      points INTEGER DEFAULT 0,
      balance_usd REAL DEFAULT 0.0,
      wallet_address TEXT,
      crypto_type TEXT DEFAULT 'LTC',
      energy INTEGER DEFAULT 10,
      max_energy INTEGER DEFAULT 10,
      streak INTEGER DEFAULT 0,
      last_tap_at TEXT,
      last_streak_date TEXT,
      last_daily_bonus_date TEXT,
      total_taps INTEGER DEFAULT 0,
      total_mystery_boxes INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      trust_score INTEGER DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await turso.execute(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'paid',
      title TEXT NOT NULL,
      description TEXT,
      link TEXT NOT NULL,
      reward_usd REAL NOT NULL DEFAULT 0,
      reward_points INTEGER NOT NULL DEFAULT 0,
      country TEXT,
      payout_admin REAL,
      posted_by TEXT,
      status TEXT DEFAULT 'active',
      max_completions INTEGER,
      completions_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await turso.execute(`
    CREATE TABLE submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      proof_url TEXT,
      username_used TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await turso.execute(`
    CREATE TABLE withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      amount_crypto REAL,
      wallet_address TEXT NOT NULL,
      crypto_type TEXT DEFAULT 'LTC',
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      processed_by TEXT,
      processed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await turso.execute(`
    CREATE TABLE point_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      usd_received REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await turso.execute(`
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  // Insert default settings
  const defaults = [
    ['points_to_usd_rate', '0.00001'],        // 100,000 pts = $1
    ['min_withdrawal_usd', '1.00'],            // $1 minimum withdrawal
    ['tap_reward_points', '1'],                // base tap reward
    ['max_energy', '10'],
    ['energy_refill_minutes', '144'],           // 2.4 hours per energy
    ['streak_bonus_day7', '500'],              // bonus points on day 7
    ['streak_bonus_day14', '2000'],            // bonus points on day 14
    ['streak_bonus_day30', '5000'],            // bonus points on day 30
    ['mystery_box_interval', '50'],            // every 50th tap
    ['daily_bonus_base', '100'],               // base daily bonus points
    ['s4s_max_active_per_user', '3'],
    ['s4s_max_claims_per_user', '3'],
    ['min_conversion_points', '10000'],         // minimum points to convert (=$0.10)
  ]

  for (const [key, value] of defaults) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
      args: [key, value],
    })
  }

  console.log('Database tables created successfully!')
  console.log('Default settings inserted!')

  // Verify
  const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'")
  console.log('Tables:', tables.rows.map(r => r.name))

  const settings = await turso.execute('SELECT * FROM app_settings')
  console.log('Settings:', settings.rows.map(r => `${r.key}=${r.value}`).join(', '))
}

setup().catch(console.error)
