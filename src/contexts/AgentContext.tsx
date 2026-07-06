import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { chatWithCommuteAgent } from '../lib/commuteAgent'
import type { AgentMessage, ScanInsight } from '../types/agent'
import type { RetrievedChunk } from '../lib/rag/types'
import { useLanguage } from './LanguageContext'

interface AgentContextValue {
  scanInsights: ScanInsight[]
  messages: AgentMessage[]
  ragSources: RetrievedChunk[]
  ragMode: 'firebase' | 'local' | null
  isThinking: boolean
  addScanInsight: (insight: ScanInsight) => void
  clearScanInsights: () => void
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLanguage()
  const [scanInsights, setScanInsights] = useState<ScanInsight[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [ragSources, setRagSources] = useState<RetrievedChunk[]>([])
  const [ragMode, setRagMode] = useState<'firebase' | 'local' | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  const addScanInsight = useCallback((insight: ScanInsight) => {
    setScanInsights(prev => [...prev, insight].slice(-10))
  }, [])

  const clearScanInsights = useCallback(() => setScanInsights([]), [])

  const clearChat = useCallback(() => {
    setMessages([])
    setRagSources([])
    setRagMode(null)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isThinking) return

      const userMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      setMessages(prev => [...prev, userMsg])
      setIsThinking(true)

      try {
        const reply = await chatWithCommuteAgent(trimmed, [...messages, userMsg], scanInsights, locale)
        setRagSources(reply.ragSources)
        setRagMode(reply.ragMode)
        const assistantMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply.text,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
      } catch {
        setRagSources([])
        setRagMode(null)
        const errorMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'Sorry — I could not reach the AI service right now. Check your connection and try again.',
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errorMsg])
      } finally {
        setIsThinking(false)
      }
    },
    [isThinking, messages, scanInsights, locale],
  )

  const value = useMemo(
    () => ({
      scanInsights,
      messages,
      ragSources,
      ragMode,
      isThinking,
      addScanInsight,
      clearScanInsights,
      sendMessage,
      clearChat,
    }),
    [
      scanInsights,
      messages,
      ragSources,
      ragMode,
      isThinking,
      addScanInsight,
      clearScanInsights,
      sendMessage,
      clearChat,
    ],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}
