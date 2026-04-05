/**
 * Unit tests for lib/sanitize.ts
 */
import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeInput,
  sanitizeFilename,
  sanitizeSearchQuery,
  stripTags,
} from '@/lib/sanitize'

describe('sanitizeHtml', () => {
  it('escapes angle brackets', () => {
    const result = sanitizeHtml('<script>alert("xss")</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
  })

  it('escapes double quotes', () => {
    expect(sanitizeHtml('"hello"')).toContain('&quot;')
  })

  it('escapes single quotes', () => {
    expect(sanitizeHtml("it's")).toContain('&#x27;')
  })

  it('escapes ampersands', () => {
    expect(sanitizeHtml('a & b')).toContain('&amp;')
  })

  it('escapes forward slashes', () => {
    expect(sanitizeHtml('a/b')).toContain('&#x2F;')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('sanitizeInput', () => {
  it('strips <script> tags with content', () => {
    const result = sanitizeInput('Hello<script>alert("xss")</script>World')
    expect(result).not.toContain('script')
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('strips all HTML tags', () => {
    const result = sanitizeInput('<b>bold</b> <a href="x">link</a>')
    expect(result).not.toContain('<')
    expect(result).toContain('bold')
    expect(result).toContain('link')
  })

  it('removes javascript: protocol', () => {
    const result = sanitizeInput('javascript:alert(1)')
    expect(result.toLowerCase()).not.toContain('javascript:')
  })

  it('removes inline event handlers (quoted)', () => {
    const result = sanitizeInput('onclick="alert(1)"')
    expect(result).not.toMatch(/onclick/i)
  })

  it('strips common SQL injection patterns', () => {
    const injections = [
      'SELECT * FROM users; DROP TABLE users;--',
      "1' OR '1'='1'; DELETE FROM users;--",
      'UNION SELECT password FROM users',
      'INSERT INTO admin VALUES(1)',
    ]
    for (const input of injections) {
      const result = sanitizeInput(input)
      expect(result.toLowerCase()).not.toMatch(/drop\s+table/i)
      expect(result.toLowerCase()).not.toMatch(/delete\s+from/i)
      expect(result.toLowerCase()).not.toMatch(/union\s+select/i)
      expect(result.toLowerCase()).not.toMatch(/insert\s+into/i)
    }
  })

  it('removes control characters', () => {
    const result = sanitizeInput('hello\x00\x07world')
    expect(result).toBe('helloworld')
  })

  it('preserves normal Korean text', () => {
    const result = sanitizeInput('안녕하세요 부동산 NPL 분석')
    expect(result).toBe('안녕하세요 부동산 NPL 분석')
  })
})

describe('sanitizeFilename', () => {
  it('replaces special characters with underscores', () => {
    const result = sanitizeFilename('my file (1).pdf')
    expect(result).not.toContain(' ')
    expect(result).not.toContain('(')
    expect(result).toContain('.pdf')
  })

  it('preserves Korean characters', () => {
    const result = sanitizeFilename('보고서_2024.xlsx')
    expect(result).toContain('보고서')
  })

  it('collapses multiple dots', () => {
    const result = sanitizeFilename('file...name.txt')
    expect(result).not.toContain('..')
  })

  it('truncates to 255 characters', () => {
    const longName = 'a'.repeat(300) + '.txt'
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255)
  })
})

describe('sanitizeSearchQuery', () => {
  it('removes angle brackets and quotes', () => {
    const result = sanitizeSearchQuery('<script>"hello"</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).not.toContain('"')
  })

  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello')
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(250)
    expect(sanitizeSearchQuery(long).length).toBe(200)
  })
})

describe('stripTags', () => {
  it('removes all HTML tags', () => {
    expect(stripTags('<p>Hello <b>World</b></p>')).toBe('Hello World')
  })
})
