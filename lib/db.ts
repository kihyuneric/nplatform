import { createClient } from "@/lib/supabase/client"

export type QueryResult<T> = { data: T[]; error: string | null; isMock: boolean }

/**
 * Safe database query — tries Supabase, returns mock on failure
 */
export async function safeQuery<T>(
  table: string,
  options?: {
    select?: string
    filters?: Record<string, any>
    order?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  },
  mockData?: T[]
): Promise<QueryResult<T>> {
  try {
    const supabase = createClient()
    let query = supabase.from(table).select(options?.select || '*')

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value)
        }
      }
    }
    if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false })
    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit || 20) - 1)

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return { data: data as T[], error: null, isMock: false }
    }
    if (error) throw error
  } catch {}

  return { data: mockData || [] as T[], error: null, isMock: true }
}

/**
 * Safe insert
 */
export async function safeInsert<T>(table: string, record: Partial<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from(table).insert(record as any).select().single()
    if (!error && data) return { data: data as T, error: null }
    if (error) return { data: null, error: error.message }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
  return { data: null, error: 'Unknown error' }
}

/**
 * Safe update
 */
export async function safeUpdate<T>(table: string, id: string, updates: Partial<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from(table).update(updates as any).eq('id', id).select().single()
    if (!error && data) return { data: data as T, error: null }
    if (error) return { data: null, error: error.message }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
  return { data: null, error: 'Unknown error' }
}

/**
 * Safe delete
 */
export async function safeDelete(table: string, id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    return { success: !error, error: error?.message || null }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
