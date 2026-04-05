"use client"

import { OfferCard, type OfferData } from "./offer-card"
import { FilePreview, type FileMetadata } from "./file-attachment"
import { cn } from "@/lib/utils"
import { Check, CheckCheck } from "lucide-react"

// ─── Types ───────────────────────────────────────────────

export type MessageType = "TEXT" | "SYSTEM" | "OFFER" | "FILE"
export type ReadStatus = "sent" | "read"

export interface DealMessage {
  id: string
  sender_id: string
  sender_name: string
  message_type: MessageType
  content: string
  metadata?: {
    offer?: OfferData
    file?: FileMetadata
  }
  read_at?: string | null
  created_at: string
}

interface MessageBubbleProps {
  message: DealMessage
  currentUserId: string
  onOfferAccept?: (messageId: string) => void
  onOfferReject?: (messageId: string) => void
  onOfferCounter?: (messageId: string, counter: { amount: number; conditions: string }) => void
}

// ─── Helpers ─────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

// ─── Component ───────────────────────────────────────────

export function MessageBubble({
  message,
  currentUserId,
  onOfferAccept,
  onOfferReject,
  onOfferCounter,
}: MessageBubbleProps) {
  const isSystem = message.message_type === "SYSTEM" || message.sender_id === "system"
  const isMine = !isSystem && message.sender_id === currentUserId

  const readStatus: ReadStatus = message.read_at ? "read" : "sent"

  // ── System message ──
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 max-w-[85%]">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {message.content}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  // ── User message (mine or other) ──
  return (
    <div className={cn("flex mb-3", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] space-y-1", isMine ? "items-end" : "items-start")}>
        {/* Sender name */}
        <p
          className={cn(
            "text-xs font-medium px-1",
            isMine
              ? "text-right text-blue-300 dark:text-blue-400"
              : "text-left text-gray-500 dark:text-gray-400"
          )}
        >
          {isMine ? "나" : message.sender_name}
        </p>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isMine
              ? "bg-[#1B3A5C] text-white rounded-tr-sm"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-sm"
          )}
        >
          {/* Text content */}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* File attachment */}
          {message.message_type === "FILE" && message.metadata?.file && (
            <FilePreview file={message.metadata.file} />
          )}

          {/* Offer card */}
          {message.message_type === "OFFER" && message.metadata?.offer && (
            <div className="mt-2">
              <OfferCard
                offer={message.metadata.offer}
                isMine={isMine}
                onAccept={
                  !isMine && onOfferAccept
                    ? () => onOfferAccept(message.id)
                    : undefined
                }
                onReject={
                  !isMine && onOfferReject
                    ? () => onOfferReject(message.id)
                    : undefined
                }
                onCounter={
                  !isMine && onOfferCounter
                    ? (counter) => onOfferCounter(message.id, counter)
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Timestamp + Read receipt */}
        <div
          className={cn(
            "flex items-center gap-1 px-1",
            isMine ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatTime(message.created_at)}
          </span>
          {isMine && (
            <span className="flex items-center">
              {readStatus === "read" ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
