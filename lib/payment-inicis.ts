/**
 * lib/payment-inicis.ts
 *
 * KG이니시스 표준결제창 통합 라이브러리
 * https://manual.inicis.com/pay/
 *
 * 환경변수:
 *   INICIS_MID        — 가맹점 MID (테스트: INIBillTst)
 *   INICIS_SIGN_KEY   — 서명키 (테스트: SU5JTElURV9UUklfREVTM0tFWQ==)
 *   INICIS_API_KEY    — API 키 (테스트: ItEQKi3rY7uvDS8l)
 *   INICIS_IV         — IV (테스트: HYb3yQ4f65QL89==)
 *   INICIS_IS_TEST    — true이면 테스트 MID 사용 (기본: true)
 */

import crypto from 'crypto'

// ─── 타입 정의 ─────────────────────────────────────────────

export interface InicisConfig {
  mid: string
  signKey: string
  apiKey: string
  iv: string
  isTest: boolean
  approvalUrl: string
}

export interface InicisCheckoutParams {
  // 필수 폼 필드
  version: string
  gopaymethod: string
  mid: string
  orderNumber: string   // oid
  price: number
  itemname: string
  buyername: string
  buyertel: string
  buyeremail: string
  timestamp: string
  signature: string
  mKey: string
  returnUrl: string
  closeUrl: string
  // 옵션 필드
  charset: string
  acceptmethod: string
  currency: string
}

export interface InicisReturnData {
  resultCode: string
  resultMsg: string
  mid: string
  orderNumber: string    // oid
  authCode?: string
  authDate?: string
  itemName?: string
  price?: string
  buyerName?: string
  buyerEmail?: string
  buyerTel?: string
  authToken: string
  authUrl: string
  netCancelUrl?: string
  charset?: string
  merchantData?: string
}

export interface InicisApprovalResult {
  success: boolean
  tid?: string
  mid?: string
  oid?: string
  price?: number
  method?: string
  goodname?: string
  buyername?: string
  receiptUrl?: string
  approveDate?: string
  approveTime?: string
  error?: string
  raw?: Record<string, unknown>
}

// ─── 설정 읽기 ────────────────────────────────────────────

export function getInicisConfig(): InicisConfig {
  const isTest = process.env.INICIS_IS_TEST !== 'false'   // 기본 true

  const mid      = process.env.INICIS_MID       ?? (isTest ? 'INIBillTst' : '')
  const signKey  = process.env.INICIS_SIGN_KEY  ?? (isTest ? 'SU5JTElURV9UUklfREVTM0tFWQ==' : '')
  const apiKey   = process.env.INICIS_API_KEY   ?? (isTest ? 'ItEQKi3rY7uvDS8l' : '')
  const iv       = process.env.INICIS_IV        ?? (isTest ? 'HYb3yQ4f65QL89==' : '')

  // 이니시스 승인 API URL (테스트/운영 동일, MID로 구분)
  const approvalUrl = 'https://iniapi.inicis.com/api/v1/payment'

  return { mid, signKey, apiKey, iv, isTest, approvalUrl }
}

// ─── 해시 유틸 ───────────────────────────────────────────

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

// ─── 서명 생성 ───────────────────────────────────────────

/**
 * 이니시스 결제 요청 서명 생성
 * SHA256(oid=<oid>&price=<price>&timestamp=<timestamp>)
 */
export function generateInicisSignature(
  oid: string,
  price: number,
  timestamp: string,
): string {
  return sha256(`oid=${oid}&price=${price}&timestamp=${timestamp}`)
}

/**
 * 이니시스 mKey 생성
 * SHA256(signKey)
 */
export function generateInicisMKey(signKey: string): string {
  return sha256(signKey)
}

/**
 * 이니시스 타임스탬프 생성 (yyyyMMddHHmmss)
 */
export function generateInicisTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

// ─── 결제 폼 파라미터 빌드 ────────────────────────────────

export interface BuildInicisCheckoutOptions {
  oid: string
  goodname: string
  price: number
  buyername: string
  buyeremail: string
  buyertel: string
  returnUrl: string
  closeUrl: string
  gopaymethod?: string   // 기본: 'Card'
}

/**
 * 이니시스 결제창 호출에 필요한 모든 폼 파라미터를 생성
 */
