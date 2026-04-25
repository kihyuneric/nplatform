"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditBalanceProps {
  className?: string;
  compact?: boolean;
}

export function CreditBalance({ className = "", compact = false }: CreditBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/v1/billing/credits/purchase");
        const json = await res.json();
        setBalance(json.data?.balance ?? 0);
      } catch {
        setBalance(0);
      }
    }
    fetchBalance();
  }, []);

  if (compact) {
    return (
      <Link
        href="/settings/payment"
        className={`inline-flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity ${className}`}
      >
        <Coins className="h-4 w-4 text-stone-900" />
        <span className="font-semibold text-stone-900">
          {balance === null ? "..." : balance.toLocaleString()}
        </span>
      </Link>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100/10 border border-stone-300/20 ${className}`}
    >
      <Coins className="h-4 w-4 text-stone-900" />
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">
        크레딧
      </span>
      <span className="text-sm font-bold text-stone-900">
        {balance === null ? "..." : balance.toLocaleString()}
      </span>
      <Link href="/settings/payment">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" />
          충전
        </Button>
      </Link>
    </div>
  );
}
