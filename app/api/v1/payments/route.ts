import { NextRequest, NextResponse } from "next/server";

interface Payment {
  payment_id: string;
  amount: number;
  method: string;
  status: "완료" | "취소" | "환불";
  plan: string;
  plan_name: string;
  created_at: string;
}

const mockPayments: Payment[] = [
  {
    payment_id: "PAY-20260301-001",
    amount: 99000,
    method: "카드결제",
    status: "완료",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2026-03-01T09:30:00Z",
  },
  {
    payment_id: "PAY-20260201-001",
    amount: 99000,
    method: "카카오페이",
    status: "완료",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2026-02-01T09:30:00Z",
  },
  {
    payment_id: "PAY-20260101-001",
    amount: 299000,
    method: "계좌이체",
    status: "환불",
    plan: "enterprise",
    plan_name: "Enterprise",
    created_at: "2026-01-01T10:00:00Z",
  },
  {
    payment_id: "PAY-20251201-001",
    amount: 99000,
    method: "카드결제",
    status: "취소",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2025-12-01T14:20:00Z",
  },
  {
    payment_id: "PAY-20251101-001",
    amount: 99000,
    method: "카드결제",
    status: "완료",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2025-11-01T11:15:00Z",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockPayments,
    total: mockPayments.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, method } = body;

    if (!plan || !method) {
      return NextResponse.json(
        { success: false, error: "플랜과 결제 수단을 선택해주세요." },
        { status: 400 }
      );
    }

    const planPrices: Record<string, number> = {
      pro: 99000,
      enterprise: 299000,
    };

    const planNames: Record<string, string> = {
      pro: "Pro",
      enterprise: "Enterprise",
    };

    if (!planPrices[plan]) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 플랜입니다." },
        { status: 400 }
      );
    }

    // Mock delay to simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const now = new Date();
    const paymentId = `PAY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;

    const payment: Payment = {
      payment_id: paymentId,
      amount: planPrices[plan],
      method,
      status: "완료",
      plan,
      plan_name: planNames[plan],
      created_at: now.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
