// ─────────────────────────────────────────────────────────
//  Universal Data Layer – THE SINGLE SOURCE OF TRUTH
//  Supabase connected → uses real DB
//  NOT connected → uses in-memory sample data with full CRUD
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── File-based persistence helpers ─────────────────────────
// Use dynamic require to avoid webpack bundling issues
let fs: typeof import('fs') | null = null
let path: typeof import('path') | null = null
try {
  fs = require('fs')
  path = require('path')
} catch {}

const DATA_DIR = typeof process !== 'undefined' && path ? path.join(process.cwd(), '.data') : ''

function ensureDataDir() {
  if (!fs || !DATA_DIR) return
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch {}
}

function saveToFile(table: string) {
  if (!fs || !path || !DATA_DIR) return
  try {
    ensureDataDir()
    const data = memoryStore[table]
    if (data) {
      fs.writeFileSync(path.join(DATA_DIR, `${table}.json`), JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (e) {
    // Silent fail — file persistence is best-effort
  }
}

function loadFromFile(table: string): DataRecord[] | null {
  if (!fs || !path || !DATA_DIR) return null
  try {
    ensureDataDir()
    const filePath = path.join(DATA_DIR, `${table}.json`)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      // Validate that the parsed data is an array
      if (Array.isArray(parsed)) return parsed
      logger.warn(`[data-layer] ${table}.json is not an array, ignoring`)
      return null
    }
  } catch (e) {
    logger.warn(`[data-layer] Failed to load ${table}.json`, { error: e })
  }
  return null
}

type DataRecord = Record<string, unknown>

// In-memory store for sample mode
const memoryStore: Record<string, DataRecord[]> = {}

function getMemoryStore(table: string): DataRecord[] {
  if (!memoryStore[table]) {
    // Try file first, then sample data
    const fromFile = loadFromFile(table)
    if (fromFile && fromFile.length > 0) {
      memoryStore[table] = fromFile
    } else {
      const samples = loadSampleData(table)
      memoryStore[table] = [...samples]
    }
  }
  return memoryStore[table]
}

function loadSampleData(table: string): DataRecord[] {
  try {
    switch (table) {
      case 'deal_listings':
        return require('./sample-data/listings').SAMPLE_LISTINGS
      case 'deals':
        return require('./sample-data/deals').SAMPLE_DEALS
      case 'users':
        return require('./sample-data/users').SAMPLE_USERS
      case 'professionals':
        return require('./sample-data/extra').SAMPLE_PROFESSIONALS
      case 'consultations':
        return require('./sample-data/extra').SAMPLE_CONSULTATIONS
      case 'notices':
        return require('./sample-data/extra').SAMPLE_NOTICES
      case 'community_posts':
      case 'posts':
        return require('./sample-data/extra').SAMPLE_POSTS
      case 'notifications':
        return require('./sample-data/extra').SAMPLE_NOTIFICATIONS
      case 'coupons':
        return require('./sample-data/extra').SAMPLE_COUPONS
      case 'referral_codes':
        return require('./sample-data/extra').SAMPLE_REFERRAL_CODES
      case 'deal_messages':
        return require('./sample-data/extra').SAMPLE_DEAL_MESSAGES
      case 'credit_transactions':
        return require('./sample-data/extra').SAMPLE_CREDIT_TRANSACTIONS
      case 'banners':
        return require('./sample-data/extra').SAMPLE_BANNERS
      case 'support_tickets':
        return require('./sample-data/extra').SAMPLE_SUPPORT_TICKETS
      case 'demands':
        return require('./sample-data/extra').SAMPLE_DEMANDS
      case 'approvals':
        return require('./sample-data/extra').SAMPLE_APPROVALS
      case 'contracts':
        return require('./sample-data/extra').SAMPLE_CONTRACTS
      case 'consultation_reviews':
        return require('./sample-data/extra').SAMPLE_REVIEWS
      case 'invoices':
        return require('./sample-data/extra').SAMPLE_INVOICES
      case 'search_logs':
        return require('./sample-data/extra').SAMPLE_SEARCH_LOGS
      default:
        return []
    }
  } catch {
    return []
  }
}

// ─── Sample mode detection ────────────────────────────────
// Returns true when no real Supabase connection is available
// (i.e., data is served from in-memory/sample store)
let _sampleModeCache: boolean | null = null

export async function isSampleMode(): Promise<boolean> {
  if (_sampleModeCache !== null) return _sampleModeCache
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('deal_listings').select('id', { count: 'exact', head: true })
    _sampleModeCache = !!error
  } catch {
    _sampleModeCache = true
  }
  return _sampleModeCache
}

// Synchronous version for client components (checks via API)
export function isSampleModeSync(): boolean {
  return _sampleModeCache ?? true // default to true until proven otherwise
}

// Reset cache (useful after connecting to Supabase)
export function resetSampleModeCache() {
  _sampleModeCache = null
}

// Expose memoryStore for admin data management
export function getMemoryStoreRef(): Record<string, DataRecord[]> {
  return memoryStore
}

// Get all table names that have data in the memory store
export function getLoadedTables(): string[] {
  return Object.keys(memoryStore)
}

// Clear a specific table from memory store
export function clearMemoryTable(table: string) {
  if (memoryStore[table]) {
    memoryStore[table] = []
    saveToFile(table)
  }
}

// Reload sample data for a specific table
export function reloadSampleTable(table: string) {
  const samples = loadSampleData(table)
  memoryStore[table] = [...samples]
  saveToFile(table)
}

// QUERY: Select with filters, sort, pagination
export async function query<T = DataRecord>(
  table: string,
  options: {
    filters?: Record<string, unknown>
    orderBy?: string
    order?: 'asc' | 'desc'
    limit?: number
    offset?: number
    select?: string
  } = {}
): Promise<{ data: T[]; total: number; _source: 'supabase' | 'sample' }> {
  const { filters, orderBy, order = 'desc', limit = 50, offset = 0, select = '*' } = options

  // Try Supabase first
  try {
    const supabase = await createClient()
    let q = supabase.from(table).select(select, { count: 'exact' })

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) {
          q = q.in(key, value)
        } else if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
          q = q.ilike(key, value)
        } else {
          q = q.eq(key, value)
        }
      }
    }

    if (orderBy) q = q.order(orderBy, { ascending: order === 'asc' })
    q = q.range(offset, offset + limit - 1)

    const { data, error, count } = await q
    if (!error && data) {
      return { data: data as T[], total: count || data.length, _source: 'supabase' }
    }
  } catch {}

  // Fallback to memory/sample
  let data = getMemoryStore(table) as T[]

  if (filters) {
    data = data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true
        const itemValue = (item as DataRecord)[key]
        if (Array.isArray(value)) return value.includes(itemValue)
        if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
          const search = value.slice(1, -1).toLowerCase()
          return String(itemValue || '').toLowerCase().includes(search)
        }
        return itemValue === value
      })
    })
  }

  if (orderBy) {
    data = [...data].sort((a, b) => {
      const aVal = (a as DataRecord)[orderBy]
      const bVal = (b as DataRecord)[orderBy]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') return order === 'asc' ? aVal - bVal : bVal - aVal
      return order === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
  }

  const total = data.length
  data = data.slice(offset, offset + limit)

  return { data, total, _source: 'sample' }
}

// INSERT
export async function insert<T = DataRecord>(
  table: string,
  record: Partial<T>
): Promise<{ data: T; _source: 'supabase' | 'sample' }> {
  const newRecord = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...record,
  } as T

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from(table).insert(newRecord).select().single()
    if (!error && data) return { data: data as T, _source: 'supabase' }
  } catch {}

  // Memory insert
  const store = getMemoryStore(table)
  store.unshift(newRecord as DataRecord)
  saveToFile(table)
  return { data: newRecord, _source: 'sample' }
}

