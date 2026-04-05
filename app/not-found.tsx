'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center px-4">
        <div className="mb-6">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
            <circle cx="60" cy="60" r="56" fill="#F0F9FF" stroke="#93C5FD" strokeWidth="2" />
            <text x="60" y="68" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#1B3A5C">404</text>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#1B3A5C] text-white rounded-lg hover:bg-[#2E75B6] transition-colors"
          >
            홈으로 이동
          </Link>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    </div>
  )
}
