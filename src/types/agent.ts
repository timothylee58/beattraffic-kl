export type ScanSource = 'qr' | 'ocr' | 'manual'

export interface ScanInsight {
  id: string
  source: ScanSource
  capturedAt: string
  rawText: string
  documentType: 'ticket' | 'station_sign' | 'timetable' | 'fare_table' | 'unknown'
  ticketId?: string
  fromStation?: string
  toStation?: string
  line?: string
  fare?: string
  summary: string
  imageUrl?: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
