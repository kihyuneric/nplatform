'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const ALERT_KEY = 'news_keyword_alerts';

interface Alert {
  keyword: string;
  createdAt: string;
  active: boolean;
}

function loadAlerts(): Alert[] {
  try { return JSON.parse(localStorage.getItem(ALERT_KEY) ?? '[]'); } catch { return []; }
}
function saveAlerts(alerts: Alert[]) {
  localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
}

export function KeywordAlertModal() {
  const [open, setOpen]       = useState(false);
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [input, setInput]     = useState('');

  useEffect(() => { if (open) setAlerts(loadAlerts()); }, [open]);

  const add = () => {
    const kw = input.trim();
    if (!kw) return;
    if (alerts.some((a) => a.keyword === kw)) {
      toast.error('이미 등록된 키워드입니다.');
      return;
    }
    const next = [...alerts, { keyword: kw, createdAt: new Date().toLocaleDateString('ko-KR'), active: true }];
    saveAlerts(next);
    setAlerts(next);
    setInput('');
    toast.success(`"${kw}" 키워드 알림이 등록되었습니다.`);
  };

  const toggle = (kw: string) => {
    const next = alerts.map((a) =>
      a.keyword === kw ? { ...a, active: !a.active } : a
    );
    saveAlerts(next);
    setAlerts(next);
  };

  const remove = (kw: string) => {
    const next = alerts.filter((a) => a.keyword !== kw);
    saveAlerts(next);
    setAlerts(next);
    toast.info(`"${kw}" 알림이 삭제되었습니다.`);
  };

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Bell className="h-3.5 w-3.5" />
          알림 설정
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-blue-600" />
            키워드 알림 구독
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          관심 키워드를 등록하면 뉴스 업데이트 시 알림을 받을 수 있습니다.
        </p>

        {/* 입력 */}
        <div className="flex gap-2">
          <Input
            placeholder="키워드 입력 (예: 아파트, 재건축)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="h-9"
          />
          <Button onClick={add} size="sm" className="gap-1 px-3">
            <Plus className="h-3.5 w-3.5" />
            추가
          </Button>
        </div>

        {/* 알림 목록 */}
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            등록된 알림 키워드가 없습니다.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {alerts.map((a) => (
              <div
                key={a.keyword}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-card"
              >
                <button
                  onClick={() => toggle(a.keyword)}
                  aria-label={a.active ? `"${a.keyword}" 알림 끄기` : `"${a.keyword}" 알림 켜기`}
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none ${
                    a.active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {a.active ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </button>
                <span className={`flex-1 text-sm font-medium ${a.active ? '' : 'text-muted-foreground line-through'}`}>
                  {a.keyword}
                </span>
                <span className="text-[10px] text-muted-foreground">{a.createdAt}</span>
                <button
                  onClick={() => remove(a.keyword)}
                  aria-label={`"${a.keyword}" 알림 삭제`}
                  className="text-muted-foreground hover:text-destructive transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>총 {alerts.length}개 키워드 · 활성 {activeCount}개</span>
            <Badge variant="secondary" className="text-[10px]">
              <Check className="h-2.5 w-2.5 mr-1" />
              실시간 모니터링
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
