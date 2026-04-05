"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import DS, { formatKRW, formatDate } from "@/lib/design-system";

type Term = { id: number; term: string; english: string; definition: string; category: string; consonant: string };

const CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TERMS: Term[] = [
  { id: 1, term: "근저당권", english: "Collateral Mortgage", definition: "채권 최고액 범위 내에서 불특정 채권을 담보하기 위해 설정하는 저당권.", category: "법률 용어", consonant: "ㄱ" },
  { id: 2, term: "감정평가", english: "Appraisal", definition: "부동산 등 자산의 경제적 가치를 판정하여 그 결과를 가액으로 표시하는 것.", category: "기초 용어", consonant: "ㄱ" },
  { id: 3, term: "경매", english: "Auction", definition: "법원 관할 하에 부동산을 매각하는 절차. 임의경매와 강제경매로 구분됩니다.", category: "경매 절차", consonant: "ㄱ" },
  { id: 4, term: "공매", english: "Public Sale", definition: "한국자산관리공사(캠코) 등이 주관하는 공개 매각 절차.", category: "경매 절차", consonant: "ㄱ" },
  { id: 5, term: "낙찰", english: "Winning Bid", definition: "경매에서 최고가 매수 신고인으로 결정되는 것.", category: "경매 절차", consonant: "ㄴ" },
  { id: 6, term: "낙찰가율", english: "Bid-to-Appraisal Ratio", definition: "감정평가액 대비 낙찰가격의 비율. NPL 매입 전략의 핵심 지표.", category: "기초 용어", consonant: "ㄴ" },
  { id: 7, term: "대위변제", english: "Subrogation Payment", definition: "채무자를 대신하여 제3자가 채무를 변제하는 것.", category: "법률 용어", consonant: "ㄷ" },
  { id: 8, term: "담보인정비율", english: "LTV (Loan to Value)", definition: "담보물건의 가치 대비 대출금의 비율. 채권 매입가 산정 기준.", category: "금융 용어", consonant: "ㄷ" },
  { id: 9, term: "담보부채권", english: "Secured Debt", definition: "부동산 등 담보물건에 의해 채권 회수가 보장된 채권.", category: "채권 관련", consonant: "ㄷ" },
  { id: 10, term: "리스크 프리미엄", english: "Risk Premium", definition: "위험자산 투자에 대해 요구되는 추가 수익률.", category: "금융 용어", consonant: "ㄹ" },
  { id: 11, term: "말소기준권리", english: "Reference Right for Cancellation", definition: "경매에서 낙찰 후 소멸되는 기준이 되는 권리.", category: "법률 용어", consonant: "ㅁ" },
  { id: 12, term: "매각기일", english: "Sale Date", definition: "법원에서 경매 물건의 매각을 실시하는 날짜.", category: "경매 절차", consonant: "ㅁ" },
  { id: 13, term: "무담보채권", english: "Unsecured Debt", definition: "부동산 등의 담보가 설정되지 않은 채권.", category: "채권 관련", consonant: "ㅁ" },
  { id: 14, term: "부실채권", english: "Non-Performing Loan (NPL)", definition: "원리금 상환이 정상적으로 이루어지지 않는 채권. 3개월 이상 연체.", category: "기초 용어", consonant: "ㅂ" },
  { id: 15, term: "배당순위", english: "Distribution Priority", definition: "경매 배당금을 채권자들에게 나눠주는 우선순위.", category: "경매 절차", consonant: "ㅂ" },
  { id: 16, term: "배당요구종기", english: "Dividend Claim Deadline", definition: "채권자가 배당을 요구할 수 있는 마지막 기한.", category: "경매 절차", consonant: "ㅂ" },
  { id: 17, term: "선순위", english: "Senior Lien", definition: "다른 권리에 우선하여 변제받을 수 있는 순위.", category: "법률 용어", consonant: "ㅅ" },
  { id: 18, term: "수익률", english: "Yield / Return Rate", definition: "투자원금 대비 수익의 비율. 채권 매입가·연체이자·낙찰가율로 결정.", category: "금융 용어", consonant: "ㅅ" },
  { id: 19, term: "양도", english: "Assignment / Transfer", definition: "채권자가 자신의 채권을 제3자에게 이전하는 것.", category: "채권 관련", consonant: "ㅇ" },
  { id: 20, term: "연체이자", english: "Default Interest", definition: "채무자가 원금 상환을 연체했을 때 발생하는 이자.", category: "금융 용어", consonant: "ㅇ" },
  { id: 21, term: "임의경매", english: "Voluntary Auction", definition: "담보권 실행을 위해 채권자가 신청하는 경매.", category: "경매 절차", consonant: "ㅇ" },
  { id: 22, term: "자산관리회사", english: "AMC", definition: "부실채권 등 자산의 관리·처분·회수를 전문으로 하는 회사.", category: "기초 용어", consonant: "ㅈ" },
  { id: 23, term: "전세권", english: "Leasehold Right (Jeonse)", definition: "일정 보증금을 지급하고 타인 부동산을 점유·사용하는 물권.", category: "법률 용어", consonant: "ㅈ" },
  { id: 24, term: "채권회수율", english: "Recovery Rate", definition: "부실채권 투자 시 원금 대비 실제 회수한 금액의 비율.", category: "채권 관련", consonant: "ㅊ" },
  { id: 25, term: "채권양수도", english: "Debt Assignment", definition: "채권자가 보유한 채권을 제3자에게 매각하는 거래.", category: "채권 관련", consonant: "ㅊ" },
  { id: 26, term: "캐피탈사", english: "Capital Company", definition: "여신금융전문회사로서 NPL의 주요 매각기관 중 하나.", category: "기초 용어", consonant: "ㅋ" },
  { id: 27, term: "특수채권", english: "Special Debt", definition: "일반 대출채권과 구분되는 특수한 성격의 채권. PF 채권 등 포함.", category: "채권 관련", consonant: "ㅌ" },
  { id: 28, term: "풋백옵션", english: "Put-back Option", definition: "특정 조건 발생 시 매수자가 채권을 매도자에게 반환할 수 있는 권리.", category: "금융 용어", consonant: "ㅍ" },
  { id: 29, term: "프로젝트파이낸싱", english: "Project Financing (PF)", definition: "특정 프로젝트의 수익성을 담보로 자금을 조달하는 금융 기법.", category: "금융 용어", consonant: "ㅍ" },
  { id: 30, term: "할인율", english: "Discount Rate", definition: "부실채권을 매입할 때 원금 대비 할인하여 거래하는 비율.", category: "기초 용어", consonant: "ㅎ" },
  { id: 31, term: "후순위", english: "Junior / Subordinate Lien", definition: "선순위 채권보다 나중에 배당받는 채권.", category: "법률 용어", consonant: "ㅎ" },
  { id: 32, term: "한국자산관리공사", english: "KAMCO", definition: "부실채권 정리 및 자산 관리를 위해 설립된 공공기관. 온비드 운영.", category: "기초 용어", consonant: "ㅎ" },
];