// UPDATE
export async function update<T = DataRecord>(
  table: string,
  id: string,
  changes: Partial<T>
): Promise<{ data: T; _source: 'supabase' | 'sample' }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from(table).update(changes).eq('id', id).select().single()
    if (!error && data) return { data: data as T, _source: 'supabase' }
  } catch {}

  const store = getMemoryStore(table)
  const idx = store.findIndex((item) => item.id === id)
  if (idx !== -1) {
    store[idx] = { ...store[idx], ...changes, updated_at: new Date().toISOString() }
    saveToFile(table)
    return { data: store[idx] as T, _source: 'sample' }
  }
  throw new Error('Not found')
}

// DELETE
export async function remove(table: string, id: string): Promise<{ success: boolean; _source: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) return { success: true, _source: 'supabase' }
  } catch {}

  const store = getMemoryStore(table)
  const idx = store.findIndex((item) => item.id === id)
  if (idx !== -1) {
    store.splice(idx, 1)
    saveToFile(table)
    return { success: true, _source: 'sample' }
  }
  return { success: false, _source: 'sample' }
}

// COUNT
export async function count(table: string, filters?: Record<string, unknown>): Promise<number> {
  const { total } = await query(table, { filters, limit: 1 })
  return total
}

// GET BY ID
export async function getById<T = DataRecord>(table: string, id: string): Promise<{ data: T | null; _source: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
    if (!error && data) return { data: data as T, _source: 'supabase' }
  } catch {}

  const store = getMemoryStore(table)
  const item = store.find((item) => item.id === id)
  return { data: (item as T) || null, _source: 'sample' }
}
