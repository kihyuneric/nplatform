export default function NewFundLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: 'linear-gradient(180deg, #030810 0%, #050D1A 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-6">
        {/* 뒤로가기 */}
        <div className="h-4 w-28 bg-gray-800 rounded" />
        {/* 제목 */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-700 rounded-xl" />
          <div className="h-4 w-96 bg-gray-800 rounded" />
        </div>
        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-800" />
              {i < 3 && <div className="h-0.5 w-16 bg-gray-800" />}
            </div>
          ))}
        </div>
        {/* 폼 카드 */}
        <div className="rounded-2xl h-96 bg-gray-800" />
        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <div className="h-11 w-24 rounded-xl bg-gray-800" />
          <div className="h-11 w-32 rounded-xl bg-gray-700" />
        </div>
      </div>
    </div>
  )
}
