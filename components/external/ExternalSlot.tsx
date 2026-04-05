'use client';

import { useEffect, useRef, useState } from 'react';
import { EXTERNAL_SLOTS, type ExternalSlotConfig } from '@/lib/external-slots';

interface ExternalSlotProps {
  slotId: string;
  className?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export default function ExternalSlot({
  slotId,
  className = '',
  fallbackTitle,
  fallbackDescription,
}: ExternalSlotProps) {
  const config = EXTERNAL_SLOTS[slotId] ?? null;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [apiData, setApiData] = useState<unknown>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const label = fallbackTitle ?? config?.label ?? '외부 연동';
  const description = fallbackDescription ?? config?.description ?? '';

  // Widget type: set up postMessage listener
  useEffect(() => {
    if (!config?.enabled || !config.url || config.type !== 'widget') return;

    const handler = (event: MessageEvent) => {
      if (iframeRef.current?.contentWindow === event.source) {
        console.log(`[ExternalSlot:${config.id}] 메시지 수신:`, event.data);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [config]);

  // API type: fetch data with refresh interval
  useEffect(() => {
    if (!config?.enabled || !config.url || config.type !== 'api') return;

    const fetchData = async () => {
      setApiLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        const res = await fetch(config.url, { headers });
        const json = await res.json();
        setApiData(json);
      } catch (err) {
        console.error(`[ExternalSlot:${config.id}] API 오류:`, err);
      } finally {
        setApiLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval);
    return () => clearInterval(interval);
  }, [config]);

  if (!config) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center ${className}`}>
        <p className="text-sm text-gray-500">알 수 없는 슬롯: {slotId}</p>
      </div>
    );
  }

  // Active slot rendering
  if (config.enabled && config.url) {
    if (config.type === 'iframe') {
      return (
        <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`} data-slot={config.id}>
          <iframe
            ref={iframeRef}
            src={config.url}
            title={config.label}
            width="100%"
            height={config.height}
            sandbox="allow-scripts allow-same-origin allow-popups"
            loading="lazy"
            className="border-0"
          />
        </div>
      );
    }

    if (config.type === 'widget') {
      return (
        <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`} data-slot={config.id}>
          <iframe
            ref={iframeRef}
            src={config.url}
            title={config.label}
            width="100%"
            height={config.height}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            className="border-0"
          />
        </div>
      );
    }

    if (config.type === 'api') {
      return (
        <div
          className={`rounded-lg border border-gray-200 p-4 ${className}`}
          style={{ minHeight: config.height }}
          data-slot={config.id}
        >
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{config.label}</h3>
          {apiLoading && <p className="text-xs text-gray-400">데이터 로딩 중...</p>}
          {!apiLoading && apiData !== null && (
            <pre className="max-h-80 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          )}
        </div>
      );
    }
  }

  // Placeholder for disabled or unconfigured slots
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center ${className}`}
      style={{ minHeight: config.height }}
      data-slot={config.id}
    >
      <div className="mb-2 text-2xl text-gray-300">&#9645;</div>
      <h3 className="mb-1 text-sm font-semibold text-gray-600">{label}</h3>
      <p className="mb-3 text-xs text-gray-400">{description}</p>
      <p className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
        관리자 설정에서 연동 URL을 등록하세요
      </p>
    </div>
  );
}
