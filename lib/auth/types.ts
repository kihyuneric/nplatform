/**
 * lib/auth/types.ts
 *
 * 인증 도메인 공용 타입.
 */

export interface CarrierIdentity {
  name: string
  birthDate: string         // YYYY-MM-DD
  gender: "M" | "F"
  carrier: "SKT" | "KT" | "LGU" | "SKT_MVNO" | "KT_MVNO" | "LGU_MVNO"
  ci: string                // 88byte
  di: string                // 64byte
  isForeigner: boolean
}
