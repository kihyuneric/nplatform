'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown'
  className?: string
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn('w-9 h-9', className)}>
        <span className="sr-only">테마 로딩 중</span>
      </Button>
    )
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'w-9 h-9 relative overflow-hidden',
          'hover:bg-accent hover:text-accent-foreground',
          className
        )}
        aria-label={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {resolvedTheme === 'dark' ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="h-4 w-4 text-yellow-400" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('w-9 h-9 relative', className)}
          aria-label="테마 선택"
        >
          <AnimatePresence mode="wait" initial={false}>
            {resolvedTheme === 'dark' ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Sun className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Moon className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn('gap-2 cursor-pointer', theme === 'light' && 'bg-accent')}
        >
          <Sun className="h-4 w-4 text-yellow-500" />
          <span>라이트</span>
          {theme === 'light' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn('gap-2 cursor-pointer', theme === 'dark' && 'bg-accent')}
        >
          <Moon className="h-4 w-4 text-slate-400" />
          <span>다크</span>
          {theme === 'dark' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn('gap-2 cursor-pointer', theme === 'system' && 'bg-accent')}
        >
          <Monitor className="h-4 w-4 text-blue-500" />
          <span>시스템</span>
          {theme === 'system' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
