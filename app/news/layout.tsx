import { NewsProvider } from '@/contexts/news-context';
import { NewsNavigation } from '@/components/news-navigation';
import { NewsTicker } from '@/components/news-ticker';

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <div className="min-h-screen bg-[var(--color-surface-base)]">
        <NewsNavigation />
        <NewsTicker />
        <main>{children}</main>
      </div>
    </NewsProvider>
  );
}
