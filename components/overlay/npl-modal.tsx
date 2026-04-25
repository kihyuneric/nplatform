"use client"

/**
 * components/overlay/npl-modal.tsx · Phase H5
 *
 * NPLatform 표준 Modal — 데스크톱 다이얼로그 ↔ 모바일 BottomSheet 자동 전환.
 *
 * 핵심 기능:
 *   1. scroll-to-top 자동 — 콘텐츠 컨테이너 ref 로 보장
 *      (사용자 지적: "다음 누르면 하단에 위치하여 다시 위로 스크롤해야 함")
 *   2. ≥768px = 중앙 모달 (max-w-lg / scale-in)
 *   3. <768px = 하단에서 슬라이드 BottomSheet (touch-friendly)
 *   4. ESC/오버레이 클릭 닫힘 (Radix 기본)
 *   5. focus-trap (Radix Dialog)
 *   6. 라이트/다크 자동 분기 (var(--color-surface-overlay/elevated))
 *
 * 사용:
 *   <NplModal open={open} onOpenChange={setOpen} title="확인" description="...">
 *     <FormField label="이메일">...</FormField>
 *     <NplModalFooter>
 *       <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
 *       <Button onClick={handleSave}>저장</Button>
 *     </NplModalFooter>
 *   </NplModal>
 *
 *   다단계 위자드 안에서 step 변경 시 ref.current.scrollTo(0,0) 호출 가능:
 *   const ref = useRef<HTMLDivElement>(null)
 *   <NplModal contentRef={ref}>...</NplModal>
 *   const handleNext = () => { setStep(s+1); ref.current?.scrollTo({top:0, behavior:'smooth'}) }
 */

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NplModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 제목 — 문자열 또는 ReactNode (아이콘 + 텍스트 등) */
  title?: React.ReactNode
  description?: React.ReactNode
  /** 모달 본문 ref — 외부에서 scrollTo 가능 (위자드 step 이동 등) */
  contentRef?: React.Ref<HTMLDivElement>
  /** 닫기 버튼 숨김 (강제 진행 모달용) */
  hideCloseButton?: boolean
  /** max-width override (기본 max-w-lg) */
  size?: "sm" | "md" | "lg" | "xl"
  /** 추가 클래스 (콘텐츠 패널) */
  className?: string
  children?: React.ReactNode
}

const SIZE_CLASS: Record<NonNullable<NplModalProps["size"]>, string> = {
  sm: "md:max-w-md",
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
  xl: "md:max-w-4xl",
}

export function NplModal({
  open,
  onOpenChange,
  title,
  description,
  contentRef,
  hideCloseButton,
  size = "md",
  className,
  children,
}: NplModalProps) {
  const innerRef = React.useRef<HTMLDivElement>(null)

  // open 변화 시 콘텐츠 스크롤 상단으로 자동 리셋
  React.useEffect(() => {
    if (open) {
      // 다음 tick 에 ref가 마운트된 후 스크롤
      requestAnimationFrame(() => {
        innerRef.current?.scrollTo({ top: 0, behavior: "auto" })
      })
    }
  }, [open])

  // 외부 ref 가 주어지면 동기화 (위자드 step 이동 시 사용)
  React.useImperativeHandle(
    contentRef as React.RefObject<HTMLDivElement>,
    () => innerRef.current as HTMLDivElement,
    [],
  )

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // 데스크톱: 중앙 모달
            "fixed z-50 grid w-full gap-0 border bg-[var(--color-surface-elevated)] shadow-2xl",
            "border-[var(--color-border-subtle)]",
            // 모바일 (<768px): 하단 BottomSheet (full width · 상단 둥근 모서리)
            "bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl",
            "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4",
            // 데스크톱 (≥768px): 중앙 모달 (rounded · max-w 적용)
            "md:bottom-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%]",
            "md:max-h-[85vh] md:rounded-2xl",
            "md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95",
            "md:data-[state=open]:slide-in-from-top-[48%] md:data-[state=closed]:slide-out-to-top-[48%]",
            // 공통: animate
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-200",
            SIZE_CLASS[size],
            className,
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="border-b border-[var(--color-border-subtle)] px-6 py-4">
              {/* Mobile drag handle */}
              <div className="md:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-default)]" />
              {title && (
                <DialogPrimitive.Title className="text-[1rem] font-bold leading-tight tracking-[-0.005em] text-[var(--color-text-primary)]">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-1.5 text-[0.8125rem] leading-[1.5] text-[var(--color-text-tertiary)]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}

          {/* Scrollable Body — ref 부여하여 외부 scroll 제어 가능 */}
          <div
            ref={innerRef}
            className="overflow-y-auto px-6 py-5"
            style={{ maxHeight: "calc(85vh - 120px)" }}
          >
            {children}
          </div>

          {/* Close Button */}
          {!hideCloseButton && (
            <DialogPrimitive.Close
              className={cn(
                "absolute right-4 top-4 rounded-md p-1.5 transition-opacity",
                "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]",
                "hover:bg-[var(--color-surface-overlay)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-bright)]",
                "disabled:pointer-events-none",
              )}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * NplModalFooter — 우측 정렬 액션 버튼 컨테이너.
 * 모바일에선 stack(세로) · 데스크톱에선 row(가로) 자동 전환.
 */
export function NplModalFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-[var(--color-border-subtle)] px-6 py-4",
        "md:flex-row md:justify-end md:space-x-2 md:gap-0",
        "bg-[var(--color-surface-base)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * useScrollToTop — Modal 내부 위자드에서 step 변경 시 콘텐츠 상단으로 스크롤.
 *
 * 사용:
 *   const { contentRef, scrollToTop } = useScrollToTop()
 *   <NplModal contentRef={contentRef}>...</NplModal>
 *   const handleNext = () => { setStep(s+1); scrollToTop() }
 */
export function useScrollToTop() {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const scrollToTop = React.useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    // 페이지 자체 스크롤도 동기화
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [])
  return { contentRef, scrollToTop }
}
