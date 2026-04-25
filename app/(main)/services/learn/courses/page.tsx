"use client";

import { useState } from "react";
import Link from "next/link";
import DS, { formatKRW, formatDate } from "@/lib/design-system";

const COURSES = [
  { id: "npl-intro", title: "NPL 투자 입문 가이드", instructor: "김민준 강사", level: "초급", category: "투자기초", duration: "4시간 30분", lessons: 12, students: 2840, rating: 4.8, price: "무료", gradient: "from-emerald-500 to-teal-500" },
  { id: "auction-process", title: "경매 절차 완전 정복", instructor: "이수연 강사", level: "초급", category: "경매", duration: "6시간", lessons: 16, students: 1920, rating: 4.7, price: "무료", gradient: "from-blue-500 to-indigo-500" },
  { id: "distribution", title: "배당순위와 권리분석", instructor: "박정호 변호사", level: "중급", category: "법률", duration: "5시간", lessons: 14, students: 1340, rating: 4.9, price: "89,000원", gradient: "from-amber-500 to-orange-500" },
  { id: "ltv-analysis", title: "LTV 분석과 채권 가치평가", instructor: "최지원 세무사", level: "중급", category: "세무", duration: "4시간", lessons: 10, students: 980, rating: 4.6, price: "79,000원", gradient: "from-violet-500 to-purple-500" },
  { id: "npl-strategy", title: "NPL 고수익 투자 전략", instructor: "강동훈 대표", level: "고급", category: "투자기초", duration: "8시간", lessons: 20, students: 620, rating: 4.9, price: "129,000원", gradient: "from-rose-500 to-red-500" },
  { id: "deal-room", title: "딜룸 활용과 협상 전략", instructor: "윤서희 강사", level: "중급", category: "실사", duration: "3시간", lessons: 8, students: 750, rating: 4.7, price: "69,000원", gradient: "from-cyan-500 to-sky-500" },
  { id: "due-diligence", title: "실사보고서 작성 실무", instructor: "임철수 강사", level: "중급", category: "실사", duration: "5시간 30분", lessons: 15, students: 540, rating: 4.8, price: "99,000원", gradient: "from-fuchsia-500 to-pink-500" },
  { id: "tax-auction", title: "경매 세금 완전 가이드", instructor: "최지원 세무사", level: "고급", category: "세무", duration: "4시간", lessons: 11, students: 430, rating: 4.7, price: "89,000원", gradient: "from-lime-500 to-green-500" },
  { id: "law-basics", title: "NPL 투자자를 위한 법률 기초", instructor: "박정호 변호사", level: "초급", category: "법률", duration: "3시간", lessons: 9, students: 1120, rating: 4.6, price: "59,000원", gradient: "from-orange-500 to-amber-500" },
];

const LEVELS = ["전체", "초급", "중급", "고급"];
const CATEGORIES = ["전체", "투자기초", "법률", "세무", "경매", "실사"];
const SORTS = ["인기순", "최신순", "평점순"];

const levelColors: Record<string, string> = {
  초급: "bg-stone-100/10 text-stone-900 border-stone-300/20",
  중급: "bg-stone-100/10 text-stone-900 border-stone-300/20",
  고급: "bg-stone-100/10 text-stone-900 border-stone-300/20",
};

