'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ExternalLink, Bookmark, BookmarkCheck, MessageSquare,
  Calendar, MapPin, Building, TrendingUp, TrendingDown, Minus,
  Edit3, Trash2, FolderPlus, Download,
} from 'lucide-react';
import type { FilterState } from './news-filters';
import type { DummyArticle } from '@/lib/dummy-data';
import { getDummyArticleById } from '@/lib/dummy-data';

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  provider: string;
  url?: string;
  news_link?: string;
  published_at?: string;
  pubdate?: string;
  sido?: string;
  sigungu?: string;
  direction?: string;
  topic?: string;
  keywords?: string[];
}

interface ScrapItem { newsId: number; memo: string; folder: string; }

const DIR_MAP: Record<string, { icon: typeof TrendingUp; text: string; color: string; border: string }> = {
  상승: { icon: TrendingUp,  text: '상승', color: 'bg-stone-100/15 text-stone-900', border: 'border-l-emerald-400' },
  하락: { icon: TrendingDown, text: '하락', color: 'bg-stone-100/15 text-stone-900',       border: 'border-l-red-400'     },
  중립: { icon: Minus,        text: '중립', color: 'bg-slate-500/15 text-[var(--color-text-secondary)]',      border: 'border-l-gray-300'    },
};

interface Props {
  filters?: FilterState;
  appliedAt?: number; // filters가 적용된 timestamp (변경 감지용)
  onArticleClick?: (article: DummyArticle) => void;
}

