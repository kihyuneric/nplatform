import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'
import { DEFAULT_NAV_CONFIG, type NavConfig } from '@/lib/nav-config'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'nav-config.json')

function readConfig(): NavConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      const stored = JSON.parse(raw) as NavConfig
      // Merge pageSubNavs: stored settings take priority, but new default pages
      // (deals/analysis/services added later) are always included
      const mergedPageSubNavs: NavConfig['pageSubNavs'] = {
        ...DEFAULT_NAV_CONFIG.pageSubNavs,
        ...(stored.pageSubNavs || {}),
      }
      return { ...stored, pageSubNavs: mergedPageSubNavs }
    }
  } catch { /* ignore */ }
  return DEFAULT_NAV_CONFIG
}

function writeConfig(config: NavConfig) {
  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    logger.error('Failed to write nav config:', { error: e })
  }
}

export async function GET() {
  const config = readConfig()
  return NextResponse.json({ data: config }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const current = readConfig()

    // Apply patches: body can contain updated categories array or individual category/item changes
    if (body.categories) {
      current.categories = body.categories
    }
    if (body.pageSubNavs) {
      current.pageSubNavs = body.pageSubNavs
    }

    // Apply single category update
    if (body.categoryKey !== undefined) {
      const idx = current.categories.findIndex(c => c.key === body.categoryKey)
      if (idx !== -1) {
        current.categories[idx] = { ...current.categories[idx], ...body.update }
      }
    }

    // Apply single item update
    if (body.categoryKey !== undefined && body.itemKey !== undefined) {
      const cat = current.categories.find(c => c.key === body.categoryKey)
      if (cat) {
        const itemIdx = cat.items.findIndex(i => i.key === body.itemKey)
        if (itemIdx !== -1) {
          cat.items[itemIdx] = { ...cat.items[itemIdx], ...body.update }
        }
      }
    }

    current.updatedAt = new Date().toISOString()
    writeConfig(current)
    return NextResponse.json({ success: true, data: current })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Reset to defaults
export async function DELETE() {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH)
    return NextResponse.json({ success: true, data: DEFAULT_NAV_CONFIG })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
