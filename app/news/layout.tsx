import { NewsProvider } from '@/contexts/news-context';
import { NewsNavigation } from '@/components/news-navigation';
import { NewsTicker } from '@/components/news-ticker';

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <NewsNavigation />
        <NewsTicker />
        <main>{children}</main>
      </div>
    </NewsProvider>
  );
}
