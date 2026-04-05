"use client";

import { useRouter } from "next/navigation";
import { Coins, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditInsufficientModalProps {
  open: boolean;
  onClose: () => void;
  required: number;
  current: number;
}

export function CreditInsufficientModal({
  open,
  onClose,
  required,
  current,
}: CreditInsufficientModalProps) {
  const router = useRouter();
  const shortfall = required - current;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full mx-4 p-6 space-y-5 animate-in fade-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            크레딧이 부족합니다
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            이 기능을 사용하려면 크레딧을 충전해주세요
          </p>
        </div>

        {/* Credit info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">필요 크레딧</span>
            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              <Coins className="h-4 w-4 text-amber-500" />
              {required}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">현재 잔액</span>
            <span className="font-semibold text-red-500 flex items-center gap-1">
              <Coins className="h-4 w-4" />
              {current}
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">부족분</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {shortfall}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 dark:bg-[#10B981] dark:hover:bg-[#10B981]/90 text-white"
            onClick={() => {
              onClose();
              router.push("/settings/payment");
            }}
          >
            <Coins className="h-4 w-4 mr-2" />
            크레딧 충전
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
