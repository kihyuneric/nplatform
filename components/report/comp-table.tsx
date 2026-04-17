"use client"

import DS from "@/lib/design-system"

interface CompTableProps {
  comparables: {
    name: string
    region: string
    type: string
    salePrice: number
    pricePerPyeong: number
    discountRate: number
    date: string
    similarity: number
  }[]
  subject: {
    name: string
    askingPrice: number
    pricePerPyeong: number
    discountRate: number
  }
}

function toEok(v: number): string {
  return (v / 100000000).toFixed(1)
}

function toManPerPyeong(v: number): string {
  return (v / 10000).toFixed(0)
}

function getDiscountColor(rate: number): string {
  if (rate >= 0.3) return "var(--color-positive)"
  if (rate >= 0.2) return "var(--color-warning)"
  return "var(--color-negative)"
}

export default function CompTable({ comparables, subject }: CompTableProps) {
  return (
    <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>
        유사 거래 비교 분석
      </h3>

      <div
        className={DS.table.wrapper}
        style={{ maxHeight: comparables.length > 6 ? 420 : undefined, overflowY: comparables.length > 6 ? "auto" : undefined }}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className={DS.table.header}>
              <th className={DS.table.headerCell}>자산명</th>
              <th className={DS.table.headerCell}>지역</th>
              <th className={DS.table.headerCell}>유형</th>
              <th className={`${DS.table.headerCell} text-right`}>매각가</th>
              <th className={`${DS.table.headerCell} text-right`}>평당가</th>
              <th className={`${DS.table.headerCell} text-right`}>할인율</th>
              <th className={DS.table.headerCell}>거래일</th>
              <th className={`${DS.table.headerCell} text-center`}>유사도</th>
            </tr>
          </thead>
          <tbody>
            {/* Subject row */}
            <tr
              className={DS.table.row}
              style={{
                backgroundColor: "rgba(37, 88, 160, 0.08)",
              }}
            >
              <td className={`${DS.table.cell} font-bold`}>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-brand-mid)" }}
                  />
                  {subject.name}
                </div>
              </td>
              <td className={DS.table.cellMuted}>-</td>
              <td className={DS.table.cellMuted}>대상물건</td>
              <td className={`${DS.table.cell} text-right font-semibold tabular-nums`}>
                {toEok(subject.askingPrice)}억
              </td>
              <td className={`${DS.table.cell} text-right tabular-nums`}>
                {toManPerPyeong(subject.pricePerPyeong)}만/평
              </td>
              <td className={`${DS.table.cell} text-right font-semibold tabular-nums`}>
                <span style={{ color: getDiscountColor(subject.discountRate) }}>
                  {(subject.discountRate * 100).toFixed(1)}%
                </span>
              </td>
              <td className={DS.table.cellMuted}>-</td>
              <td className={`${DS.table.cell} text-center`}>
                <span className="text-[0.75rem] font-bold text-[var(--color-brand-mid)]">
                  기준
                </span>
              </td>
            </tr>

            {/* Comparable rows */}
            {comparables.map((comp, idx) => (
              <tr key={idx} className={DS.table.row}>
                <td className={`${DS.table.cell} font-medium`}>
                  {comp.name}
                </td>
                <td className={DS.table.cellMuted}>{comp.region}</td>
                <td className={DS.table.cellMuted}>{comp.type}</td>
                <td className={`${DS.table.cell} text-right tabular-nums`}>
                  {toEok(comp.salePrice)}억
                </td>
                <td className={`${DS.table.cell} text-right tabular-nums`}>
                  {toManPerPyeong(comp.pricePerPyeong)}만/평
                </td>
                <td className={`${DS.table.cell} text-right font-semibold tabular-nums`}>
                  <span style={{ color: getDiscountColor(comp.discountRate) }}>
                    {(comp.discountRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td className={DS.table.cellMuted}>{comp.date}</td>
                <td className={`${DS.table.cell} text-center`}>
                  <div className="flex items-center gap-2 justify-center">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: 48,
                        backgroundColor: "var(--color-surface-sunken)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${comp.similarity}%`,
                          backgroundColor:
                            comp.similarity >= 80
                              ? "var(--color-positive)"
                              : comp.similarity >= 60
                                ? "var(--color-warning)"
                                : "var(--color-negative)",
                        }}
                      />
                    </div>
                    <span className="text-[0.6875rem] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                      {comp.similarity}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={`${DS.text.captionLight} mt-2`}>
        * 매각가: 억원 | 평당가: 만원/평 | 유사도: 0~100 (높을수록 유사)
      </p>
    </div>
  )
}
