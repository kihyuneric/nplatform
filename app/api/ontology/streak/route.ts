export const dynamic = 'force-dynamic'

// Phase 6: 학습 스트릭 & 게이미피케이션 API
// GET  ?user_id=anonymous — 스트릭 현황 + 뱃지 목록
// POST ?user_id=anonymous — 오늘 학습 기록 업데이트

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

// 뱃지 정의
const BADGE_DEFINITIONS = [
  { type: 'streak_3', name: '3일 연속 학습', icon: '🔥', check: (s: StreakStats) => s.currentStreak >= 3 },
  { type: 'streak_7', name: '1주일 연속 학습', icon: '💪', check: (s: StreakStats) => s.currentStreak >= 7 },
  { type: 'streak_14', name: '2주 연속 학습', icon: '⚡', check: (s: StreakStats) => s.currentStreak >= 14 },
  { type: 'streak_30', name: '30일 연속 학습', icon: '👑', check: (s: StreakStats) => s.currentStreak >= 30 },
  { type: 'first_study', name: '첫 학습 시작', icon: '🎯', check: (s: StreakStats) => s.totalDays >= 1 },
  { type: 'capsule_10', name: '10개 캡슐 완료', icon: '📚', check: (s: StreakStats) => s.totalCapsules >= 10 },
  { type: 'capsule_50', name: '50개 캡슐 완료', icon: '🏆', check: (s: StreakStats) => s.totalCapsules >= 50 },
  { type: 'capsule_100', name: '100개 캡슐 완료', icon: '💎', check: (s: StreakStats) => s.totalCapsules >= 100 },
  { type: 'quiz_10', name: '퀴즈 10회 통과', icon: '✅', check: (s: StreakStats) => s.totalQuizzes >= 10 },
  { type: 'hours_5', name: '5시간 학습', icon: '⏰', check: (s: StreakStats) => s.totalMinutes >= 300 },
  { type: 'hours_20', name: '20시간 학습', icon: '🌟', check: (s: StreakStats) => s.totalMinutes >= 1200 },
]

interface StreakStats {
  currentStreak: number
  longestStreak: number
  totalDays: number
  totalCapsules: number
  totalMinutes: number
  totalQuizzes: number
}

