"use client"

interface SEOProps {
  title: string
  description: string
  path: string
  image?: string
}

export function SEOHead({ title, description, path, image }: SEOProps) {
  const baseUrl = 'https://nplatform.co.kr'
  const fullTitle = `${title} | NPLatform`
  const url = `${baseUrl}${path}`
  const ogImage = image || `${baseUrl}/og-image.png`

  return (
    <>
      {/* hreflang for i18n */}
      <link rel="alternate" hrefLang="ko" href={`${baseUrl}/ko${path}`} />
      <link rel="alternate" hrefLang="en" href={`${baseUrl}/en${path}`} />
      <link rel="alternate" hrefLang="ja" href={`${baseUrl}/ja${path}`} />
      <link rel="alternate" hrefLang="x-default" href={url} />
    </>
  )
}
