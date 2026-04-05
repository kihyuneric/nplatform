export interface WhiteLabelConfig {
  tenantId: string
  brandName: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  favicon: string
  customDomain?: string
  customFooter?: string
  hideNPLatformBranding: boolean
}

export function getWhiteLabelConfig(tenantId?: string): WhiteLabelConfig | null {
  if (!tenantId) return null
  // In production: fetch from DB
  // For now: return null (default NPLatform branding)
  return null
}

export function applyBranding(config: WhiteLabelConfig) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--brand-primary', config.primaryColor)
  document.documentElement.style.setProperty('--brand-accent', config.accentColor)
  if (config.favicon) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (link) link.href = config.favicon
  }
}
