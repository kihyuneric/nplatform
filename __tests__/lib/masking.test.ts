import { describe, it, expect } from 'vitest'
import {
  maskName, maskPhone, maskSSN, maskAddress, maskAmount, maskAccount,
  maskValue, getMaskingLevel, shouldMask,
} from '@/lib/masking'

describe('maskName', () => {
  it('masks 3-character Korean name', () => {
    expect(maskName('홍길동')).toBe('홍*동')
  })
  it('masks 2-character name', () => {
    expect(maskName('김철')).toBe('김*')
  })
  it('masks 4-character name', () => {
    expect(maskName('남궁민수')).toBe('남**수')
  })
  it('masks 1-character', () => {
    expect(maskName('김')).toBe('*')
  })
  it('handles empty string', () => {
    expect(maskName('')).toBe('')
  })
})

describe('maskPhone', () => {
  it('masks 11-digit phone', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-****-5678')
  })
  it('masks 11-digit phone without dashes', () => {
    expect(maskPhone('01012345678')).toBe('010-****-5678')
  })
  it('masks 10-digit phone', () => {
    expect(maskPhone('0212345678')).toBe('021-***-5678')
  })
  it('handles empty', () => {
    expect(maskPhone('')).toBe('')
  })
})

describe('maskSSN', () => {
  it('masks SSN with dash', () => {
    expect(maskSSN('900101-1234567')).toBe('900101-*******')
  })
  it('masks SSN without dash', () => {
    expect(maskSSN('9001011234567')).toBe('900101-*******')
  })
  it('handles empty', () => {
    expect(maskSSN('')).toBe('')
  })
})

describe('maskAddress', () => {
  it('masks detailed address', () => {
    const result = maskAddress('서울 강남구 역삼동 123-45')
    expect(result).toContain('서울')
    expect(result).toContain('강남구')
    expect(result).toContain('역삼동')
    expect(result).toContain('***')
    expect(result).not.toContain('123-45')
  })
  it('keeps short address as is', () => {
    expect(maskAddress('서울 강남구')).toBe('서울 강남구')
  })
  it('handles empty', () => {
    expect(maskAddress('')).toBe('')
  })
})

describe('maskAmount', () => {
  it('masks billions', () => {
    expect(maskAmount(3500000000)).toBe('30~40억원')
  })
  it('masks small billions', () => {
    expect(maskAmount(500000000)).toBe('1~10억원')
  })
  it('masks tens of millions (만원)', () => {
    // 50000000 = 5000만원 → 범위: 5,000~6,000만원
    expect(maskAmount(50000000)).toBe('5,000~6,000만원')
  })
  it('handles zero', () => {
    expect(maskAmount(0)).toBe('비공개')
  })
})

describe('maskAccount', () => {
  it('masks account with dashes', () => {
    const result = maskAccount('110-123-456789-12')
    expect(result).toBe('110-***-******-12')
  })
  it('masks account without dashes', () => {
    const result = maskAccount('11012345678912')
    expect(result.startsWith('11')).toBe(true)
    expect(result.endsWith('12')).toBe(true)
    expect(result).toContain('*')
  })
  it('handles empty', () => {
    expect(maskAccount('')).toBe('')
  })
})

describe('maskValue', () => {
  it('routes to correct function', () => {
    expect(maskValue('홍길동', 'name')).toBe('홍*동')
    expect(maskValue('010-1234-5678', 'phone')).toBe('010-****-5678')
  })
})

describe('getMaskingLevel', () => {
  it('returns NONE for tenant admin', () => {
    expect(getMaskingLevel({
      viewerRole: 'BUYER',
      isSameTenant: true,
      isNdaSigned: false,
      tenantRole: 'TENANT_ADMIN',
    })).toBe('NONE')
  })
  it('returns STANDARD for same tenant member', () => {
    expect(getMaskingLevel({
      viewerRole: 'BUYER',
      isSameTenant: true,
      isNdaSigned: false,
      tenantRole: 'MEMBER',
    })).toBe('STANDARD')
  })
  it('returns STANDARD for NDA-signed external buyer', () => {
    expect(getMaskingLevel({
      viewerRole: 'BUYER',
      isSameTenant: false,
      isNdaSigned: true,
    })).toBe('STANDARD')
  })
  it('returns ENHANCED for external without NDA', () => {
    expect(getMaskingLevel({
      viewerRole: 'BUYER',
      isSameTenant: false,
      isNdaSigned: false,
    })).toBe('ENHANCED')
  })
})

describe('shouldMask', () => {
  it('never masks at NONE level', () => {
    expect(shouldMask('name', 'NONE')).toBe(false)
    expect(shouldMask('ssn', 'NONE')).toBe(false)
  })
  it('masks everything at ENHANCED level', () => {
    expect(shouldMask('name', 'ENHANCED')).toBe(true)
    expect(shouldMask('phone', 'ENHANCED')).toBe(true)
    expect(shouldMask('ssn', 'ENHANCED')).toBe(true)
  })
  it('only masks sensitive at STANDARD level', () => {
    expect(shouldMask('name', 'STANDARD')).toBe(false)
    expect(shouldMask('ssn', 'STANDARD')).toBe(true)
    expect(shouldMask('account', 'STANDARD')).toBe(true)
  })
})
