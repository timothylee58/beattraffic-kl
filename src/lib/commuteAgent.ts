import { blink } from './blink'
import type { AgentMessage, ScanInsight } from '../types/agent'

const SYSTEM_PROMPT = `You are the Beat KL traffic Commute AI for Klang Valley, Malaysia.
Your mission: help commuters beat traffic jams by choosing faster public transit (MRT, LRT, LRT3 Shah Alam, KTM, Monorail, RapidKL buses).
Be concise, practical, and line-aware. Mention interchange hubs (Bandar Utama, Glenmarie 2, KL Sentral) when relevant.
When scan context is provided, reference it directly and suggest next actions (validate ticket, plan route, check delays).`

function formatScanContext(insights: ScanInsight[]): string {
  if (insights.length === 0) return ''
  const latest = insights.slice(-3)
  return `\n\nRecent scan context:\n${latest
    .map(
      (s, i) =>
        `[${i + 1}] ${s.source.toUpperCase()} · ${s.documentType}\nSummary: ${s.summary}\nRaw: ${s.rawText.slice(0, 400)}`,
    )
    .join('\n\n')}`
}

export async function chatWithCommuteAgent(
  userMessage: string,
  history: AgentMessage[],
  scanInsights: ScanInsight[],
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + formatScanContext(scanInsights) },
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const { text } = await blink.ai.generateText({ messages, maxTokens: 600 })
  return text
}

export const QUICK_PROMPTS = [
  'Fastest route from KL Sentral to Shah Alam avoiding jams?',
  'Is LRT3 Shah Alam running normally today?',
  'What does my scanned ticket mean?',
  'Best interchange to reach Klang from PJ?',
] as const
