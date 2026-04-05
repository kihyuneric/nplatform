'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsRow {
  pubdate: string;
  total: number;
  up: number;
  down: number;
  neutral: number;
}

function AnimatedValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.floor(value / 20));
    const interval = setInterval(() => {
      current += step;
      if (current >= value) {
        current = value;
        clearInterval(interval);
      }
      setDisplay(current);
    }, 30);
    return () => clearInterval(interval);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

export function EnhancedStatsOverview() {
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const res = await fetch(`/api/news-stats?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const current = stats[0] || { total: 0, up: 0, down: 0, neutral: 0 };
  const previous = stats[1] || { total: 0, up: 0, down: 0, neutral: 0 };

  const statCards = [
    {
      label: '전체 뉴스',
      value: current.total,
      change: current.total - previous.total,
      icon: FileText,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: '상승 전망',
      value: current.up,
      change: current.up - previous.up,
      icon: TrendingUp,
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: '하락 전망',
      value: current.down,
      change: current.down - previous.down,
      icon: TrendingDown,
      borderColor: 'border-l-red-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: '중립 전망',
      value: current.neutral,
      change: current.neutral - previous.neutral,
      icon: Minus,
      borderColor: 'border-l-gray-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className={`border-l-4 ${stat.borderColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    <AnimatedValue value={stat.value} />
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      stat.change > 0
                        ? 'text-emerald-600'
                        : stat.change < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {stat.change > 0 ? '+' : ''}
                    {stat.change} 전일 대비
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.iconBg}`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default EnhancedStatsOverview;
