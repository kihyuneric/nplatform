/**
 * GET /api/docs
 *
 * Swagger UI (Swagger 5.x CDN) — NPLatform API 문서
 * 스펙 소스: GET /api/openapi (OpenAPI 3.0 JSON)
 *
 * 별도 패키지 없이 CDN으로 동작.
 */

import { NextResponse } from "next/server"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NPLatform API 문서</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; }

    /* ── Custom header ─────────────────────────────────────── */
    .npl-header {
      background: #0F172A;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .npl-logo {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .npl-logo span { color: #22C55E; }
    .npl-badge {
      background: rgba(34,197,94,.15);
      color: #22C55E;
      border: 1px solid rgba(34,197,94,.3);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      letter-spacing: .04em;
    }
    .npl-links {
      margin-left: auto;
      display: flex;
      gap: 16px;
    }
    .npl-links a {
      color: rgba(255,255,255,.6);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color .15s;
    }
    .npl-links a:hover { color: #fff; }

    /* ── Swagger UI overrides ──────────────────────────────── */
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-size: 24px !important; color: #0F172A !important; }
    .swagger-ui .info .description p { color: #475569; }
    .swagger-ui .scheme-container { background: #f8fafc; box-shadow: none; border-bottom: 1px solid #e2e8f0; }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #2563EB; }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #16A34A; }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #D97706; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #DC2626; }
    .swagger-ui .btn.execute { background: #22C55E; border-color: #22C55E; }
    .swagger-ui .btn.execute:hover { background: #16A34A; border-color: #16A34A; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 24px 16px 80px; }
  </style>
</head>
<body>
  <div class="npl-header">
    <a href="/" class="npl-logo">N<span>Platform</span></a>
    <span class="npl-badge">API v1</span>
    <div class="npl-links">
      <a href="/api/openapi" target="_blank">JSON 스펙 다운로드</a>
      <a href="https://nplatform.kr/my/developer" target="_blank">API 키 발급</a>
      <a href="/">← 홈으로</a>
    </div>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      const ui = SwaggerUIBundle({
        url: "${BASE_URL}/api/openapi",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        deepLinking: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        requestSnippetsEnabled: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        persistAuthorization: true,
      })
      window.ui = ui
    }
  </script>
</body>
</html>`

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      // Allow embedding in same-origin iframes
      "X-Frame-Options": "SAMEORIGIN",
    },
  })
}
