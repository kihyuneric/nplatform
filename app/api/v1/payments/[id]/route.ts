import { NextRequest, NextResponse } from "next/server";

interface PaymentReceipt {
  payment_id: string;
  amount: number;
  method: string;
  status: "완료" | "취소" | "환불";
  plan: string;
  plan_name: string;
  created_at: string;
  receipt: {
    merchant_name: string;
    merchant_id: string;
    tax_amount: number;
    supply_amount: number;
    card_info?: {
      card_company: string;
      card_number: string;
      installment: number;
    };
    bank_info?: {
      bank_name: string;
      account_number: string;
    };
  };
}

const mockReceipts: Record<string, PaymentReceipt> = {
  "PAY-20260301-001": {
    payment_id: "PAY-20260301-001",
    amount: 99000,
    method: "카드결제",
    status: "완료",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2026-03-01T09:30:00Z",
    receipt: {
      merchant_name: "NPLatform",
      merchant_id: "MID-NPL-001",
      tax_amount: 9000,
      supply_amount: 90000,
      card_info: {
        card_company: "신한카드",
        card_number: "****-****-****-1234",
        installment: 0,
      },
    },
  },
  "PAY-20260201-001": {
    payment_id: "PAY-20260201-001",
    amount: 99000,
    method: "카카오페이",
    status: "완료",
    plan: "pro",
    plan_name: "Pro",
    created_at: "2026-02-01T09:30:00Z",
    receipt: {
      merchant_name: "NPLatform",
      merchant_id: "MID-NPL-001",
      tax_amount: 9000,
      supply_amount: 90000,
    },
  },
  "PAY-20260101-001": {
    payment_id: "PAY-20260101-001",
    amount: 299000,
    method: "계좌이체",
    status: "환불",
    plan: "enterprise",
    plan_name: "Enterprise",
    created_at: "2026-01-01T10:00:00Z",
    receipt: {
      merchant_name: "NPLatform",
      merchant_id: "MID-NPL-001",
      tax_amount: 27182,
      supply_amount: 271818,
      bank_info: {
        bank_name: "국민은행",
        account_number: "***-**-****-***",
      },
    },
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const receipt = mockReceipts[id];

  if (!receipt) {
    return NextResponse.json(
      { success: false, error: "결제 내역을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: receipt,
  });
}
