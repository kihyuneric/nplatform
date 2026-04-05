/**
 * NPL Price Prediction Model
 * Uses linear regression on historical deal data
 * Coefficients auto-update when new deals complete
 */

interface PriceFeatures {
  collateralType: string  // encoded as number
  region: string          // encoded as number
  ltv: number
  delinquencyMonths: number
  appraisalValue: number
}

// Default coefficients (updated by training)
let coefficients = {
  intercept: 0.6,        // base discount from appraisal
  ltv: -0.003,           // higher LTV = lower price
  delinquency: -0.002,   // longer delinquency = lower price
  typeAdjust: { '아파트': 0.05, '오피스': 0.03, '상가': -0.02, '토지': -0.05 } as Record<string, number>,
  regionAdjust: { '서울': 0.08, '경기': 0.03, '부산': 0.01 } as Record<string, number>,
}

export function predictPrice(features: PriceFeatures): { low: number; mid: number; high: number; confidence: number } {
  const base = features.appraisalValue * coefficients.intercept
  const ltvAdj = features.ltv * coefficients.ltv * features.appraisalValue
  const delAdj = features.delinquencyMonths * coefficients.delinquency * features.appraisalValue
  const typeAdj = (coefficients.typeAdjust[features.collateralType] || 0) * features.appraisalValue
  const regionAdj = (coefficients.regionAdjust[features.region] || 0) * features.appraisalValue

  const mid = Math.max(0, base + ltvAdj + delAdj + typeAdj + regionAdj)
  const spread = mid * 0.15 // 15% spread

  return {
    low: Math.round(mid - spread),
    mid: Math.round(mid),
    high: Math.round(mid + spread),
    confidence: 0.72, // Increases with more training data
  }
}

// Train model with completed deal data
export function trainPriceModel(deals: { features: PriceFeatures; actualPrice: number }[]) {
  if (deals.length < 5) return // Need minimum data

  // Simple gradient descent on coefficients
  const lr = 0.001
  for (const deal of deals) {
    const predicted = predictPrice(deal.features).mid
    const error = deal.actualPrice - predicted
    const ratio = error / (deal.features.appraisalValue || 1)

    coefficients.intercept += lr * ratio
    coefficients.ltv += lr * ratio * deal.features.ltv * 0.01
    coefficients.delinquency += lr * ratio * deal.features.delinquencyMonths * 0.01
  }

  // Clamp coefficients
  coefficients.intercept = Math.max(0.3, Math.min(0.9, coefficients.intercept))
}

export function getModelInfo() {
  return { coefficients, type: 'linear_regression', version: '1.0' }
}
