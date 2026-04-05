/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize user input: strip HTML tags, script injection attempts,
 * SQL injection patterns, and control characters (defense in depth)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags with content
    .replace(/<[^>]*>/g, '') // Strip all remaining HTML tags
    .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove inline event handlers (quoted)
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers (unquoted)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/(\b)(union\s+select|insert\s+into|drop\s+table|delete\s+from|update\s+\w+\s+set|alter\s+table|exec(\s+|\()|execute(\s+|\())/gi, '$1') // Strip common SQL injection patterns
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255)
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>'"]/g, '')
    .substring(0, 200)
}

/**
 * Strip all HTML tags
 */
export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}