const POPULAR = ["부실채권", "근저당권", "낙찰가율", "담보인정비율", "배당순위", "말소기준권리", "채권회수율", "임의경매", "선순위", "할인율"];
const CATEGORIES = ["기초 용어", "법률 용어", "금융 용어", "경매 절차", "채권 관련"];

const catColors: Record<string, string> = {
  "기초 용어": "bg-blue-50 text-blue-700 border-blue-200",
  "법률 용어": "bg-purple-50 text-purple-700 border-purple-200",
  "금융 용어": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "경매 절차": "bg-amber-50 text-amber-700 border-amber-200",
  "채권 관련": "bg-rose-50 text-rose-700 border-rose-200",
};

function GlossaryContent() {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? TERMS.filter((t) => t.term.toLowerCase().includes(q) || t.english.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) : TERMS;
  }, [query]);

  const byCategory = useMemo(() => {
    const map: Record<string, Term[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const t of filtered) { if (map[t.category]) map[t.category].push(t); }
    return map;
  }, [filtered]);

  const allIndexes = [...CONSONANTS, ...ALPHA];

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <Link href="/services/learn" className={`${DS.text.link} inline-flex items-center gap-1 mb-4`}>
            ← 지식센터
          </Link>
          <p className={DS.header.eyebrow}>NPL 용어사전</p>
          <h1 className={DS.header.title}>NPL 용어사전</h1>
          <p className={DS.header.subtitle}>NPL 투자에 필요한 모든 용어를 정리했습니다</p>
          <div className={`flex flex-wrap gap-4 mt-4 ${DS.text.body}`}>
            <span><strong className={DS.text.bodyBold}>용어 284개</strong></span>
            <span className="text-[var(--color-border-default)]">|</span>
            <span><strong className={DS.text.bodyBold}>카테고리 12개</strong></span>
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} py-8`}>
        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" placeholder="용어 검색..." value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(null); }}
            className={`${DS.input.base} py-3.5 pl-12`} />
        </div>

        {/* Alphabet index bar */}
        <div className={`${DS.card.base} ${DS.card.paddingCompact} mb-8 flex flex-wrap gap-1`}>
          {allIndexes.map((idx) => {
            const hasTerms = TERMS.some((t) => t.consonant === idx || t.english.startsWith(idx));
            return (
              <button key={idx} onClick={() => setActiveIdx(activeIdx === idx ? null : idx)} disabled={!hasTerms}
                className={`w-8 h-8 rounded-lg text-[0.8125rem] font-medium transition-colors ${activeIdx === idx ? "bg-[var(--color-brand-dark)] text-white" : hasTerms ? "hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)] cursor-default"}`}>
                {idx}
              </button>
            );
          })}
          {activeIdx && (
            <button onClick={() => setActiveIdx(null)} className={`${DS.button.ghost} ml-auto text-[0.6875rem]`}>
              초기화
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Terms list */}
          <div className="flex-1 min-w-0">
            <p className={`${DS.text.body} mb-5`}>
              총 <span className={DS.text.bodyBold}>{filtered.length}</span>개 용어
            </p>
            {filtered.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <p className={DS.empty.title}>검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {CATEGORIES.map((cat) => {
                  const terms = byCategory[cat];
                  if (!terms || terms.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[0.6875rem] font-bold px-3 py-1 rounded-full border ${catColors[cat]}`}>{cat}</span>
                        <div className={`h-px flex-1 bg-[var(--color-border-subtle)]`} />
                        <span className={DS.text.captionLight}>{terms.length}개</span>
                      </div>
                      <div className="space-y-2">
                        {terms.map((term) => (
                          <div key={term.id} className={`${DS.card.interactive} ${DS.card.paddingCompact} flex flex-col sm:flex-row sm:items-start gap-3`}>
                            <div className="sm:w-44 shrink-0">
                              <Link href={`/services/learn/glossary/${term.id}`} className={`${DS.text.bodyBold} hover:text-[var(--color-brand-mid)] transition-colors`}>
                                {term.term}
                              </Link>
                              <p className={DS.text.captionLight}>{term.english}</p>
                            </div>
                            <div className="flex-1 flex items-start justify-between gap-3">
                              <p className={DS.text.body}>{term.definition}</p>
                              <span className={`shrink-0 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full border ${catColors[term.category]}`}>{term.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular terms sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className={`sticky top-24 ${DS.card.base} ${DS.card.paddingCompact}`}>
              <p className={`${DS.header.eyebrow} mb-3`}>이번 주 많이 본 용어</p>
              <ol className="space-y-2">
                {POPULAR.map((name, i) => (
                  <li key={name} className="flex items-center gap-3 group">
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[0.6875rem] font-bold shrink-0 ${i < 3 ? "bg-[var(--color-brand-dark)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]"}`}>
                      {i + 1}
                    </span>
                    <button onClick={() => setQuery(name)}
                      className={`${DS.text.body} hover:text-[var(--color-brand-dark)] transition-colors text-left`}>
                      {name}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function GlossaryPage() {
  return (
    <Suspense fallback={<div className={`p-8 text-center ${DS.text.captionLight}`}>로딩 중...</div>}>
      <GlossaryContent />
    </Suspense>
  );
}
