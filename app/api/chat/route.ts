import { NextResponse } from "next/server"
import type { CandidateLocation, Weights } from "@/lib/analysis"

type ChatMessage = {
  role?: "user" | "assistant"
  content?: string
}

type ChatContext = {
  step?: string
  weights?: Partial<Weights>
  selectedState?: string | null
  selectedStateName?: string
  selectedLocations?: Array<{
    display?: string
    state?: string
    lat?: number
    lon?: number
  }>
  currentSearchQuery?: string
  visibleSearchSuggestions?: Array<{
    display?: string
    state?: string
    lat?: number
    lon?: number
  }>
  analysisResults?: CandidateLocation[]
  detailLocation?: CandidateLocation | null
}

type ChatRequestBody = {
  messages?: ChatMessage[]
  context?: ChatContext
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
  error?: {
    message?: string
  }
}

type ChatProviderResult = {
  answer?: string
  error?: string
  status?: number
}

const MAX_MESSAGES = 10
const MAX_RESULTS = 6
const MAX_SUGGESTIONS = 10
const CHAT_INSTRUCTIONS =
  "You are an assistant embedded in a coding school location analysis app. Answer user questions using only the provided app context. Be concise, practical, and transparent when a question cannot be answered from the context. Do not invent local market data. Return only the final user-facing answer. Do not include reasoning notes, hidden chain-of-thought, planning text, analysis of the prompt, token ids, citation marker numbers, or stray digits attached to words."

function normalizeMessages(input: unknown): Required<ChatMessage>[] {
  if (!Array.isArray(input)) return []

  return input
    .filter((message): message is ChatMessage => {
      return Boolean(
        message &&
          typeof message === "object" &&
          (message as ChatMessage).role &&
          typeof (message as ChatMessage).content === "string"
      )
    })
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content).slice(0, 1200),
    }))
}

function compactContext(context?: ChatContext) {
  const scoreFormula =
    "total score = wealth raw score * wealth weight + family raw score * family weight + education raw score * education weight + competition raw score * competition weight + accessibility raw score * accessibility weight"

  return {
    currentScreen: context?.step ?? "unknown",
    map: {
      selectedState: context?.selectedState ?? null,
      selectedStateName: context?.selectedStateName ?? null,
      allStatesAvailableOnMap: usStateContext,
      note:
        "The map contains US state boundaries. City and address candidates are loaded only from the search/autocomplete API after the user types a query.",
    },
    search: {
      currentQuery: context?.currentSearchQuery ?? "",
      visibleSuggestions: (context?.visibleSearchSuggestions ?? []).slice(0, MAX_SUGGESTIONS),
    },
    selectedLocations: (context?.selectedLocations ?? []).slice(0, 5),
    weights: context?.weights ?? null,
    scoring: {
      formula: scoreFormula,
      rawScoreInputs:
        "Each ranked result includes rawScores and scoreMetrics. scoreMetrics contains the Census variables and API-derived metrics used to calculate the visible score.",
    },
    rankedResults: (context?.analysisResults ?? []).slice(0, MAX_RESULTS).map((location) => ({
      name: location.name,
      score: location.score,
      estimatedFamilies: location.estimatedFamilies,
      medianIncome: location.medianIncome,
      competition: location.competition,
      rationale: location.rationale,
      rawScores: location.rawScores,
      scoreMetrics: location.scoreMetrics,
    })),
    detailLocation: context?.detailLocation
      ? {
          name: context.detailLocation.name,
          score: context.detailLocation.score,
          estimatedFamilies: context.detailLocation.estimatedFamilies,
          medianIncome: context.detailLocation.medianIncome,
          competition: context.detailLocation.competition,
          rationale: context.detailLocation.rationale,
          rawScores: context.detailLocation.rawScores,
          scoreMetrics: context.detailLocation.scoreMetrics,
        }
      : null,
  }
}

