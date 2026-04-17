/**
 * Self-hosted Swagger UI at /docs/api.
 * Pulls the OpenAPI spec from /api/openapi and renders via CDN Swagger UI 5.x.
 * No npm dependency needed.
 */

export const metadata = {
  title: "API 문서 | NPLatform",
  description: "NPLatform REST API v1 OpenAPI documentation",
}

export default function ApiDocsPage() {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NPLatform API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafbfc; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { color: #0D1F38; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
        showExtensions: true,
        showCommonExtensions: true,
        requestInterceptor: (req) => {
          // Allow browser try-it-out against same-origin dev server
          req.credentials = "include";
          return req;
        },
      });
    }
  </script>
</body>
</html>`

  return (
    <div
      className="min-h-screen bg-[var(--color-surface-base)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
