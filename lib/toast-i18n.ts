import { toast } from 'sonner'
import { t } from '@/lib/i18n'

export const toastI18n = {
  success: (key: string, fallback: string) => toast.success(t(key) || fallback),
  error: (key: string, fallback: string) => toast.error(t(key) || fallback),
  loading: (key: string, fallback: string) => toast.loading(t(key) || fallback),
  saved: () => toast.success(t('toast.saved') || '저장되었습니다'),
  deleted: () => toast.success(t('toast.deleted') || '삭제되었습니다'),
  created: () => toast.success(t('toast.created') || '생성되었습니다'),
  updated: () => toast.success(t('toast.updated') || '수정되었습니다'),
  networkError: () => toast.error(t('toast.networkError') || '네트워크 오류가 발생했습니다'),
  unauthorized: () => toast.error(t('toast.unauthorized') || '로그인이 필요합니다'),
  copied: () => toast.success(t('toast.copied') || '클립보드에 복사되었습니다'),
  submitted: () => toast.success(t('toast.submitted') || '제출되었습니다'),
  cancelled: () => toast.success(t('toast.cancelled') || '취소되었습니다'),
  loginRequired: () => toast.error(t('toast.loginRequired') || '로그인이 필요합니다'),
}
