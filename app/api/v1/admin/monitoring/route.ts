import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function rand(min: number, max: number, decimals = 0) {
  const val = Math.random() * (max - min) + min
  return Number(val.toFixed(decimals))
}

function sparkline(base: number, variance: number, points = 24): number[] {
  return Array.from({ length: points }, () =>
    Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 2 * variance))
  )
}

function generateErrorLogs(count: number) {
  const severities = ["INFO", "WARN", "ERROR", "CRITICAL"] as const
  const messages = [
    { severity: "ERROR" as const, message: "Supabase 연결 타임아웃 - pool exhausted", stack: "ConnectionError: ETIMEDOUT\n    at Pool.connect (/app/lib/supabase/server.ts:42:11)\n    at async handler (/app/api/v1/listings/route.ts:18:20)" },
    { severity: "WARN" as const, message: "API 응답시간 임계치 초과 (>2000ms) - /api/v1/market/search", stack: "SlowQueryWarning: Query took 2341ms\n    at QueryMonitor.check (/lib/monitoring.ts:67:5)" },
    { severity: "CRITICAL" as const, message: "디스크 사용률 90% 초과 - /dev/sda1", stack: "DiskSpaceAlert: Usage at 91.2%\n    at DiskMonitor.poll (/lib/monitoring.ts:112:8)" },
    { severity: "INFO" as const, message: "일일 데이터베이스 백업 완료 (2.3GB)", stack: "" },
    { severity: "ERROR" as const, message: "Redis 캐시 flush 실패 - READONLY", stack: "RedisError: READONLY You can't write against a read only replica\n    at RedisClient.flush (/lib/cache.ts:34:12)" },
    { severity: "WARN" as const, message: "메모리 사용률 85% 경고 - worker-3", stack: "MemoryWarning: RSS 1.7GB / 2GB limit\n    at MemoryMonitor.check (/lib/monitoring.ts:89:5)" },
    { severity: "INFO" as const, message: "SSL 인증서 갱신 완료 - *.nplatform.co.kr", stack: "" },
    { severity: "ERROR" as const, message: "외부 API 호출 실패 - 국토교통부 실거래가 API (503)", stack: "ExternalAPIError: Service Unavailable\n    at fetch (/app/api/v1/market/prices/route.ts:55:18)" },
    { severity: "WARN" as const, message: "Rate limit 임계치 도달 - IP 203.xxx.xxx.45 (950/1000)", stack: "RateLimitWarning: 95% of limit reached\n    at RateLimiter.check (/middleware.ts:23:10)" },
    { severity: "CRITICAL" as const, message: "결제 게이트웨이 연결 실패 - PG사 점검 중", stack: "PaymentGatewayError: Connection refused\n    at PGClient.connect (/lib/payment.ts:28:14)" },
    { severity: "INFO" as const, message: "크론 작업 완료: 뉴스 크롤링 (수집: 127건)", stack: "" },
    { severity: "ERROR" as const, message: "이미지 업로드 실패 - S3 버킷 권한 오류", stack: "S3Error: AccessDenied\n    at S3Client.putObject (/lib/storage.ts:45:20)" },
  ]

  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const entry = messages[i % messages.length]
    return {
      id: `err-${String(count - i).padStart(4, "0")}`,
      severity: entry.severity,
      message: entry.message,
      stack: entry.stack,
      timestamp: new Date(now - i * rand(30000, 300000)).toISOString(),
      source: "system",
    }
  })
}

// ---------------------------------------------------------------------------
// API endpoints health check mock
// ---------------------------------------------------------------------------

function generateEndpointHealth() {
  const endpoints = [
    { name: "/api/v1/listings", method: "GET" },
    { name: "/api/v1/market/search", method: "GET" },
    { name: "/api/v1/auction", method: "GET" },
    { name: "/api/v1/auth/login", method: "POST" },
    { name: "/api/v1/news", method: "GET" },
    { name: "/api/v1/statistics", method: "GET" },
    { name: "/api/v1/ai/analysis", method: "POST" },
    { name: "/api/v1/community/posts", method: "GET" },
    { name: "/api/v1/users/profile", method: "GET" },
    { name: "/api/v1/fund/products", method: "GET" },
  ]

  return endpoints.map((ep) => {
    const healthy = Math.random() > 0.15
    const degraded = !healthy && Math.random() > 0.5
    return {
      ...ep,
      status: healthy ? "healthy" : degraded ? "degraded" : "down",
      responseTime: healthy ? rand(45, 350) : degraded ? rand(800, 3000) : null,
      lastChecked: new Date(Date.now() - rand(5000, 60000)).toISOString(),
    }
  })
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  const cpuBase = rand(25, 65, 1)
  const memBase = rand(55, 82, 1)
  const diskBase = rand(45, 75, 1)

  const data = {
    timestamp: new Date().toISOString(),
    status: cpuBase > 80 || memBase > 90 ? "critical" : cpuBase > 60 || memBase > 80 ? "warning" : "normal",
    uptime: rand(99.90, 99.99, 2),
    uptimeSeconds: rand(1000000, 8000000),

    metrics: {
      cpu: {
        current: cpuBase,
        trend: sparkline(cpuBase, 12),
        status: cpuBase > 80 ? "critical" : cpuBase > 60 ? "warning" : "normal",
        unit: "%",
      },
      memory: {
        current: memBase,
        trend: sparkline(memBase, 8),
        status: memBase > 90 ? "critical" : memBase > 80 ? "warning" : "normal",
        unit: "%",
      },
      disk: {
        current: diskBase,
        trend: sparkline(diskBase, 3),
        status: diskBase > 90 ? "critical" : diskBase > 80 ? "warning" : "normal",
        unit: "%",
      },
      activeUsers: {
        current: rand(120, 580),
        trend: sparkline(rand(200, 400), 80),
        status: "normal" as const,
        unit: "명",
      },
      apiLatency: {
        current: rand(85, 320),
        trend: sparkline(rand(120, 250), 60),
        status: rand(85, 320) > 500 ? "critical" : rand(85, 320) > 300 ? "warning" : "normal",
        unit: "ms",
      },
      errorRate: {
        current: rand(0.01, 2.5, 2),
        trend: sparkline(rand(0.5, 1.5), 0.8),
        status: rand(0.01, 2.5, 2) > 5 ? "critical" : rand(0.01, 2.5, 2) > 2 ? "warning" : "normal",
        unit: "%",
      },
    },

    database: {
      poolSize: 20,
      activeConnections: rand(5, 18),
      idleConnections: rand(2, 10),
      waitingQueries: rand(0, 3),
      avgQueryTime: rand(3, 45, 1),
    },

    endpoints: generateEndpointHealth(),
    errors: generateErrorLogs(50),
  }

  return NextResponse.json(data)
}
