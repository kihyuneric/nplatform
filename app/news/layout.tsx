import { NewsProvider } from '@/contexts/news-context';
import { CommunityTabs } from '@/components/community/community-tabs';

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <CommunityTabs />
      <main>{children}</main>
    </NewsProvider>
  );
}
