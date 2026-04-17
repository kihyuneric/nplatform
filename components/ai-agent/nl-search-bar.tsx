"use client"
import { useState } from "react"
import { Sparkles, Search, ArrowRight, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function NLSearchBar() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/ai/nl-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setResult(data.data)
      if (data.data?.total > 0) {
        toast.success(`${data.data.total}건의 매물을 찾았습니다`)
      } else {
        toast.info('조건에 맞는 매물이 없습니다')
      }
    } catch {
      toast.error('검색 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-positive)]" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="AI 검색: 강남 5억 이하 오피스 매물 찾아줘"
          className="pl-10 pr-24 h-12 text-base rounded-xl border-2 border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:border-[var(--color-positive)]"
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 bg-[var(--color-positive)] hover:bg-[#059669] rounded-lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {result && (
        <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/20 text-sm">
          <p className="text-white/70">{result._interpretation}</p>
          {result.total > 0 && (
            <Button
              variant="link"
              className="p-0 h-auto text-[var(--color-positive)] mt-1"
              onClick={() => router.push(result.search_url)}
            >
              {result.total}건 매물 보기 <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
