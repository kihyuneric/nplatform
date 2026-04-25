'use client';

// 다크모드 제거 — 라이트 단일 테마 (McKinsey White Paper)
// 이 파일은 외부 import 호환을 위해 stub 으로 유지됩니다.

import { createContext, useContext } from 'react';

type Theme = 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
