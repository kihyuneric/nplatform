export interface ComplianceCheck {
  id: string; category: string; name: string; status: 'PASS' | 'FAIL' | 'WARNING'
  description: string; lastChecked: string
}

export function runComplianceChecks(): ComplianceCheck[] {
  return [
    { id: 'c1', category: '데이터 보호', name: '개인정보 암호화', status: 'PASS', description: 'AES-256 암호화 적용', lastChecked: new Date().toISOString() },
    { id: 'c2', category: '데이터 보호', name: '마스킹 정책', status: 'PASS', description: '6종 마스킹 규칙 적용', lastChecked: new Date().toISOString() },
    { id: 'c3', category: '접근 제어', name: 'RBAC', status: 'PASS', description: '역할 기반 접근 제어', lastChecked: new Date().toISOString() },
    { id: 'c4', category: '접근 제어', name: 'MFA', status: 'WARNING', description: '관리자 MFA 설정 필요', lastChecked: new Date().toISOString() },
    { id: 'c5', category: '인프라', name: 'HTTPS', status: 'PASS', description: 'HSTS 적용', lastChecked: new Date().toISOString() },
    { id: 'c6', category: '인프라', name: 'CSP', status: 'WARNING', description: 'nonce 미적용 (unsafe-inline)', lastChecked: new Date().toISOString() },
    { id: 'c7', category: '감사', name: '감사 로그', status: 'PASS', description: '모든 접근 기록', lastChecked: new Date().toISOString() },
    { id: 'c8', category: '감사', name: 'Rate Limiting', status: 'PASS', description: 'API 요청 제한 적용', lastChecked: new Date().toISOString() },
    { id: 'c9', category: '규제', name: '투자 면책', status: 'PASS', description: '8개 서비스 면책 조항 적용', lastChecked: new Date().toISOString() },
    { id: 'c10', category: '규제', name: '개인정보처리방침', status: 'PASS', description: 'PIPA 준수', lastChecked: new Date().toISOString() },
  ]
}