function calculateStreak(records: Array<{ study_date: string }>): { current: number; longest: number } {
  if (records.length === 0) return { current: 0, longest: 0 }

  // study_date들을 날짜 순으로 정렬 (최신순)
  const dates = records
    .map(r => r.study_date)
    .sort((a, b) => b.localeCompare(a))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // 현재 스트릭: 오늘 또는 어제부터 연속
  let currentStreak = 0
  if (dates[0] === todayStr || dates[0] === yesterdayStr) {
    currentStreak = 1
    const startDate = new Date(dates[0])
    for (let i = 1; i < dates.length; i++) {
      const expected = new Date(startDate)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]
      if (dates[i] === expectedStr) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // 최장 스트릭
  let longest = 1
  let current = 1
  const sortedAsc = [...dates].sort()
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1])
    const curr = new Date(sortedAsc[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current++
      longest = Math.max(longest, current)
    } else if (diff > 1) {
      current = 1
    }
  }

  return { current: currentStreak, longest: Math.max(longest, currentStreak) }
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const userId = new URL(req.url).searchParams.get('user_id') || 'anonymous'

  try {
    // 1. 스트릭 기록 조회 (최근 90일)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: streakRecords } = await supabase
      .from('ont_learning_streak')
      .select('study_date, capsules_studied, minutes_studied, quizzes_passed')
      .eq('user_id', userId)
      .gte('study_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('study_date', { ascending: false })

    const records = streakRecords || []
    const { current, longest } = calculateStreak(records)

    const totalCapsules = records.reduce((s, r) => s + (r.capsules_studied || 0), 0)
    const totalMinutes = records.reduce((s, r) => s + (r.minutes_studied || 0), 0)
    const totalQuizzes = records.reduce((s, r) => s + (r.quizzes_passed || 0), 0)

    // 2. 전체 기록 (뱃지 계산용)
    const { data: allRecords } = await supabase
      .from('ont_learning_streak')
      .select('study_date, capsules_studied, minutes_studied, quizzes_passed')
      .eq('user_id', userId)
      .order('study_date', { ascending: false })

    const allData = allRecords || []
    const allStreak = calculateStreak(allData)
    const allTotalCapsules = allData.reduce((s, r) => s + (r.capsules_studied || 0), 0)
    const allTotalMinutes = allData.reduce((s, r) => s + (r.minutes_studied || 0), 0)
    const allTotalQuizzes = allData.reduce((s, r) => s + (r.quizzes_passed || 0), 0)

    const streakStats: StreakStats = {
      currentStreak: allStreak.current,
      longestStreak: allStreak.longest,
      totalDays: allData.length,
      totalCapsules: allTotalCapsules,
      totalMinutes: allTotalMinutes,
      totalQuizzes: allTotalQuizzes,
    }

    // 3. 기존 뱃지 조회
    const { data: existingBadges } = await supabase
      .from('ont_user_badge')
      .select('badge_type, badge_name, badge_icon, earned_at')
      .eq('user_id', userId)

    const earnedTypes = new Set((existingBadges || []).map(b => b.badge_type))

    // 4. 새로 획득 가능한 뱃지 확인 및 부여
    const newBadges: Array<{ type: string; name: string; icon: string }> = []
    for (const def of BADGE_DEFINITIONS) {
      if (!earnedTypes.has(def.type) && def.check(streakStats)) {
        newBadges.push({ type: def.type, name: def.name, icon: def.icon })
        await supabase
          .from('ont_user_badge')
          .upsert({
            user_id: userId,
            badge_type: def.type,
            badge_name: def.name,
            badge_icon: def.icon,
          }, { onConflict: 'user_id,badge_type' })
      }
    }

    // 5. 최근 7일 히트맵 데이터
    const heatmap: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const record = records.find(r => r.study_date === dateStr)
      heatmap.push({
        date: dateStr,
        count: record?.capsules_studied || 0,
      })
    }

    // 6. 최근 30일 히트맵
    const heatmap30: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const record = records.find(r => r.study_date === dateStr)
      heatmap30.push({
        date: dateStr,
        count: record?.capsules_studied || 0,
      })
    }

    return NextResponse.json({
      current_streak: allStreak.current,
      longest_streak: allStreak.longest,
      total_study_days: allData.length,
      total_capsules_studied: allTotalCapsules,
      total_minutes: allTotalMinutes,
      total_quizzes_passed: allTotalQuizzes,
      badges: [...(existingBadges || []), ...newBadges.map(b => ({ ...b, badge_type: b.type, badge_name: b.name, badge_icon: b.icon, earned_at: new Date().toISOString() }))],
      new_badges: newBadges,
      heatmap_7d: heatmap,
      heatmap_30d: heatmap30,
      today_capsules: records.find(r => r.study_date === new Date().toISOString().split('T')[0])?.capsules_studied || 0,
      today_minutes: records.find(r => r.study_date === new Date().toISOString().split('T')[0])?.minutes_studied || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const userId = new URL(req.url).searchParams.get('user_id') || 'anonymous'

  try {
    const body = await req.json()
    const { capsules_delta = 1, minutes_delta = 10, quizzes_delta = 0 } = body

    const today = new Date().toISOString().split('T')[0]

    // Upsert: 오늘 기록이 있으면 업데이트, 없으면 생성
    const { data: existing } = await supabase
      .from('ont_learning_streak')
      .select('streak_id, capsules_studied, minutes_studied, quizzes_passed')
      .eq('user_id', userId)
      .eq('study_date', today)
      .single()

    if (existing) {
      await supabase
        .from('ont_learning_streak')
        .update({
          capsules_studied: (existing.capsules_studied || 0) + capsules_delta,
          minutes_studied: (existing.minutes_studied || 0) + minutes_delta,
          quizzes_passed: (existing.quizzes_passed || 0) + quizzes_delta,
        })
        .eq('streak_id', existing.streak_id)
    } else {
      await supabase
        .from('ont_learning_streak')
        .insert({
          user_id: userId,
          study_date: today,
          capsules_studied: capsules_delta,
          minutes_studied: minutes_delta,
          quizzes_passed: quizzes_delta,
        })
    }

    return NextResponse.json({ success: true, date: today })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
