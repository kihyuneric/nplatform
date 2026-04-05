"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

const TABS = ["공지사항", "배너 관리", "뉴스 관리", "가이드", "강좌"] as const
type Tab = typeof TABS[number]

const NOTICES = [
  { id: "N-001", title: "NPLatform v2.0 업데이트 안내",    date: "2026-03-20", status: "게시중" },
  { id: "N-002", title: "서버 정기 점검 안내 (3/25 02:00)", date: "2026-03-19", status: "게시중" },
  { id: "N-003", title: "신규 파트너 모집 이벤트 안내",     date: "2026-03-18", status: "비공개" },
  { id: "N-004", title: "개인정보처리방침 개정 안내",        date: "2026-03-10", status: "게시중" },
  { id: "N-005", title: "4월 정기 점검 예고",               date: "2026-04-01", status: "예약"   },
]

const BANNERS = [
  { id: "B-001", position: "홈 상단",    imageUrl: "/banners/hero.jpg",     active: true,  start: "2026-03-01", end: "2026-04-30" },
  { id: "B-002", position: "사이드바",   imageUrl: "/banners/npl-promo.jpg", active: true,  start: "2026-03-15", end: "2026-04-15" },
  { id: "B-003", position: "홈 중단",    imageUrl: "/banners/spring.jpg",    active: false, start: "2026-04-05", end: "2026-04-20" },
  { id: "B-004", position: "마이페이지", imageUrl: "/banners/retention.jpg", active: false, start: "2026-02-01", end: "2026-03-31" },
]

const NEWS = [
  { id: "NEWS-001", title: "2026년 1분기 NPL 시장 동향 분석",          source: "한국경제",   date: "2026-04-01", published: true  },
  { id: "NEWS-002", title: "금융위, 부실채권 정리 지원 방안 발표",       source: "매일경제",   date: "2026-03-30", published: true  },
  { id: "NEWS-003", title: "NPL 투자 수익률 상위 10개 사례",            source: "서울경제",   date: "2026-03-28", published: false },
  { id: "NEWS-004", title: "부동산 경매 낙찰가율 분석 리포트",           source: "조선비즈",   date: "2026-03-25", published: true  },
  { id: "NEWS-005", title: "은행권 부실자산 2조원 규모 매각 예정",       source: "이데일리",   date: "2026-03-22", published: false },
]

const GUIDES = [
  { id: "G-001", title: "NPL 투자 입문 가이드",        category: "입문",   date: "2026-02-10", published: true  },
  { id: "G-002", title: "경매 입찰 전략 완전 정복",     category: "경매",   date: "2026-02-18", published: true  },
  { id: "G-003", title: "실사(Due Diligence) 체크리스트", category: "실사", date: "2026-03-05", published: true  },
  { id: "G-004", title: "세금·법률 기초 지식",          category: "법률",   date: "2026-03-12", published: false },
  { id: "G-005", title: "수익률 계산 방법론",            category: "재무",   date: "2026-04-01", published: false },
]

const COURSES = [
  { id: "C-001", title: "NPL 투자 A to Z",           instructor: "김민준 대표", students: 340, published: true  },
  { id: "C-002", title: "부동산 경매 실전반",          instructor: "이서연 강사", students: 218, published: true  },
  { id: "C-003", title: "법원 경매 서류 완전 분석",    instructor: "박도현 변호사", students: 95, published: true  },
  { id: "C-004", title: "NPL 초급 입문 과정",          instructor: "최지우 팀장", students: 0,   published: false },
  { id: "C-005", title: "고수익 부실채권 투자 전략",   instructor: "강서준 이사", students: 127, published: false },
]

const NOTICE_STATUS_STYLE: Record<string, string> = {
  "게시중": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "비공개": "bg-slate-50 text-slate-600 border border-slate-200",
  "예약":   "bg-blue-50 text-blue-700 border border-blue-200",
}

const TAB_MAP: Record<string, Tab> = {
  "notices": "공지사항",
  "banners": "배너 관리",
  "news": "뉴스 관리",
  "guide": "가이드",
  "courses": "강좌",
}

export default function AdminContentPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-1">
          <FileText size={18} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>콘텐츠 관리</h1>
        </div>
        <p className={DS.text.body}>공지사항, 배너, 뉴스, 가이드, 강좌 관리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* Panel header */}
        <div className={DS.table.wrapper}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <span className={DS.text.bodyBold}>{tab} 목록</span>
            <button onClick={() => toast.info(`새 ${tab} 작성`)} className={`${DS.button.primary} ${DS.button.sm}`}>
              <Plus size={13} />새 {tab}
            </button>
          </div>

          {/* 공지사항 */}
          {tab === "공지사항" && (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["제목", "날짜", "상태", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTICES.map(n => (
                  <tr key={n.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{n.title}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{n.date}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${NOTICE_STATUS_STYLE[n.status]}`}>{n.status}</span>
                    </td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.info(`${n.id} 수정`)} className={DS.button.icon}><Edit2 size={13} /></button>
                        <button onClick={() => toast.success(n.status === "게시중" ? "비공개 처리" : "게시 처리")} className={DS.button.icon}>
                          {n.status === "게시중" ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => toast.error(`${n.id} 삭제`)} className={DS.button.icon}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 배너 관리 */}
          {tab === "배너 관리" && (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["위치", "이미지 URL", "활성여부", "기간", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BANNERS.map(b => (
                  <tr key={b.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{b.position}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{b.imageUrl}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${b.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {b.active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{b.start} ~ {b.end}</td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.info(`${b.id} 수정`)} className={DS.button.icon}><Edit2 size={13} /></button>
                        <button onClick={() => toast.error(`${b.id} 삭제`)} className={DS.button.icon}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 뉴스 관리 */}
          {tab === "뉴스 관리" && (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["제목", "출처", "날짜", "공개여부", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NEWS.map(n => (
                  <tr key={n.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium max-w-[260px] truncate`}>{n.title}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{n.source}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{n.date}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${n.published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {n.published ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(n.published ? "비공개 처리" : "공개 처리")} className={DS.button.icon}>
                          {n.published ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => toast.error(`${n.id} 삭제`)} className={DS.button.icon}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 가이드 */}
          {tab === "가이드" && (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["제목", "카테고리", "작성일", "공개여부", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GUIDES.map(g => (
                  <tr key={g.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{g.title}</td>
                    <td className={DS.table.cell}>
                      <span className={DS.badge.inline("bg-purple-50", "text-purple-700", "border-purple-200")}>{g.category}</span>
                    </td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{g.date}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${g.published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {g.published ? "공개" : "초안"}
                      </span>
                    </td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.info(`${g.id} 수정`)} className={DS.button.icon}><Edit2 size={13} /></button>
                        <button onClick={() => toast.error(`${g.id} 삭제`)} className={DS.button.icon}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 강좌 */}
          {tab === "강좌" && (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["제목", "강사", "수강생 수", "공개여부", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COURSES.map(c => (
                  <tr key={c.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{c.title}</td>
                    <td className={DS.table.cellMuted}>{c.instructor}</td>
                    <td className={`${DS.table.cell} font-mono`}>{c.students.toLocaleString()}명</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${c.published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {c.published ? "공개" : "준비중"}
                      </span>
                    </td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.info(`${c.id} 수정`)} className={DS.button.icon}><Edit2 size={13} /></button>
                        <button onClick={() => toast.success(c.published ? "비공개 처리" : "공개 처리")} className={DS.button.icon}>
                          {c.published ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => toast.error(`${c.id} 삭제`)} className={DS.button.icon}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
