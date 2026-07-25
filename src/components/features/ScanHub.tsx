import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Ticket,
  AlertTriangle,
  ScanText,
  Upload,
  Sparkles,
  QrCode,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'
import { useAgent } from '../../contexts/AgentContext'
import { extractTransitFromImage, insightFromQrTicket } from '../../lib/ocrService'
import type { ScanInsight } from '../../types/agent'
import { useLanguage } from '../../contexts/LanguageContext'

type ScanState = 'idle' | 'camera' | 'manual' | 'ocr-processing' | 'validating' | 'valid' | 'invalid' | 'ocr-done'

interface TicketResult {
  id: string
  from_station_id: string
  to_station_id: string
  fare: number
  status: string
  qr_code?: string
}

declare class BarcodeDetector {
  constructor(options: { formats: string[] })
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

const CAMERA_SUPPORTED =
  typeof window !== 'undefined' &&
  'BarcodeDetector' in window &&
  'mediaDevices' in navigator

interface ScanHubProps {
  onAskAi?: (insight: ScanInsight) => void
}

export function ScanHub({ onAskAi }: ScanHubProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { addScanInsight } = useAgent()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [mode, setMode] = useState<'qr' | 'ocr'>('qr')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null)
  const [ocrInsight, setOcrInsight] = useState<ScanInsight | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  useEffect(() => () => stopCamera(), [])

  const pushInsight = (insight: ScanInsight) => {
    addScanInsight(insight)
    setOcrInsight(insight)
  }

