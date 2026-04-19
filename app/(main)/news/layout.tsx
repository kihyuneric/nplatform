import { NewsProvider } from '@/contexts/news-context';
import { CommunityTabs } from '@/components/community/community-tabs';
import { NewsBreadcrumb } from './news-breadcrumb';

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <CommunityTabs />
      <NewsBreadcrumb />
      {children}
    </NewsProvider>
  );
}
