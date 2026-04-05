export interface ScheduledTask {
  id: string; name: string; schedule: string; // cron expression
  lastRun?: string; nextRun?: string; status: 'ACTIVE' | 'PAUSED'
  handler: string // API route to call
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  { id: 'expire-listings', name: '만료 매물 처리', schedule: '0 0 * * *', status: 'ACTIVE', handler: '/api/v1/cron/daily' },
  { id: 'settlement-batch', name: '월간 정산', schedule: '0 2 1 * *', status: 'ACTIVE', handler: '/api/v1/cron/monthly' },
  { id: 'retention-email', name: '이탈 방지 알림', schedule: '0 9 * * 1', status: 'ACTIVE', handler: '/api/v1/cron/retention' },
  { id: 'weekly-report', name: '주간 리포트', schedule: '0 8 * * 1', status: 'ACTIVE', handler: '/api/v1/cron/weekly' },
  { id: 'ml-retrain', name: 'ML 모델 재학습', schedule: '0 3 * * *', status: 'ACTIVE', handler: '/api/v1/ml/train' },
  { id: 'coupon-expire', name: '쿠폰 만료 처리', schedule: '0 0 * * *', status: 'ACTIVE', handler: '/api/v1/coupons/expire' },
  { id: 'backup', name: '데이터 백업', schedule: '0 4 * * *', status: 'ACTIVE', handler: '/api/v1/admin/backup' },
]
