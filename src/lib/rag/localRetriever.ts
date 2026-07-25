import type { KnowledgeChunk, KnowledgeLocale, RagQueryOptions, RetrievedChunk } from './types'
import { TRANSIT_KNOWLEDGE_CORPUS } from './corpus'

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function scoreChunk(queryTokens: string[], chunk: KnowledgeChunk, locale?: KnowledgeLocale): number {
  const chunkTokens = new Set([
    ...tokenize(chunk.text),
    ...chunk.tags.map(t => t.toLowerCase()),
    ...(chunk.line ? [chunk.line.toLowerCase()] : []),
    ...(chunk.station ? [chunk.station.toLowerCase()] : []),
  ])

  let overlap = 0
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) overlap += 1
    else {
      for (const ct of chunkTokens) {
        if (ct.includes(token) || token.includes(ct)) {
          overlap += 0.5
          break
        }
      }
    }
  }

  let score = queryTokens.length > 0 ? overlap / queryTokens.length : 0

  if (locale && (chunk.locale === locale || chunk.locale === 'all')) score += 0.15
  if (locale && chunk.locale !== locale && chunk.locale !== 'all') score -= 0.1

  return score
}

/** Hybrid keyword + metadata retriever — works offline without Firebase. */
export function retrieveLocal(
  query: string,
  options: RagQueryOptions = {},
): RetrievedChunk[] {
  const topK = options.topK ?? 5
  const queryTokens = tokenize(query)
  const locale = options.locale

  const scored = TRANSIT_KNOWLEDGE_CORPUS.map(chunk => ({
    ...chunk,
    score: scoreChunk(queryTokens, chunk, locale),
  }))
    .filter(c => c.score > 0.05)
    .sort((a, b) => b.score - a.score)

  if (options.line) {
    const lineLower = options.line.toLowerCase()
    const lineBoosted = scored.map(c => ({
      ...c,
      score: c.line?.toLowerCase() === lineLower ? c.score + 0.3 : c.score,
    }))
    lineBoosted.sort((a, b) => b.score - a.score)
    return lineBoosted.slice(0, topK)
  }

  return scored.slice(0, topK)
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''
  return `\n\nRetrieved knowledge (cite when relevant):\n${chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.category}${c.line ? ` · ${c.line}` : ''}) ${c.text}\n    Source: ${c.source}`,
    )
    .join('\n')}`
}
