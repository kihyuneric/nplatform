// After successful CRUD operations, create notifications
import { insert } from './data-layer'

export async function notifyAction(action: string, details: {
  targetUserId?: string
  listingId?: string
  dealId?: string
  message: string
}) {
  try {
    await insert('notifications', {
      user_id: details.targetUserId || 'system',
      type: action,
      title: details.message,
      message: details.message,
      link: details.dealId ? `/exchange/deals/${details.dealId}`
            : details.listingId ? `/exchange/${details.listingId}`
            : '/',
      is_read: false,
    })
  } catch {
    // Silent fail — notifications are best-effort
  }
}
