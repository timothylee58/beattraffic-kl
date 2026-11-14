export type KnowledgeCategory =
  | 'line'
  | 'station'
  | 'interchange'
  | 'fare'
  | 'delay'
  | 'lrt3'
  | 'faq'
  | 'crowd'

export type KnowledgeLocale = 'en' | 'ms' | 'zh' | 'all'

export interface KnowledgeChunk {
  id: string
  text: string
  category: KnowledgeCategory
  locale: KnowledgeLocale
  line?: string
  station?: string
  tags: string[]
  source: string
  updatedAt: string
}

export interface RetrievedChunk extends KnowledgeChunk {
  score: number
}

export interface RagQueryOptions {
  locale?: KnowledgeLocale
  line?: string
  topK?: number
}

export interface RagQueryResult {
  chunks: RetrievedChunk[]
  mode: 'firebase' | 'local'
}
