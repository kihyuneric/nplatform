# RAG 코퍼스 디렉토리

## 구조

```
docs/rag/
├── legal/         # 법령·시행령·시행규칙 (목표: 2,000+ 청크)
│   ├── 채권공정거래에관한법률.md
│   ├── 자산유동화에관한법률.md
│   ├── 금융기관부실자산등의효율적처리및한국자산관리공사의설립에관한법률.md
│   └── ...
├── precedent/     # NPL 관련 판례 요약 (목표: 1,500+ 청크)
│   ├── 대법원2020다123456_채권양수도.md
│   └── ...
└── guide/         # NPL 매입·실사·정산 가이드 (목표: 1,500+ 청크)
    ├── npl-매입실무.md
    ├── 등기부등본-실사-가이드.md
    ├── 임차인-우선변제권-분석.md
    └── ...
```

## 시드 방법

```bash
# 1) docs/rag/{legal,precedent,guide}/ 에 .md 파일 추가
# 2) Dry-run 으로 청크 개수 확인
node scripts/rag/seed-corpus.mjs --dry-run

# 3) 실제 시드 (ADMIN_SECRET 필요)
ADMIN_SECRET=$YOUR_SECRET node scripts/rag/seed-corpus.mjs

# 4) 특정 소스만 / 재시드
node scripts/rag/seed-corpus.mjs --source legal --replace
```

## 청크 정책

- **크기**: 1,000자
- **Overlap**: 200자
- **임베딩**: Voyage AI `voyage-multilingual-2` (1024차원)
- **저장**: Supabase `rag_chunks` 테이블 (pgvector)
- **검색**: 코사인 유사도 threshold 0.78 / top-K 5

## 5,000건 도달 가이드

| 소스 | 현재 | 목표 | 추가 방안 |
|---|---|---|---|
| 법령 | 0 | 2,000 | 국가법령정보센터에서 NPL 관련 50개 법령 → 평균 40 청크 |
| 판례 | 0 | 1,500 | 대법원 판례검색 NPL 키워드 100건 → 평균 15 청크 |
| 가이드 | 0 | 1,500 | NPL 매입실무·실사·정산 사내 자료 30편 → 평균 50 청크 |

총 5,000+ 청크 → pgvector ivfflat 인덱스 효율적 검색 (< 100ms)
