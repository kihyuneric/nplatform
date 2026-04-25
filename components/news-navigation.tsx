'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Clock, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const navItems = [
  { href: '/news',       label: '뉴스 검색' },
  { href: '/psychology', label: '심리지수'  },
];

export function NewsNavigation() {
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      setTime(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 업데이트`
      );
    };
    fmt();
    const id = setInterval(fmt, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-[var(--color-surface-elevated)] shadow-sm sticky top-0 z-40">
      <div className="container flex items-center justify-between h-14 gap-4">
        {/* 로고 */}
        <Link href="/news" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <span className="font-bold text-base text-[var(--color-text-primary)]">부동산 뉴스</span>
        </Link>

        {/* 타임스탬프 (md 이상에서만 표시) */}
        {time && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {time}
          </span>
        )}

        {/* 네비게이션 */}
        <nav className="flex items-center gap-5">
          {navItems.map((item) => {
            const isActive = (pathname ?? '').startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none rounded ${
                  isActive ? 'text-stone-900' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {/* 다크모드 토글 */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="다크모드 토글"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>

      {/* 그라데이션 하단 보더 */}
      <div className="h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />
    </header>
  );
}
