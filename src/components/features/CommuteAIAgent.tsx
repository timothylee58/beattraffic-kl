import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, BookOpen, Send, Sparkles, Trash2, User, ScanText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { useAgent } from '../../contexts/AgentContext'
import { useAuth } from '../../hooks/useAuth'
import { blink } from '../../lib/blink'
import { QUICK_PROMPTS } from '../../lib/commuteAgent'
import { useLanguage } from '../../contexts/LanguageContext'

export function CommuteAIAgent() {
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { messages, scanInsights, ragSources, ragMode, isThinking, sendMessage, clearChat, clearScanInsights } = useAgent()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            {t.agent.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 space-y-4">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t.agent.signInPrompt}</p>
          <Button onClick={() => blink.auth.login()}>{t.nav.signIn}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-xl border-t-4 border-t-primary flex flex-col min-h-[520px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {t.agent.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t.agent.subtitle}</p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="shrink-0 text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {ragSources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              {t.agent.ragSources}
              <Badge variant="outline" className="text-[10px] h-5">
                {ragMode === 'firebase' ? t.agent.ragFirebase : t.agent.ragLocal}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ragSources.map(source => (
                <Badge key={source.id} variant="secondary" className="text-[10px] font-normal">
                  {source.category}
                  {source.line ? ` · ${source.line}` : ''}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {scanInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex flex-wrap gap-2 items-center"
          >
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ScanText className="h-3.5 w-3.5" />
              {t.agent.scanContext}
            </span>
            {scanInsights.slice(-3).map(insight => (
              <Badge key={insight.id} variant="secondary" className="text-xs font-normal max-w-[200px] truncate">
                {insight.documentType}: {insight.summary.slice(0, 40)}…
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearScanInsights}>
              {t.agent.clearScans}
            </Button>
          </motion.div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px] min-h-[280px]">
          {messages.length === 0 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground text-center">{t.agent.emptyState}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map(prompt => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3 whitespace-normal text-left max-w-[240px]"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent/20 text-accent-foreground'
                }`}
              >
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {isThinking && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3 flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t bg-background/80">
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.agent.inputPlaceholder}
              disabled={isThinking}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isThinking} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
