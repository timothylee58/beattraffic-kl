import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions, isFirebaseConfigured } from '../firebase'
import type { RagQueryOptions, RagQueryResult } from './types'
import { retrieveLocal } from './localRetriever'

interface RagQueryRequest {
  query: string
  locale?: string
  line?: string
  topK?: number
}

interface RagQueryResponse {
  chunks: Array<{
    id: string
    text: string
    category: string
    locale: string
    line?: string
    station?: string
    tags: string[]
    source: string
    updatedAt: string
    score: number
  }>
}

/** Queries Firebase Cloud Function for vector RAG, falls back to local hybrid search. */
export async function retrieveKnowledge(
  query: string,
  options: RagQueryOptions = {},
): Promise<RagQueryResult> {
  if (isFirebaseConfigured()) {
    try {
      const ragQuery = httpsCallable<RagQueryRequest, RagQueryResponse>(
        getFirebaseFunctions(),
        'ragQuery',
      )
      const { data } = await ragQuery({
        query,
        locale: options.locale,
        line: options.line,
        topK: options.topK ?? 5,
      })

      if (data.chunks?.length > 0) {
        return {
          mode: 'firebase',
          chunks: data.chunks.map(c => ({
            id: c.id,
            text: c.text,
            category: c.category as RagQueryResult['chunks'][0]['category'],
            locale: c.locale as RagQueryResult['chunks'][0]['locale'],
            line: c.line,
            station: c.station,
            tags: c.tags,
            source: c.source,
            updatedAt: c.updatedAt,
            score: c.score,
          })),
        }
      }
    } catch (error) {
      console.warn('Firebase RAG unavailable, using local retriever:', error)
    }
  }

  return {
    mode: 'local',
    chunks: retrieveLocal(query, options),
  }
}
