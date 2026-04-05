// External integration slot configuration
// These slots allow external solutions (news feed, psychology index, market stats, keyword trends)
// to be embedded into the NPLatform via iframe, API, or widget integration.

export type SlotType = 'iframe' | 'api' | 'widget';

export interface ExternalSlotConfig {
  id: string;
  type: SlotType;
  label: string;
  description: string;
  url: string;
  apiKey: string;
  height: number;
  refreshInterval: number;
  enabled: boolean;
}

export const EXTERNAL_SLOTS: Record<string, ExternalSlotConfig> = {
  NEWS_FEED: {
    id: 'news-feed',
    type: 'iframe',
    label: '부동산 뉴스',
    description: '부동산 및 NPL 관련 최신 뉴스 피드',
    url: '',
    apiKey: '',
    height: 400,
    refreshInterval: 300000,
    enabled: false,
  },
  PSYCHOLOGY_INDEX: {
    id: 'psychology-index',
    type: 'widget',
    label: '시장 심리지수',
    description: '부동산 시장 심리지수 위젯',
    url: '',
    apiKey: '',
    height: 300,
    refreshInterval: 3600000,
    enabled: false,
  },
  MARKET_STATS: {
    id: 'market-stats',
    type: 'api',
    label: '시장 통계',
    description: '경매/NPL 시장 통계 데이터',
    url: '',
    apiKey: '',
    height: 500,
    refreshInterval: 3600000,
    enabled: false,
  },
  KEYWORD_TREND: {
    id: 'keyword-trend',
    type: 'iframe',
    label: '키워드 트렌드',
    description: '부동산 키워드 트렌드 분석',
    url: '',
    apiKey: '',
    height: 350,
    refreshInterval: 600000,
    enabled: false,
  },
};

export function getSlotConfig(slotId: string): ExternalSlotConfig | null {
  return EXTERNAL_SLOTS[slotId] ?? null;
}
