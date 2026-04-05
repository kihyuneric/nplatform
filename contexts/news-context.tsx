'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NewsContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedWeekStartDate: string;
  setSelectedWeekStartDate: (date: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });

  return (
    <NewsContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        selectedWeekStartDate,
        setSelectedWeekStartDate,
      }}
    >
      {children}
    </NewsContext.Provider>
  );
}

export function useNewsContext() {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNewsContext must be used within a NewsProvider');
  }
  return context;
}

// Alias for components that use useNews
export const useNews = useNewsContext;