export function buildInicisCheckoutParams(
  opts: BuildInicisCheckoutOptions,
): InicisCheckoutParams {
  const config    = getInicisConfig()
  const timestamp = generateInicisTimestamp()
  const signature = generateInicisSignature(opts.oid, opts.price, timestamp)
  const mKey      = generateInicisMKey(config.signKey)

  return {
    version:      '1.0',
    gopaymethod:  opts.gopaymethod ?? 'Card',
    mid:          config.mid,
    orderNumber:  opts.oid,
    price:        opts.price,
    itemname:     opts.goodname,
    buyername:    opts.buyername,
    buyertel:     opts.buyertel  || '01000000000',
    buyeremail:   opts.buyeremail,
    timestamp,
    signature,
    mKey,
    returnUrl:    opts.returnUrl,
    closeUrl:     opts.closeUrl,
    charset:      'UTF-8',
    acceptmethod: 'CARDPOINT',
    currency:     'WON',
  }
}

// ─── 서버사이드 승인 (verifyInicisPayment) ────────────────

/**
 * KG이니시스 승인 API 호출
 *
 * returnUrl 에서 POST 데이터를 받은 뒤,
 * authToken + authUrl 로 실제 승인을 요청한다.
 */
export async function verifyInicisPayment(
  data: InicisReturnData,
): Promise<InicisApprovalResult> {
  const config    = getInicisConfig()
  const timestamp = generateInicisTimestamp()

  // 승인 요청 서명: SHA256(authToken + timestamp + mid + signKey)
  const approvalSignature = sha256(
    `authToken=${data.authToken}&timestamp=${timestamp}`,
  )

  const params = new URLSearchParams({
    mid:       data.mid || config.mid,
    authToken: data.authToken,
    timestamp,
    signature: approvalSignature,
    charset:   data.charset ?? 'UTF-8',
    format:    'JSON',
  })

  try {
    // 이니시스는 authUrl 로 직접 POST 해야 한다
    const targetUrl = data.authUrl || config.approvalUrl
    const res = await fetch(targetUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    params.toString(),
      cache:   'no-store',
    })

    const text = await res.text()
    let json: Record<string, unknown>

    try {
      json = JSON.parse(text)
    } catch {
      // XML 응답일 수 있음 — 간이 파싱
      json = parseInicisXmlResponse(text)
    }

    const resultCode = String(json['resultCode'] ?? json['P_STATUS'] ?? '')
    const resultMsg  = String(json['resultMsg']  ?? json['P_RMESG1'] ?? '알 수 없는 오류')

    if (resultCode !== '0000') {
      return {
        success: false,
        oid:     data.orderNumber,
        error:   `이니시스 승인 실패 (${resultCode}): ${resultMsg}`,
        raw:     json,
      }
    }

    const price = parseInt(
      String(json['MOID_Price'] ?? json['P_AMT'] ?? data.price ?? '0'),
      10,
    )

    return {
      success:      true,
      tid:          String(json['tid']       ?? json['P_TID']       ?? ''),
      mid:          String(json['MOID']      ?? json['P_MID']       ?? data.mid),
      oid:          String(json['MOID']      ?? json['P_OID']       ?? data.orderNumber),
      price,
      method:       String(json['payMethod'] ?? json['P_METHODNAME'] ?? ''),
      goodname:     String(json['goodname']  ?? json['P_GOODS']      ?? data.itemName ?? ''),
      buyername:    String(json['buyerName'] ?? json['P_UNAME']      ?? data.buyerName ?? ''),
      receiptUrl:   String(json['CARD_Num']  ?? ''),
      approveDate:  String(json['applDate']  ?? json['P_AUTH_DT']    ?? ''),
      approveTime:  String(json['applTime']  ?? ''),
      raw:          json,
    }
  } catch (err) {
    return {
      success: false,
      oid:     data.orderNumber,
      error:   `승인 API 호출 실패: ${String(err)}`,
    }
  }
}

// ─── 간이 XML 파서 ───────────────────────────────────────

function parseInicisXmlResponse(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const tagRe = /<([^>/]+)>([^<]*)<\/\1>/g
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(xml)) !== null) {
    result[match[1]] = match[2]
  }
  return result
}

// ─── 크레딧 패키지 (portone 파일과 동일, 참조용 재노출) ───

export { CREDIT_PACKAGES, getCreditPackage } from '@/lib/payment-portone'
export type { CreditPackageId } from '@/lib/payment-portone'
