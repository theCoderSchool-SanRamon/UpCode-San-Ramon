"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CandidateLocation, Weights } from "@/lib/analysis"
import { cn } from "@/lib/utils"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatLocation = {
  display?: string
  state?: string
  lat?: number
  lon?: number
}

export type AIChatContext = {
  step: string
  weights: Weights
  selectedState: string | null
  selectedStateName?: string
  selectedLocations: ChatLocation[]
  currentSearchQuery?: string
  visibleSearchSuggestions?: ChatLocation[]
  analysisResults: CandidateLocation[]
  detailLocation: CandidateLocation | null
}

type AIChatProps = {
  context: AIChatContext
}

const STARTER_MESSAGE =
  "Ask me about your ranked locations, scores, factor weights, or which market looks strongest."

export function AIChat({ context }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: STARTER_MESSAGE,
    },
  ])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasAnalysis = context.analysisResults.length > 0
  const placeholder = hasAnalysis
    ? "Ask about these results..."
    : "Ask about setup or next steps..."

  const apiMessages = useMemo(
    () => messages.filter((message) => message.content !== STARTER_MESSAGE),
    [messages]
  )

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    setError(null)
    if (nextOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = input.trim()
    if (!question || isSending) return

    const nextMessages: ChatMessage[] = [
      ...apiMessages,
      {
        role: "user",
        content: question,
      },
    ]

    setMessages((prev) => [...prev, { role: "user", content: question }])
    setInput("")
    setIsSending(true)
    setError(null)

    try {
      const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "/api/chat"

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          context,
        }),
      })

      const contentType = response.headers.get("content-type") || ""
      const payload = (contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() }) as {
        answer?: string
        reply?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || "Chat request failed.")
      }

      const answer = sanitizeAssistantText(payload.answer || payload.reply || "")

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer || "I could not answer that from the current results.",
        },
      ])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chat request failed.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1300] flex max-w-[calc(100vw-2.5rem)] flex-col items-end">
      {isOpen && (
        <section className="mb-3 flex h-[520px] w-[380px] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">MarketLens Chatbot</h2>
                <p className="text-xs text-muted-foreground">
                  {hasAnalysis ? "Using current rankings" : "Waiting for analysis"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8 p-0"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {formatChatMessage(message.content)}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-primary/20"
              aria-label="Ask the MarketLens Chatbot"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || isSending} className="h-10 w-10 p-0">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </section>
      )}

      <Button
        type="button"
        onClick={() => handleOpenChange(!isOpen)}
        className="h-12 w-12 rounded-full p-0 shadow-lg"
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  )
}

function sanitizeAssistantText(text: string) {
  const withoutThinkBlocks = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>/i, "")

  const reasoningSentencePattern =
    /^(we are asked|we need to|we'll|we have|i need to|i should|i'll|i will|the user|the context|the current detail location|provided app context|i can|let's|so i'll|actually|but note|but the raw|notice that|maybe|need to|looking at|given the app)\b/i
  const promptAnalysisPattern =
    /\b(user's question|provided app context|app context|ranked results|raw scores|raw family score|the weights are|weighted contributions|score formula|strongest factor might|we should interpret|the question might|i should provide|i need to be transparent|i'll focus|i'll mention|based solely on the app data)\b/i

  const sentences = withoutThinkBlocks.split(/(?<=[.!?])\s+/)
  let firstAnswerSentenceIndex = sentences.findIndex((sentence) => {
    const trimmed = sentence.trim()
    return (
      trimmed &&
      !reasoningSentencePattern.test(trimmed) &&
      !promptAnalysisPattern.test(trimmed)
    )
  })

  if (firstAnswerSentenceIndex === -1) {
    firstAnswerSentenceIndex = 0
  }

  return sentences
    .slice(firstAnswerSentenceIndex)
    .join(" ")
    .replace(/(?<=[A-Za-z])\d{1,3}\b/g, "")
    .replace(/\b\d{1,3}(?=[A-Za-z])/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function formatChatMessage(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    return part
  })
}
