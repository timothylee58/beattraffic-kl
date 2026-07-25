import { blink } from './blink'
import type { ScanInsight, ScanSource } from '../types/agent'

interface OcrObject {
  rawText: string
  documentType: ScanInsight['documentType']
  ticketId?: string
  fromStation?: string
  toStation?: string
  line?: string
  fare?: string
  summary: string
}

const EXTRACTION_PROMPT = `You are an OCR engine for Klang Valley RapidKL/MRT/KTM transit in Malaysia.
Extract every readable detail from this image (Malay and English).
Respond with ONLY valid JSON (no markdown fences) using this shape:
{
  "rawText": "all readable text verbatim",
  "documentType": "ticket|station_sign|timetable|fare_table|unknown",
  "ticketId": "optional",
  "fromStation": "optional",
  "toStation": "optional",
  "line": "optional",
  "fare": "optional",
  "summary": "one sentence for a commute assistant"
}`

async function uploadScanImage(file: Blob): Promise<string> {
  const path = `scans/${Date.now()}-${crypto.randomUUID()}`
  const { publicUrl } = await blink.storage.upload(file, path)
  return publicUrl
}

function parseOcrJson(text: string): OcrObject {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned) as OcrObject
  if (!parsed.rawText || !parsed.summary) throw new Error('Incomplete OCR response')
  return parsed
}

/** Extracts structured transit text from a ticket, sign, or timetable image via Blink vision AI. */
export async function extractTransitFromImage(
  file: Blob,
  source: ScanSource = 'ocr',
): Promise<ScanInsight> {
  const imageUrl = await uploadScanImage(file)

  const { text } = await blink.ai.generateText({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image', image: imageUrl },
        ],
      },
    ],
    maxTokens: 800,
  })

  const parsed = parseOcrJson(text)

  return {
    id: crypto.randomUUID(),
    source,
    capturedAt: new Date().toISOString(),
    rawText: parsed.rawText,
    documentType: parsed.documentType ?? 'unknown',
    ticketId: parsed.ticketId,
    fromStation: parsed.fromStation,
    toStation: parsed.toStation,
    line: parsed.line,
    fare: parsed.fare,
    summary: parsed.summary,
    imageUrl,
  }
}

/** Builds a ScanInsight from a validated QR ticket without vision OCR. */
export function insightFromQrTicket(ticket: {
  id: string
  from_station_id: string
  to_station_id: string
  fare: number
  status: string
  qr_code?: string
}): ScanInsight {
  return {
    id: crypto.randomUUID(),
    source: 'qr',
    capturedAt: new Date().toISOString(),
    rawText: ticket.qr_code ?? ticket.id,
    documentType: 'ticket',
    ticketId: ticket.id,
    fromStation: ticket.from_station_id,
    toStation: ticket.to_station_id,
    fare: `RM ${ticket.fare.toFixed(2)}`,
    summary: `Valid ${ticket.status} ticket from ${ticket.from_station_id} to ${ticket.to_station_id} (${ticket.fare.toFixed(2)} MYR).`,
  }
}
