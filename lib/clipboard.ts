import { toast } from 'sonner'

/**
 * Safe clipboard write with fallback for environments
 * where navigator.clipboard is not available or denied.
 */
export async function copyToClipboard(text: string, successMsg = '복사되었습니다.') {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success(successMsg)
      return true
    }
  } catch {
    // Clipboard API denied — use fallback
  }

  // Fallback: textarea + execCommand
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.success(successMsg)
    return true
  } catch {
    toast.error('복사에 실패했습니다. 직접 복사해주세요.')
    return false
  }
}
