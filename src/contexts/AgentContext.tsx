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

interface AgentContextValue {
  scanInsights: ScanInsight[]
  messages: AgentMessage[]
  isThinking: boolean
  addScanInsight: (insight: ScanInsight) => void
  clearScanInsights: () => void
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [scanInsights, setScanInsights] = useState<ScanInsight[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)

  const addScanInsight = useCallback((insight: ScanInsight) => {
    setScanInsights(prev => [...prev, insight].slice(-10))
  }, [])

  const clearScanInsights = useCallback(() => setScanInsights([]), [])

  const clearChat = useCallback(() => setMessages([]), [])

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
        const reply = await chatWithCommuteAgent(trimmed, [...messages, userMsg], scanInsights)
        const assistantMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
      } catch {
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
    [isThinking, messages, scanInsights],
  )

  const value = useMemo(
    () => ({
      scanInsights,
      messages,
      isThinking,
      addScanInsight,
      clearScanInsights,
      sendMessage,
      clearChat,
    }),
    [scanInsights, messages, isThinking, addScanInsight, clearScanInsights, sendMessage, clearChat],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}