export default function CoursesPage() {
  const [level, setLevel] = useState("전체");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("인기순");
  const [page, setPage] = useState(1);

  const FEATURED = COURSES[4]; // 고급 강좌 featured

  const filtered = COURSES.filter(
    (c) => (level === "전체" || c.level === level) && (category === "전체" || c.category === category)
  ).sort((a, b) =>
    sort === "평점순" ? b.rating - a.rating : sort === "최신순" ? b.id.localeCompare(a.id) : b.students - a.students
  );

  const PER_PAGE = 6;
  const total = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <Link href="/services/learn" className={`${DS.text.link} inline-flex items-center gap-1 mb-4`}>
            ← 지식센터
          </Link>
          <p className={DS.header.eyebrow}>NPL 강좌</p>
          <h1 className={DS.header.title}>NPL 투자 강좌</h1>
          <p className={DS.header.subtitle}>입문부터 고급까지, 실전 사례 중심의 체계적인 NPL 투자 커리큘럼</p>
          <div className={`flex flex-wrap gap-4 mt-4 ${DS.text.body}`}>
            <span><strong className={DS.text.bodyBold}>강좌 48개</strong></span>
            <span className="text-[var(--color-border-default)]">|</span>
            <span><strong className={DS.text.bodyBold}>수강생 12,400명</strong></span>
            <span className="text-[var(--color-border-default)]">|</span>
            <span><strong className={DS.text.bodyBold}>평균 평점 4.8★</strong></span>
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} py-8 ${DS.page.sectionGap}`}>
        {/* Filter bar */}
        <div className={DS.filter.bar}>
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => { setLevel(l); setPage(1); }}
                  className={`${DS.filter.chip} ${level === l ? DS.filter.chipActive : DS.filter.chipInactive}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => { setCategory(c); setPage(1); }}
                  className={`${DS.filter.chip} ${category === c ? DS.filter.chipActive : DS.filter.chipInactive}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className={DS.input.base} style={{ width: 'auto' }}>
            {SORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Featured course */}
        <div>
          <p className={`${DS.header.eyebrow} mb-3`}>추천 강좌</p>
          <div className={`${DS.card.elevated} overflow-hidden flex flex-col md:flex-row`}>
            <div className={`bg-gradient-to-br ${FEATURED.gradient} w-full md:w-72 h-48 md:h-auto flex items-center justify-center shrink-0`}>
              <div className="text-center text-white">
                <div className="text-5xl font-black opacity-30">NPL</div>
                <div className="text-[0.8125rem] font-semibold mt-1 opacity-80">{FEATURED.category}</div>
              </div>
            </div>
            <div className={`${DS.card.paddingLarge} flex flex-col justify-between flex-1`}>
              <div>
                <span className={`inline-block text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full border mb-3 ${levelColors[FEATURED.level]}`}>{FEATURED.level}</span>
                <h2 className={DS.text.sectionTitle}>{FEATURED.title}</h2>
                <p className={`${DS.text.caption} mb-4`}>{FEATURED.instructor}</p>
                <div className={`flex flex-wrap gap-4 ${DS.text.body}`}>
                  <span>★ <span className="font-semibold text-stone-900">{FEATURED.rating}</span></span>
                  <span>{FEATURED.students.toLocaleString()}명 수강</span>
                  <span>{FEATURED.duration}</span>
                  <span>{FEATURED.lessons}강</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-5">
                <span className={DS.text.metricLarge}>{FEATURED.price}</span>
                <button className={DS.button.primary}>
                  수강 신청
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Course grid */}
        <div>
          <p className={`${DS.text.body} mb-4`}>총 <span className={DS.text.bodyBold}>{filtered.length}</span>개 강좌</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {paginated.map((course) => (
              <div key={course.id} className={`${DS.card.interactive} overflow-hidden flex flex-col`}>
                <div className={`bg-gradient-to-br ${course.gradient} h-36 flex items-center justify-center`}>
                  <div className="text-center text-white">
                    <div className="text-3xl font-black opacity-30">NPL</div>
                    <div className="text-[0.6875rem] font-semibold mt-1 opacity-80">{course.category}</div>
                  </div>
                </div>
                <div className={`${DS.card.padding} flex flex-col flex-1`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full border ${levelColors[course.level]}`}>{course.level}</span>
                    <span className={DS.text.captionLight}>{course.category}</span>
                  </div>
                  <h3 className={`${DS.text.cardSubtitle} mb-1 leading-snug`}>{course.title}</h3>
                  <p className={`${DS.text.captionLight} mb-3`}>{course.instructor}</p>
                  <div className={`flex flex-wrap gap-3 ${DS.text.captionLight} mb-3`}>
                    <span>★ <span className="text-stone-900 font-semibold">{course.rating}</span></span>
                    <span>{course.students.toLocaleString()}명</span>
                    <span>{course.duration}</span>
                    <span>{course.lessons}강</span>
                  </div>
                  <div className={`flex items-center justify-between mt-auto pt-3 ${DS.divider.default}`}>
                    <span className={`${DS.text.bodyBold} ${course.price === "무료" ? "text-stone-900" : ""}`}>{course.price}</span>
                    <Link href={`/services/learn/courses/${course.id}`}
                      className={DS.button.secondary}>
                      보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className={`${DS.button.secondary} disabled:opacity-40`}>
              ← 이전
            </button>
            {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-[0.8125rem] font-medium transition-colors ${page === p ? "bg-[var(--color-brand-dark)] text-white" : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(total, p + 1))} disabled={page === total}
              className={`${DS.button.secondary} disabled:opacity-40`}>
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
