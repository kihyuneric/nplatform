import { toast } from "sonner"

export function toastWithAction(message: string, actionLabel: string, actionFn: () => void) {
  toast(message, {
    action: { label: actionLabel, onClick: actionFn },
    duration: 5000,
  })
}

export function toastDealUpdate(stage: string, dealId: string) {
  const stageLabels: Record<string, string> = {
    NDA: 'NDA 체결이 완료되었습니다',
    DUE_DILIGENCE: '실사가 시작되었습니다',
    NEGOTIATION: '가격 협상 단계입니다',
    CONTRACT: '계약 체결 단계입니다',
    COMPLETED: '거래가 완료되었습니다!',
  }
  const msg = stageLabels[stage] || `거래 상태: ${stage}`
  toast(msg, {
    action: { label: '거래 보기', onClick: () => window.location.href = `/exchange/deals/${dealId}` },
    duration: 8000,
  })
}

export function toastNewListing(title: string, id: string) {
  toast(`새 매물: ${title}`, {
    action: { label: '매물 보기', onClick: () => window.location.href = `/exchange/${id}` },
    duration: 6000,
  })
}

export function toastError(message: string, retryFn?: () => void) {
  if (retryFn) {
    toast.error(message, { action: { label: '다시 시도', onClick: retryFn } })
  } else {
    toast.error(message)
  }
}
