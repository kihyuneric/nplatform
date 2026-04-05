export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationErrors {
  [field: string]: string
}

export function validate(data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]

    if (rule.required && (!value && value !== 0)) {
      errors[field] = '필수 입력 항목입니다'
      continue
    }

    if (value === undefined || value === null || value === '') continue

    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors[field] = `최소 ${rule.minLength}자 이상 입력해주세요`
    }

    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors[field] = `최대 ${rule.maxLength}자까지 입력 가능합니다`
    }

    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      errors[field] = `${rule.min} 이상이어야 합니다`
    }

    if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      errors[field] = `${rule.max} 이하여야 합니다`
    }

    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors[field] = '올바른 형식이 아닙니다'
    }

    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) errors[field] = customError
    }
  }

  return errors
}

// Common validation patterns
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/

// Common validation rules
export const commonRules = {
  email: { required: true, pattern: EMAIL_PATTERN, custom: (v: string) => EMAIL_PATTERN.test(v) ? null : '유효한 이메일 주소를 입력해주세요' },
  password: { required: true, minLength: 8 },
  name: { required: true, minLength: 2, maxLength: 50 },
  title: { required: true, minLength: 2, maxLength: 100 },
  content: { required: true, minLength: 10 },
  amount: { required: true, min: 1 },
  phone: { pattern: PHONE_PATTERN },
}
