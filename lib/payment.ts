export interface PaymentConfig {
  provider: 'toss' | 'inicis' | 'kakaopay' | 'none'
  clientKey: string
  secretKey: string
  isTestMode: boolean
}

export interface PaymentRequest {
  orderId: string
  orderName: string
  amount: number
  customerName: string
  customerEmail?: string
  successUrl: string
  failUrl: string
}

export interface PaymentResult {
  success: boolean
  paymentKey?: string
  orderId: string
  amount: number
  method?: string
  error?: string
}

export function getPaymentConfig(): PaymentConfig {
  return {
    provider: (process.env.PAYMENT_PROVIDER as PaymentConfig['provider']) || 'none',
    clientKey: process.env.PAYMENT_CLIENT_KEY || '',
    secretKey: process.env.PAYMENT_SECRET_KEY || '',
    isTestMode: process.env.PAYMENT_TEST_MODE === 'true' || true,
  }
}

// Generate unique order ID
export function generateOrderId(prefix: string = 'NPL'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}

// Payment URLs
export function getPaymentUrls(baseUrl: string) {
  return {
    successUrl: `${baseUrl}/payment/success`,
    failUrl: `${baseUrl}/payment/fail`,
  }
}

// Verify payment with PG provider (stub)
export async function verifyPayment(
  config: PaymentConfig,
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<PaymentResult> {
  if (config.provider === 'none') {
    // Mock verification
    return {
      success: true,
      paymentKey,
      orderId,
      amount,
      method: 'mock',
    }
  }

  if (config.provider === 'toss') {
    // Toss Payments confirmation API
    try {
      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, orderId, amount, error: data.message || 'Payment verification failed' }
      }
      return {
        success: true,
        paymentKey: data.paymentKey,
        orderId: data.orderId,
        amount: data.totalAmount,
        method: data.method,
      }
    } catch (error) {
      return { success: false, orderId, amount, error: String(error) }
    }
  }

  // Other providers: return mock for now
  return {
    success: true,
    paymentKey,
    orderId,
    amount,
    method: config.provider,
  }
}
