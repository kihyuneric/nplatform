interface ListingStructuredDataProps {
  name: string
  description: string
  price?: number
  location: string
  collateralType: string
}

export function ListingStructuredData({ name, description, price, location, collateralType }: ListingStructuredDataProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "category": `NPL - ${collateralType}`,
    "offers": price ? {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "KRW",
      "availability": "https://schema.org/InStock",
    } : undefined,
    "areaServed": {
      "@type": "Place",
      "name": location,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function FAQStructuredData({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": { "@type": "Answer", "text": faq.answer },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "NPLatform",
    "url": "https://nplatform.co.kr",
    "description": "AI 기반 부실채권(NPL) 투자 분석 및 거래 플랫폼",
    "areaServed": ["KR", "JP"],
    "availableLanguage": ["ko", "en", "ja"],
    "serviceType": "Non-Performing Loan Trading Platform",
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
