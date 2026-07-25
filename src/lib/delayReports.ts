import { blink } from './blink'
import type { TransitLineCode } from './transitData'

export interface DelayReport {
  id: string
  line: TransitLineCode
  severity: 'minor' | 'moderate' | 'severe'
  reported_at: string
}

const EXPIRY_MS = 30 * 60 * 1000  // 30 minutes

// ── Local fallback (no-auth path) ────────────────────────────────────────────
const LOCAL_KEY = 'beattraffic_delay_reports'

function readLocal(): DelayReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const all: DelayReport[] = JSON.parse(raw)
    const cutoff = Date.now() - EXPIRY_MS
    return all.filter(r => new Date(r.reported_at).getTime() > cutoff)
  } catch {
    return []
  }
}

function writeLocal(reports: DelayReport[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(reports))
  } catch {
    // storage full — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Submit a crowd-sourced delay report for a line.
 * Saves to Blink DB if available, falls back to localStorage.
 */
export async function submitDelayReport(
  line: TransitLineCode,
  severity: DelayReport['severity'],
): Promise<void> {
  const report: Omit<DelayReport, 'id'> = {
    line,
    severity,
    reported_at: new Date().toISOString(),
  }

  // Optimistic local write first (always works)
  const local = readLocal()
  const localEntry: DelayReport = { ...report, id: `local_${Date.now()}` }
  writeLocal([...local, localEntry])

  // Attempt DB write (best-effort; fails silently when table absent)
  try {
    await blink.db.delay_reports.create({ data: report })
  } catch {
    // DB table not yet provisioned — local fallback is sufficient
  }
}

/**
 * Return active (< 30 min old) reports for all lines, or a specific line.
 * Merges DB results with local reports, deduplicates by id.
 */
export async function fetchActiveReports(line?: TransitLineCode): Promise<DelayReport[]> {
  const cutoffIso = new Date(Date.now() - EXPIRY_MS).toISOString()
  let dbReports: DelayReport[] = []

  try {
    const where = line
      ? { line, reported_at: { gte: cutoffIso } }
      : { reported_at: { gte: cutoffIso } }
    const { data } = await blink.db.delay_reports.list({ where, orderBy: { reported_at: 'desc' } })
    dbReports = (data ?? []) as DelayReport[]
  } catch {
    // DB unavailable — use local only
  }

  const localReports = readLocal().filter(r => !line || r.line === line)

  // Merge: prefer DB records; local records fill the gap
  const dbIds = new Set(dbReports.map(r => r.id))
  const merged = [
    ...dbReports,
    ...localReports.filter(r => !dbIds.has(r.id)),
  ]

  // Sort newest-first
  return merged.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())
}

/** Counts of active reports per line, for display in the panel. */
export type ReportCounts = Partial<Record<TransitLineCode, number>>

export async function fetchReportCounts(): Promise<ReportCounts> {
  const reports = await fetchActiveReports()
  const counts: ReportCounts = {}
  for (const r of reports) {
    counts[r.line] = (counts[r.line] ?? 0) + 1
  }
  return counts
}
