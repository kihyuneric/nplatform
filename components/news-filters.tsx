'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Filter, Search, X, Clock } from 'lucide-react';

const HISTORY_KEY = 'news_search_history';
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(kw: string) {
  const prev = loadHistory().filter((h) => h !== kw);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([kw, ...prev].slice(0, MAX_HISTORY)));
}

export interface FilterState {
  keyword:   string;
  sido:      string;
  provider:  string;
  period:    string;
  direction: string;
  date:      string;
}

export const DEFAULT_FILTERS: FilterState = {
  keyword: '', sido: '전국', provider: '전체',
  period: 'all', direction: '전체', date: '',
};

const SIDO_OPTIONS = [
  '전국', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];
const PROVIDER_OPTIONS = [
  '전체', '한국경제', '매일경제', '머니투데이', '서울경제', '이데일리', '아시아경제', '뉴시스', '조선일보', '연합뉴스',
];
const PERIOD_OPTIONS = [
  { label: '전체', value: 'all' },
  { label: '오늘', value: 'today' },
  { label: '1주일', value: '1week' },
  { label: '1개월', value: '1month' },
  { label: '3개월', value: '3months' },
  { label: '6개월', value: '6months' },
];
const DIRECTION_OPTIONS = ['전체', '상승', '하락', '중립'];
const QUICK_KEYWORDS = ['지구지정', '착공', '분양', '입주', '재건축', '재개발', 'GTX', '신도시', '청약', '전세'];

interface Props {
  value:    FilterState;
  onChange: (next: FilterState) => void;
  onSearch: () => void;
}

export function NewsFilters({ value, onChange, onSearch }: Props) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const set = (key: keyof FilterState) => (v: string) =>
    onChange({ ...value, [key]: v });

  const handleSearch = () => {
    if (value.keyword.trim()) {
      saveHistory(value.keyword.trim());
      setHistory(loadHistory());
    }
    onSearch();
  };

  const activeCount = [
    value.keyword,
    value.sido      !== '전국' ? value.sido      : '',
    value.provider  !== '전체' ? value.provider  : '',
    value.period    !== 'all'  ? value.period    : '',
    value.direction !== '전체' ? value.direction : '',
    value.date,
  ].filter(Boolean).length;

  const handleReset = () => onChange(DEFAULT_FILTERS);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Card>
      <CardContent className="p-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">필터</h3>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-stone-100 text-white rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" /> 초기화
          </Button>
        </div>

        {/* 필터 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 키워드 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">키워드</label>
            <Input
              placeholder="검색어 입력 (Enter)"
              value={value.keyword}
              onChange={(e) => set('keyword')(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
            />
            {/* 검색 히스토리 */}
            {history.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                {history.map((h) => (
                  <Badge
                    key={h}
                    variant="secondary"
                    className="cursor-pointer text-xs px-2 py-0.5 gap-1"
                    onClick={() => { set('keyword')(h); }}
                  >
                    {h}
                    <X
                      className="h-2.5 w-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = history.filter((x) => x !== h);
                        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                        setHistory(next);
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}
            {/* 빠른 키워드 */}
            <div className="flex flex-wrap gap-1">
              {QUICK_KEYWORDS.map((kw) => (
                <Badge
                  key={kw}
                  variant={value.keyword === kw ? 'default' : 'outline'}
                  className="cursor-pointer text-xs px-2 py-0.5"
                  onClick={() => { set('keyword')(kw); }}
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>

          {/* 지역 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">지역</label>
            <Select value={value.sido} onValueChange={set('sido')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIDO_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 언론사 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">언론사</label>
            <Select value={value.provider} onValueChange={set('provider')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 기간 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">기간</label>
            <Select value={value.period} onValueChange={set('period')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 전망 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">전망</label>
            <Select value={value.direction} onValueChange={set('direction')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 날짜 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">날짜</label>
            <Input
              type="date"
              value={value.date}
              onChange={(e) => set('date')(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* 검색 버튼 */}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSearch} className="gap-2">
            <Search className="h-4 w-4" />
            검색
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
