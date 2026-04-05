'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyChartItem {
  month: string
  views: number
  interests: number
  bids: number
  deals: number
}

export function SellerDashboardChart({ data }: { data: MonthlyChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="views" name="조회수" fill="#2E75B6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="interests" name="관심등록" fill="#10B981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="bids" name="입찰" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="deals" name="거래완료" fill="#1B3A5C" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