const usStateContext = [
  { name: "Alabama", abbr: "AL" },
  { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" },
  { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" },
  { name: "Delaware", abbr: "DE" },
  { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" },
  { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" },
  { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" },
  { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" },
  { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" },
  { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" },
  { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" },
  { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" },
  { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" },
  { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" },
  { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" },
  { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" },
  { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" },
  { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" },
  { name: "Wyoming", abbr: "WY" },
]

function extractText(payload: OpenAIResponse): string {
  if (payload.output_text) return payload.output_text

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n")

  return cleanAssistantText(text || "I could not generate an answer from the available context.")
}

function cleanAssistantText(text: string): string {
  const withoutThinkBlocks = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>/i, "")

  const reasoningSentencePattern =
    /^(we need to|i need to|i should|i'll|i will|the user|the context|provided app context|i can|let's|so i'll|actually|but the raw|notice that|maybe|need to)\b/i
  const promptAnalysisPattern =
    /\b(user's question|provided app context|app context|ranked results|raw scores|score formula|i should provide|i need to be transparent|i'll focus|i'll mention)\b/i

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

async function callHuggingFaceRouter(
  hfKey: string,
  messages: Required<ChatMessage>[],
  appContext: ReturnType<typeof compactContext>
): Promise<ChatProviderResult> {
  const model = process.env.AI_MODEL || "deepseek-ai/DeepSeek-V4-Pro"
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: CHAT_INSTRUCTIONS },
        {
          role: "user",
          content: `App context:\n${JSON.stringify(appContext, null, 2)}`,
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      max_tokens: 500,
    }),
    cache: "no-store",
  })

  const text = await response.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    return {
      error: payload?.error?.message || payload?.error || text || "AI chat request failed.",
      status: response.status,
    }
  }

  let answer = payload?.choices?.[0]?.message?.content || ""
  if (answer.includes("</think>")) {
    answer = answer.split("</think>").pop()?.trim() || answer
  }

  return { answer: cleanAssistantText(answer || "I could not generate an answer from the AI service.") }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  const hfKey = process.env.HUGGINGFACE_API_KEY

  if (!apiKey && !hfKey) {
    return NextResponse.json(
      {
        error:
          "AI chat is not configured. Add OPENAI_API_KEY to your environment and restart the app.",
      },
      { status: 500 }
    )
  }

  try {
    let body: ChatRequestBody = {}
    try {
      const raw = await request.text()
      body = raw ? (JSON.parse(raw) as ChatRequestBody) : {}
    } catch (err) {
      return NextResponse.json(
        { error: `Invalid request body or body already read: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      )
    }
    const messages = normalizeMessages(body.messages)
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")

    if (!lastUserMessage?.content.trim()) {
      return NextResponse.json(
        { error: "Send a question to chat with the assistant." },
        { status: 400 }
      )
    }

    const appContext = compactContext(body.context)

    if (!apiKey && hfKey) {
      const hfResult = await callHuggingFaceRouter(hfKey, messages, appContext)
      if (hfResult.error) {
        return NextResponse.json({ error: hfResult.error }, { status: hfResult.status || 500 })
      }
      return NextResponse.json({ answer: hfResult.answer })
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions: CHAT_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `App context:\n${JSON.stringify(appContext, null, 2)}`,
              },
            ],
          },
          ...messages.map((message) => ({
            role: message.role,
            content: [
              {
                type: "input_text",
                text: message.content,
              },
            ],
          })),
        ],
        max_output_tokens: 500,
      }),
      cache: "no-store",
    })

    const payload = (await response.json()) as OpenAIResponse

    if (!response.ok) {
      if (hfKey) {
        const hfResult = await callHuggingFaceRouter(hfKey, messages, appContext)
        if (!hfResult.error) {
          return NextResponse.json({ answer: hfResult.answer })
        }
      }

      return NextResponse.json(
        { error: payload.error?.message || "AI chat request failed." },
        { status: response.status }
      )
    }

    return NextResponse.json({ answer: cleanAssistantText(extractText(payload)) })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not complete the AI chat request.",
      },
      { status: 500 }
    )
  }
}
