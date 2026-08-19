/**
 * 역할별 마이페이지 전수 점검 (2026-08-19)
 *
 * 실제 계정으로 로그인 → 각 역할이 실제로 쓰는 API 를 순서대로 호출해
 * "화면에 데이터가 뜨는가"를 판정한다. (0건이면 화면이 비어 있다는 뜻)
 *
 * 사용: node scripts/qa-roles.mjs [baseUrl]
 */
import fs from 'node:fs'

const BASE = process.argv[2] || 'https://nplatform-private.vercel.app'
const env = fs.readFileSync('.env.local', 'utf8')
const g = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() ?? ''
const SB = g('NEXT_PUBLIC_SUPABASE_URL')
const KEY = g('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const PW = 'QaTest!2026'

const ACCOUNTS = [
  { role: '운영관리자', email: 'admin@nplatform.co.kr' },
  { role: '매각회원',   email: 'demo-seller@nplatform.co.kr' },
  { role: '매입회원',   email: 'buyer1@test.nplatform.kr' },
  { role: '겸용회원',   email: 'dual@test.nplatform.kr' },
]

// 역할별로 화면이 실제 호출하는 엔드포인트
const CHECKS = {
  운영관리자: [
    ['대시보드 지표',      '/api/v1/admin/overview'],
    ['회원 승인',          '/api/v1/admin/users?limit=20'],
    ['매각의뢰 현황',      '/api/v1/exchange/listings?limit=20&status=ACTIVE'],
    ['매입조건 현황',      '/api/v1/exchange/demands?limit=200&all=1'],
    ['NDA · 계약',         '/api/v1/listing-marketing'],
    ['접수함',             '/api/v1/support?page_size=100'],
  ],
  매각회원: [
    ['내 매물',            '/api/v1/exchange/listings?seller_id=me&limit=50'],
    ['알림함',             '/api/v1/notifications?limit=10'],
  ],
  매입회원: [
    ['내 매입조건',        '/api/v1/exchange/demands?limit=50&mine=1'],
    ['자동매칭 리스트',    '/api/v1/matching/by-demand?mine=1'],
    ['관심매물',           '/api/v1/favorites'],
    ['알림함',             '/api/v1/notifications?limit=10'],
  ],
  겸용회원: [
    ['내 매물',            '/api/v1/exchange/listings?seller_id=me&limit=50'],
    ['내 매입조건',        '/api/v1/exchange/demands?limit=50'],
    ['자동매칭 리스트',    '/api/v1/matching/by-demand?mine=1'],
  ],
}

const countOf = j => {
  if (Array.isArray(j?.data)) return j.data.length
  if (Array.isArray(j?.items)) return j.items.length
  if (Array.isArray(j?.users)) return j.users.length
  if (Array.isArray(j?.matches)) return j.matches.length
  if (j?.data && typeof j.data === 'object') return Object.keys(j.data).length
  if (j && typeof j === 'object') return Object.keys(j).length
  return 0
}

const login = async email => {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  })
  if (!r.ok) return null
  const d = await r.json()
  const payload = JSON.stringify({
    access_token: d.access_token, token_type: 'bearer', expires_in: d.expires_in,
    expires_at: d.expires_at, refresh_token: d.refresh_token, user: d.user,
  })
  return 'sb-eqvpubntalikjxcjhpln-auth-token=base64-' + Buffer.from(payload).toString('base64')
}

const fails = []
for (const acct of ACCOUNTS) {
  const cookie = await login(acct.email)
  console.log(`\n── ${acct.role} (${acct.email}) ${cookie ? '' : '· 로그인 실패'}`)
  if (!cookie) { fails.push(`${acct.role}: 로그인 불가`); continue }
  for (const [name, ep] of CHECKS[acct.role]) {
    try {
      const r = await fetch(BASE + ep, { headers: { cookie } })
      const t = await r.text()
      let n = 0, note = ''
      try { n = countOf(JSON.parse(t)) } catch { note = ' (JSON 아님)' }
      const bad = !r.ok || n === 0
      if (bad) fails.push(`${acct.role} › ${name}: ${r.status} ${n}건`)
      console.log(`  ${bad ? 'X' : 'O'} ${name.padEnd(16)} ${r.status} ${String(n).padStart(3)}건${note}${!r.ok ? ' ' + t.slice(0, 110) : ''}`)
    } catch (e) {
      fails.push(`${acct.role} › ${name}: ${e.message}`)
      console.log(`  X ${name} ERR ${e.message}`)
    }
  }
}

console.log('\n════ 문제 목록 ════')
if (fails.length === 0) console.log('없음')
else fails.forEach(f => console.log(' -', f))
