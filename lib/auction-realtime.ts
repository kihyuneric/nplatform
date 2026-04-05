// ─── 실시간 경매 시뮬레이션 모듈 ──────────────────────────────

export interface BidEvent {
  id: string
  auctionId: string
  bidderName: string
  amount: number
  timestamp: Date
  isCurrentUser: boolean
}

export interface AuctionCallbacks {
  onNewBid: (bid: BidEvent) => void
  onAuctionEnd: (auctionId: string) => void
  onParticipantJoin: (auctionId: string, count: number) => void
}

const KOREAN_SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"]
const KOREAN_GIVEN = ["민수", "지영", "성호", "수진", "현우", "미래", "동현", "예진", "태우", "하은", "준혁", "서연", "재현", "유나", "승민", "다은", "우진", "소희", "시우", "지민"]

function randomKoreanName(): string {
  const surname = KOREAN_SURNAMES[Math.floor(Math.random() * KOREAN_SURNAMES.length)]
  const given = KOREAN_GIVEN[Math.floor(Math.random() * KOREAN_GIVEN.length)]
  return `${surname}${given}`
}

export function maskBidderName(name: string): string {
  if (name.length <= 1) return name
  const first = name[0]
  const last = name[name.length - 1]
  const masked = "*".repeat(name.length - 2)
  return `${first}${masked}${last}`
}

let bidCounter = 0

function generateBidId(): string {
  bidCounter++
  return `BID-${Date.now()}-${bidCounter}`
}

/**
 * 경매 실시간 구독 (WebSocket 시뮬레이션)
 * setInterval을 사용하여 3~8초 간격으로 랜덤 입찰을 생성합니다.
 */
export function subscribeToAuction(
  auctionId: string,
  currentBid: number,
  callbacks: AuctionCallbacks
): () => void {
  let latestBid = currentBid
  let participantCount = Math.floor(Math.random() * 5) + 15

  // 랜덤 간격 입찰 생성
  function scheduleBid() {
    const delay = Math.floor(Math.random() * 5000) + 3000 // 3~8초
    return setTimeout(() => {
      // 입찰 증가폭: 현재가의 0.5% ~ 2%
      const increment = Math.floor(latestBid * (0.005 + Math.random() * 0.015))
      // 만원 단위로 반올림
      const roundedIncrement = Math.ceil(increment / 10000) * 10000
      latestBid += roundedIncrement

      const bid: BidEvent = {
        id: generateBidId(),
        auctionId,
        bidderName: randomKoreanName(),
        amount: latestBid,
        timestamp: new Date(),
        isCurrentUser: false,
      }

      callbacks.onNewBid(bid)

      // 가끔 참여자 증가
      if (Math.random() > 0.6) {
        participantCount++
        callbacks.onParticipantJoin(auctionId, participantCount)
      }

      timerId = scheduleBid()
    }, delay)
  }

  let timerId = scheduleBid()

  // 정리 함수 반환
  return () => {
    clearTimeout(timerId)
  }
}

/**
 * 입찰 실행 함수
 */
export function placeBid(
  auctionId: string,
  amount: number,
  currentUserName: string = "나"
): BidEvent {
  return {
    id: generateBidId(),
    auctionId,
    bidderName: currentUserName,
    amount,
    timestamp: new Date(),
    isCurrentUser: true,
  }
}

/**
 * 초기 입찰 히스토리 생성 (시뮬레이션용)
 */
export function generateInitialBids(
  auctionId: string,
  startingBid: number,
  currentBid: number,
  count: number
): BidEvent[] {
  const bids: BidEvent[] = []
  const bidRange = currentBid - startingBid
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const progress = (i + 1) / count
    const amount = Math.floor(startingBid + bidRange * progress)
    const roundedAmount = Math.ceil(amount / 10000) * 10000
    // 최근 bids일수록 최근 시간
    const timeOffset = (count - i) * (Math.floor(Math.random() * 30000) + 15000)

    bids.push({
      id: generateBidId(),
      auctionId,
      bidderName: randomKoreanName(),
      amount: roundedAmount,
      timestamp: new Date(now - timeOffset),
      isCurrentUser: false,
    })
  }

  return bids
}