  const startCamera = async (forOcr = false) => {
    setCameraError(null)
    setScanState('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      if (forOcr) return

      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            stopCamera()
            await validateTicket(codes[0].rawValue)
          }
        } catch {
          /* frame not ready */
        }
      }, 500)
    } catch {
      setCameraError(t.scanner.cameraDenied)
      setScanState('manual')
    }
  }

  const captureOcrFrame = async () => {
    if (!videoRef.current) return
    setScanState('ocr-processing')
    stopCamera()
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(video, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/jpeg', 0.92)
      })
      const insight = await extractTransitFromImage(blob, 'ocr')
      pushInsight(insight)
      setScanState('ocr-done')
    } catch {
      setErrorMsg(t.scanner.ocrFailed)
      setScanState('invalid')
    }
  }

  const handleFileUpload = async (file: File) => {
    setScanState('ocr-processing')
    setErrorMsg(null)
    try {
      const insight = await extractTransitFromImage(file, 'ocr')
      pushInsight(insight)
      setScanState('ocr-done')
    } catch {
      setErrorMsg(t.scanner.ocrFailed)
      setScanState('invalid')
    }
  }

  const validateTicket = async (qrValue: string) => {
    setScanState('validating')
    setTicketResult(null)
    setErrorMsg(null)
    try {
      const { data } = await blink.db.tickets.list({ where: { qr_code: qrValue } })
      if (data && data.length > 0) {
        const ticket = data[0] as TicketResult
        setTicketResult(ticket)
        pushInsight(insightFromQrTicket(ticket))
        setScanState('valid')
      } else {
        setErrorMsg(t.scanner.ticketNotFound)
        setScanState('invalid')
      }
    } catch {
      setErrorMsg(t.scanner.validationFailed)
      setScanState('invalid')
    }
  }

  const reset = () => {
    stopCamera()
    setScanState('idle')
    setManualCode('')
    setTicketResult(null)
    setOcrInsight(null)
    setErrorMsg(null)
  }

  const handleAskAi = () => {
    const insight = ocrInsight ?? (ticketResult ? insightFromQrTicket(ticketResult) : null)
    if (insight) onAskAi?.(insight)
  }

  return (
    <Card className="w-full shadow-xl border-t-4 border-t-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-accent" />
          {t.scanner.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t.scanner.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={v => { reset(); setMode(v as 'qr' | 'ocr') }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              {t.scanner.qrTab}
            </TabsTrigger>
            <TabsTrigger value="ocr" className="gap-2">
              <ScanText className="h-4 w-4" />
              {t.scanner.ocrTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4 mt-4">
            <AnimatePresence mode="wait">
              {scanState === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-4 text-muted-foreground">
                    <Ticket className="h-10 w-10 opacity-30" />
                    <p className="text-sm text-center">{t.scanner.qrHint}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {CAMERA_SUPPORTED ? (
                      <Button onClick={() => startCamera(false)} className="flex-1 min-w-[140px]">
                        <Camera className="h-4 w-4 mr-2" />
                        {t.scanner.scanCamera}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="flex-1 min-w-[140px]">
                        <CameraOff className="h-4 w-4 mr-2" />
                        {t.scanner.cameraUnsupported}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setScanState('manual')} className="flex-1 min-w-[140px]">
                      {t.scanner.enterCode}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="ocr" className="space-y-4 mt-4">
            {scanState === 'idle' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-4 text-muted-foreground bg-accent/5">
                  <ScanText className="h-10 w-10 opacity-40 text-accent" />
                  <p className="text-sm text-center max-w-sm">{t.scanner.ocrHint}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {CAMERA_SUPPORTED && (
                    <Button onClick={() => startCamera(true)} className="flex-1 min-w-[140px]">
                      <Camera className="h-4 w-4 mr-2" />
                      {t.scanner.captureSign}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1 min-w-[140px]">
                    <Upload className="h-4 w-4 mr-2" />
                    {t.scanner.uploadImage}
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                    e.target.value = ''
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {scanState === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border-2 rounded-2xl opacity-80 ${mode === 'ocr' ? 'w-full h-full border-accent/60 m-4' : 'w-48 h-48 border-accent'}`} />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {mode === 'ocr' ? t.scanner.ocrAlign : t.scanner.qrAlign}
            </p>
            <div className="flex gap-2">
              {mode === 'ocr' && (
                <Button onClick={captureOcrFrame} className="flex-1">
                  <ScanText className="h-4 w-4 mr-2" />
                  {t.scanner.runOcr}
                </Button>
              )}
              <Button variant="outline" onClick={reset} className={mode === 'ocr' ? '' : 'w-full'}>
                {t.scanner.cancel}
              </Button>
            </div>
          </div>
        )}

        {scanState === 'manual' && (
          <div className="space-y-3">
            {cameraError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {cameraError}
              </div>
            )}
            <Input
              placeholder={t.scanner.manualPlaceholder}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualCode && validateTicket(manualCode)}
            />
            <div className="flex gap-2">
              <Button onClick={() => validateTicket(manualCode)} disabled={!manualCode} className="flex-1">
                {t.scanner.validate}
              </Button>
              <Button variant="outline" onClick={reset}>{t.scanner.cancel}</Button>
            </div>
          </div>
        )}

        {(scanState === 'validating' || scanState === 'ocr-processing') && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">
              {scanState === 'ocr-processing' ? t.scanner.ocrProcessing : t.scanner.validating}
            </p>
          </div>
        )}

        {scanState === 'valid' && ticketResult && (
          <ResultPanel
            title={t.scanner.validTicket}
            variant="success"
            rows={[
              [t.scanner.ticketId, ticketResult.id],
              [t.scanner.from, ticketResult.from_station_id],
              [t.scanner.to, ticketResult.to_station_id],
              [t.scanner.fare, `RM ${ticketResult.fare.toFixed(2)}`],
            ]}
            onReset={reset}
            onAskAi={handleAskAi}
            askLabel={t.scanner.askAi}
            resetLabel={t.scanner.scanAnother}
          />
        )}

        {scanState === 'ocr-done' && ocrInsight && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-4">
              <CheckCircle2 className="h-8 w-8 text-teal-600 shrink-0" />
              <div>
                <p className="font-bold text-teal-800">{t.scanner.ocrComplete}</p>
                <p className="text-sm text-teal-700 capitalize">{ocrInsight.documentType.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="rounded-xl border p-4 space-y-2 text-sm">
              <p className="text-muted-foreground">{ocrInsight.summary}</p>
              <pre className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                {ocrInsight.rawText}
              </pre>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleAskAi} className="flex-1 min-w-[160px]">
                <Sparkles className="h-4 w-4 mr-2" />
                {t.scanner.askAi}
              </Button>
              <Button variant="outline" onClick={reset}>{t.scanner.scanAnother}</Button>
            </div>
          </div>
        )}

        {scanState === 'invalid' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <XCircle className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-red-800">{t.scanner.failed}</p>
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            </div>
            <Button onClick={reset} variant="outline" className="w-full">{t.scanner.tryAgain}</Button>
          </div>
        )}

        {!user && scanState === 'idle' && (
          <p className="text-xs text-center text-muted-foreground">{t.scanner.signInHint}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ResultPanel({
  title,
  variant,
  rows,
  onReset,
  onAskAi,
  askLabel,
  resetLabel,
}: {
  title: string
  variant: 'success'
  rows: [string, string][]
  onReset: () => void
  onAskAi: () => void
  askLabel: string
  resetLabel: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
        <p className="font-bold text-green-800">{title}</p>
      </div>
      <div className="rounded-xl border p-4 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onAskAi} className="flex-1 min-w-[160px]">
          <Sparkles className="h-4 w-4 mr-2" />
          {askLabel}
        </Button>
        <Button onClick={onReset} variant="outline">{resetLabel}</Button>
      </div>
    </div>
  )
}
