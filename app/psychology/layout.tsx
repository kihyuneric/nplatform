import { NewsNavigation } from '@/components/news-navigation';

export default function PsychologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NewsNavigation />
      <main>{children}</main>
    </div>
  );
}
