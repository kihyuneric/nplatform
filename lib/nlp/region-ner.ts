// ─────────────────────────────────────────────
//  NLP – Region NER (사전 기반)
//  Claude API 없이 한국 행정구역 사전으로 추출
// ─────────────────────────────────────────────
import type { RegionEntity } from './types';

// ── 시도 목록 ──────────────────────────────────
const SIDO_LIST = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  // 확장 표기
  '서울특별시', '경기도', '인천광역시', '부산광역시', '대구광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '강원특별자치도', '충청북도', '충청남도', '전라북도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도',
];

// ── 시도 정규화 맵 ──────────────────────────────
const SIDO_NORMALIZE: Record<string, string> = {
  '서울특별시': '서울', '경기도': '경기', '인천광역시': '인천',
  '부산광역시': '부산', '대구광역시': '대구', '광주광역시': '광주',
  '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전라남도': '전남', '경상북도': '경북',
  '경상남도': '경남', '제주특별자치도': '제주',
};

// ── 주요 시군구 사전 (시도 → 시군구[]) ──────────
const SIGUNGU_DICT: Record<string, string[]> = {
  서울: [
    '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
    '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
    '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
    '은평구', '종로구', '중구', '중랑구',
    // 주요 동/지역
    '압구정', '청담', '대치', '개포', '목동', '상암', '망원', '홍대',
    '여의도', '이태원', '한남', '성수', '왕십리', '잠실', '문정',
  ],
  경기: [
    '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시',
    '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시',
    '광주시', '김포시', '광명시', '군포시', '하남시', '오산시', '이천시',
    '양주시', '구리시', '안성시', '포천시', '의왕시', '여주시', '동두천시',
    // 주요 지구
    '분당', '판교', '일산', '동탄', '광교', '위례', '미사', '별내',
    '다산', '운정', '검단',
  ],
  인천: [
    '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '동구', '강화군',
    '송도', '청라', '영종', '검단',
  ],
  부산: [
    '해운대구', '수영구', '남구', '동래구', '연제구', '부산진구', '사하구',
    '사상구', '북구', '강서구', '기장군', '서구', '동구', '중구', '영도구',
    '센텀', '마린시티',
  ],
  대구: ['수성구', '달서구', '북구', '동구', '서구', '남구', '중구', '달성군'],
  광주: ['광산구', '서구', '북구', '동구', '남구'],
  대전: ['유성구', '서구', '중구', '동구', '대덕구'],
  울산: ['남구', '북구', '동구', '중구', '울주군'],
  세종: ['세종시'],
  충북: ['청주시', '충주시', '제천시', '음성군', '진천군', '증평군'],
  충남: ['천안시', '아산시', '서산시', '당진시', '홍성군', '보령시'],
  전북: ['전주시', '익산시', '군산시', '정읍시', '남원시', '완주군'],
  전남: ['순천시', '여수시', '광양시', '목포시', '나주시', '해남군'],
  경북: ['포항시', '구미시', '경주시', '안동시', '김천시', '영주시'],
  경남: ['창원시', '김해시', '진주시', '양산시', '거제시', '통영시'],
  제주: ['제주시', '서귀포시'],
};

// 역방향 인덱스: 시군구 → 시도
const SIGUNGU_TO_SIDO: Record<string, string> = {};
for (const [sido, list] of Object.entries(SIGUNGU_DICT)) {
  for (const sg of list) SIGUNGU_TO_SIDO[sg] = sido;
}

// ── 주요 택지지구·신도시 매핑 ──────────────────
const SPECIAL_AREA: Record<string, { sido: string; sigungu: string }> = {
  강남: { sido: '서울', sigungu: '강남구' },
  서초: { sido: '서울', sigungu: '서초구' },
  송파: { sido: '서울', sigungu: '송파구' },
  분당: { sido: '경기', sigungu: '성남시 분당구' },
  판교: { sido: '경기', sigungu: '성남시 분당구' },
  일산: { sido: '경기', sigungu: '고양시' },
  동탄: { sido: '경기', sigungu: '화성시' },
  위례: { sido: '경기', sigungu: '성남시' },
  광교: { sido: '경기', sigungu: '수원시' },
  미사: { sido: '경기', sigungu: '하남시' },
  검단: { sido: '인천', sigungu: '서구' },
  송도: { sido: '인천', sigungu: '연수구' },
  청라: { sido: '인천', sigungu: '서구' },
};

// ── 메인 추출 함수 ────────────────────────────

export function extractRegions(text: string): RegionEntity[] {
  const found: RegionEntity[] = [];
  const seen = new Set<string>();

  const addRegion = (entity: RegionEntity) => {
    const key = `${entity.sido}|${entity.sigungu ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      found.push(entity);
    }
  };

  // 1. 특수 지구 매칭
  for (const [name, info] of Object.entries(SPECIAL_AREA)) {
    if (text.includes(name)) {
      addRegion({ sido: info.sido, sigungu: info.sigungu, raw: name });
    }
  }

  // 2. 시군구 매칭
  for (const [sg, sido] of Object.entries(SIGUNGU_TO_SIDO)) {
    if (text.includes(sg)) {
      addRegion({ sido, sigungu: sg, raw: sg });
    }
  }

  // 3. 시도만 매칭
  for (const sido of SIDO_LIST) {
    const normalized = SIDO_NORMALIZE[sido] ?? sido;
    if (text.includes(sido) && !seen.has(`${normalized}|`)) {
      // 시군구 없이 시도만 있는 경우
      const hasSubRegion = found.some(f => f.sido === normalized && f.sigungu);
      if (!hasSubRegion) {
        addRegion({ sido: normalized, raw: sido });
      }
    }
  }

  // 4. 결과 없으면 '전국' 반환
  if (found.length === 0) {
    found.push({ sido: '전국', raw: '전국' });
  }

  return found;
}

/** 대표 시도 추출 (첫 번째 명시 지역) */
export function getPrimarySido(regions: RegionEntity[]): string {
  const specific = regions.find(r => r.sido !== '전국');
  return specific?.sido ?? '전국';
}
