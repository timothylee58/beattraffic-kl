import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { ingestChunks, queryChunks, type StoredChunk } from './rag'
import { TRANSIT_KNOWLEDGE_CORPUS } from './corpus-data'

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 })

/** Vector + keyword RAG query — embeds question, searches Firestore knowledge_chunks. */
export const ragQuery = onCall(
  { secrets: ['GEMINI_API_KEY'], cors: true },
  async request => {
    const { query, locale, line, topK } = request.data as {
      query?: string
      locale?: string
      line?: string
      topK?: number
    }

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new HttpsError('invalid-argument', 'query must be a non-empty string')
    }

    const chunks = await queryChunks(query.trim(), { locale, line, topK })
    return { chunks }
  },
)

/** Admin-only: seed or refresh the knowledge corpus with embeddings. */
export const ragIngest = onCall(
  { secrets: ['GEMINI_API_KEY'], cors: true },
  async request => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Admin claim required for ingest')
    }

    const count = await ingestChunks(TRANSIT_KNOWLEDGE_CORPUS as StoredChunk[])
    return { ingested: count }
  },
)
