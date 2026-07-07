import * as admin from 'firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const COLLECTION = 'knowledge_chunks'
const EMBEDDING_DIM = 768

export interface StoredChunk {
  id: string
  text: string
  category: string
  locale: string
  line?: string
  station?: string
  tags: string[]
  source: string
  updatedAt: string
  embedding?: number[]
}

function getDb() {
  if (!admin.apps.length) admin.initializeApp()
  return admin.firestore()
}

function getGenAI(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  return new GoogleGenerativeAI(key)
}

export async function embedText(text: string): Promise<number[] | null> {
  const genAI = getGenAI()
  if (!genAI) return null
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)
    const values = result.embedding.values
    return values.length === EMBEDDING_DIM ? values : values.slice(0, EMBEDDING_DIM)
  } catch (error) {
    console.warn('Embedding failed, falling back to keyword search:', error)
    return null
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8)
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function keywordScore(query: string, chunk: StoredChunk): number {
  const queryTokens = tokenize(query)
  const haystack = [chunk.text, ...chunk.tags, chunk.line ?? '', chunk.station ?? ''].join(' ').toLowerCase()
  let hits = 0
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits += 1
  }
  return queryTokens.length > 0 ? hits / queryTokens.length : 0
}

export async function ingestChunks(chunks: StoredChunk[]): Promise<number> {
  const db = getDb()
  const batch = db.batch()
  let count = 0

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text)
    const ref = db.collection(COLLECTION).doc(chunk.id)
    batch.set(ref, {
      ...chunk,
      ...(embedding ? { embedding: admin.firestore.FieldValue.vector(embedding) } : {}),
    })
    count++
  }

  await batch.commit()
  return count
}

export async function queryChunks(
  query: string,
  options: { locale?: string; line?: string; topK?: number } = {},
): Promise<Array<StoredChunk & { score: number }>> {
  const db = getDb()
  const topK = options.topK ?? 5
  const snapshot = await db.collection(COLLECTION).get()

  if (snapshot.empty) return []

  const chunks: StoredChunk[] = snapshot.docs.map(doc => doc.data() as StoredChunk)
  const queryEmbedding = await embedText(query)

  let scored = chunks.map(chunk => {
    let score = 0
    if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
      score = cosineSimilarity(queryEmbedding, chunk.embedding)
    } else {
      score = keywordScore(query, chunk)
    }
    if (options.locale && (chunk.locale === options.locale || chunk.locale === 'all')) score += 0.1
    if (options.line && chunk.line?.toLowerCase() === options.line.toLowerCase()) score += 0.2
    return { ...chunk, score }
  })

  scored = scored.filter(c => c.score > 0.05).sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