export default function NewsList({ filters, appliedAt, onArticleClick }: Props) {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [totalCount, setTotal]    = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [scraps, setScraps]       = useState<ScrapItem[]>([]);
  const [editingMemo, setEditing] = useState<number | null>(null);
  const [memoText, setMemoText]   = useState('');
  const [folders, setFolders]     = useState(['기본']);
  const [assigningFolder, setAssigning] = useState<number | null>(null);

  const LIMIT = 10;
  const totalPages = Math.ceil(totalCount / LIMIT);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', String(LIMIT));
    params.set('offset', String((page - 1) * LIMIT));
    if (filters?.keyword)                     params.set('keyword',   filters.keyword);
    if (filters?.sido && filters.sido !== '전국') params.set('sido', filters.sido);
    if (filters?.provider && filters.provider !== '전체') params.set('provider', filters.provider);
    if (filters?.direction && filters.direction !== '전체') params.set('direction', filters.direction);
    if (filters?.period && filters.period !== 'all') params.set('period', filters.period);
    if (filters?.date)                        params.set('date',      filters.date);
    return `/api/news-search?${params.toString()}`;
  }, [filters, page]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      if (res.ok) {
        const data = await res.json();
        setNews(data.list ?? []);
        setTotal(data.total_count ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // 필터 적용 시 page 리셋
  useEffect(() => { setPage(1); }, [appliedAt]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  /* ── scrap helpers ── */
  const isScraped = (id: number) => scraps.some((s) => s.newsId === id);
  const getScrap  = (id: number) => scraps.find((s) => s.newsId === id);
  const toggleScrap = (id: number) =>
    setScraps(isScraped(id)
      ? scraps.filter((s) => s.newsId !== id)
      : [...scraps, { newsId: id, memo: '', folder: '기본' }]);
  const saveMemo = (id: number) => {
    setScraps(scraps.map((s) => s.newsId === id ? { ...s, memo: memoText } : s));
    setEditing(null); setMemoText('');
  };
  const deleteMemo  = (id: number) =>
    setScraps(scraps.map((s) => s.newsId === id ? { ...s, memo: '' } : s));
  const assignFolder = (id: number, folder: string) => {
    setScraps(scraps.map((s) => s.newsId === id ? { ...s, folder } : s));
    setAssigning(null);
  };

  /* ── pagination helpers ── */
  const pageNums = () => {
    const nums: number[] = [];
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i);
    return nums;
  };

  /* ── render ── */
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-5 h-28" />
        </Card>
      ))}
    </div>
  );

  if (news.length === 0) return (
    <Card>
      <CardContent className="p-12 text-center text-muted-foreground text-sm">
        검색 결과가 없습니다. 필터를 조정해 보세요.
      </CardContent>
    </Card>
  );

  const exportCSV = () => {
    const header = ['제목', '언론사', '지역', '전망', '날짜', '링크'];
    const rows = news.map((n) => [
      `"${(n.title ?? '').replace(/"/g, '""')}"`,
      n.provider ?? '',
      n.sido ?? '',
      n.direction ?? '',
      (n.published_at || n.pubdate || '').split('T')[0],
      n.news_link || n.url || '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `부동산뉴스_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>건
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={exportCSV}>
          <Download className="h-3 w-3" />
          CSV 다운로드
        </Button>
      </div>

      {news.map((item) => {
        const dir     = DIR_MAP[item.direction ?? ''] ?? DIR_MAP['중립'];
        const DirIcon = dir.icon;
        const scraped = isScraped(item.id);
        const scrap   = getScrap(item.id);
        const pubdate = (item.published_at || item.pubdate || '').split('T')[0];
        const link    = item.news_link || item.url || '';

        const handleCardClick = () => {
          if (!onArticleClick) return;
          const dummy = getDummyArticleById(item.id);
          if (dummy) onArticleClick(dummy);
        };

        return (
          <Card
            key={item.id}
            className={`border-l-4 ${dir.border} transition-shadow hover:shadow-md ${onArticleClick ? 'cursor-pointer' : ''}`}
            onClick={handleCardClick}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 제목 */}
                  <h3 className="font-semibold text-[15px] leading-snug mb-1.5 line-clamp-2">
                    {item.title}
                  </h3>

                  {/* 요약 */}
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}

                  {/* 메타 */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={`${dir.color} gap-1 text-[11px]`} variant="secondary">
                      <DirIcon className="h-2.5 w-2.5" />
                      {dir.text}
                    </Badge>
                    {pubdate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{pubdate}
                      </span>
                    )}
                    {item.provider && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />{item.provider}
                      </span>
                    )}
                    {(item.sido || item.sigungu) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[item.sido, item.sigungu].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>

                  {/* 키워드 태그 */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-[11px] px-1.5 py-0">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 스크랩 메모 */}
                  {scraped && (
                    <div className="mt-3 space-y-2">
                      {editingMemo === item.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="메모를 입력하세요"
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveMemo(item.id)}>저장</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setMemoText(''); }}>취소</Button>
                          </div>
                        </div>
                      ) : scrap?.memo ? (
                        <div className="flex items-start gap-2 p-2.5 bg-muted/60 rounded-md">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <p className="text-xs flex-1">{scrap.memo}</p>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-5 w-5"
                              onClick={() => { setEditing(item.id); setMemoText(scrap.memo); }}>
                              <Edit3 className="h-2.5 w-2.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-stone-900">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>메모 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>이 메모를 삭제하시겠습니까?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMemo(item.id)}>삭제</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          onClick={() => { setEditing(item.id); setMemoText(''); }}>
                          <Edit3 className="h-3 w-3 mr-1" />메모 추가
                        </Button>
                      )}

                      {/* 폴더 */}
                      {assigningFolder === item.id ? (
                        <Select value={scrap?.folder || '기본'} onValueChange={(v) => assignFolder(item.id, v)}>
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {folders.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          onClick={() => setAssigning(item.id)}>
                          <FolderPlus className="h-3 w-3 mr-1" />
                          {scrap?.folder || '기본'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => toggleScrap(item.id)}
                    title={scraped ? '스크랩 해제' : '스크랩'}>
                    {scraped
                      ? <BookmarkCheck className="h-4 w-4 text-stone-900" />
                      : <Bookmark className="h-4 w-4" />}
                  </Button>
                  {link && (
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => window.open(link, '_blank')} title="원문 보기">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            이전
          </Button>
          {pageNums().map((p) => (
            <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
              onClick={() => setPage(p)} className="w-9">
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
