/**
 * Deal Room 컴포넌트 배럴 exports (DR-2b, 2026-04-21)
 */

// 기존 컴포넌트
export { MessageBubble, type DealMessage } from "./message-bubble"
export { OfferCard, OfferForm, type OfferData } from "./offer-card"
export { FileAttachment, type AttachedFile } from "./file-attachment"
export { default as SignaturePad } from "./signature-pad"

// DR-2b 신규 3-Zone 셸
export { DealRoomShell, type DealRoomShellProps } from "./deal-room-shell"
export { DealHeader, type DealHeaderProps, type DealStage } from "./deal-header"
export {
  DealSummaryPane,
  type DealSummaryPaneProps,
  type DealSummaryData,
  type TierLevel,
} from "./deal-summary-pane"
export {
  DealActionPane,
  type DealActionPaneProps,
  type RecentOffer,
} from "./deal-action-pane"
export {
  DealChatPane,
  type DealChatPaneProps,
  type ChatMessage,
  type ChatDocument,
  type ChatPartner,
} from "./deal-chat-pane"
