import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CheckCircle2, XCircle, Ticket, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'

type ScanState = 'idle' | 'camera' | 'manual' | 'validating' | 'valid' | 'invalid'

interface TicketResult {
  id: string
  from_station_id: string
  to_station_id: string
  fare: number
  status: string
}

declare class BarcodeDetector {
  constructor(options: { formats: string[] })
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

const CAMERA_SUPPORTED =
  typeof window !== 'undefined' &&
  'BarcodeDetector' in window &&
  'mediaDevices' in navigator

export function QRScanner() {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setCameraError(null)
    setScanState('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            stopCamera()
            await validateTicket(codes[0].rawValue)
          }
        } catch { /* frame not ready yet */ }
      }, 500)
    } catch {
      setCameraError('Camera access denied. Use manual input instead.')
      setScanState('manual')
    }
  }

  const validateTicket = async (qrValue: string) => {
    setScanState('validating')
    setTicketResult(null)
    setErrorMsg(null)
    try {
      const { data } = await blink.db.tickets.list({ where: { qr_code: qrValue } })
      if (data && data.length > 0) {
        setTicketResult(data[0] as TicketResult)
        setScanState('valid')
      } else {
        setErrorMsg('No ticket found for this QR code.')
        setScanState('invalid')
      }
    } catch {
      setErrorMsg('Validation failed. Please try again.')
      setScanState('invalid')
    }
  }

  const reset = () => {
    stopCamera()
    setScanState('idle')
    setManualCode('')
    setTicketResult(null)
    setErrorMsg(null)
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          QR Ticket Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(scanState === 'idle') && (
          <div className="space-y-3">
            <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 text-muted-foreground">
              <Camera className="h-10 w-10 opacity-30" />
              <p className="text-sm text-center">Point your camera at a Beat KL traffic ticket QR code</p>
            </div>
            <div className="flex gap-2">
              {CAMERA_SUPPORTED ? (
                <Button onClick={startCamera} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Scan via Camera
                </Button>
              ) : (
                <Button variant="outline" disabled className="flex-1">
                  <CameraOff className="h-4 w-4 mr-2" />
                  Camera not supported
                </Button>
              )}
              <Button variant="outline" onClick={() => setScanState('manual')} className="flex-1">
                Enter Code
              </Button>
            </div>
          </div>
        )}

        {scanState === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-accent rounded-2xl opacity-80" />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Align QR code within the frame</p>
            <Button variant="outline" onClick={reset} className="w-full">Cancel</Button>
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
            <p className="text-sm text-muted-foreground">Enter the ticket ID or QR code value manually:</p>
            <Input
              placeholder="e.g. RAPIDKL-T-A1B2C3-KJ16-MR6"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualCode && validateTicket(manualCode)}
            />
            <div className="flex gap-2">
              <Button onClick={() => validateTicket(manualCode)} disabled={!manualCode} className="flex-1">
                Validate
              </Button>
              <Button variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}

        {scanState === 'validating' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Validating ticket…</p>
          </div>
        )}

        {scanState === 'valid' && ticketResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Valid Ticket</p>
                <p className="text-sm text-green-700">Status: {ticketResult.status}</p>
              </div>
            </div>
            <div className="rounded-xl border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="font-mono font-medium">{ticketResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">{ticketResult.from_station_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{ticketResult.to_station_id}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Fare</span>
                <span className="font-bold text-primary">RM {ticketResult.fare.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={reset} className="w-full">Scan Another</Button>
          </div>
        )}

        {scanState === 'invalid' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <XCircle className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-red-800">Invalid Ticket</p>
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            </div>
            <Button onClick={reset} variant="outline" className="w-full">Try Again</Button>
          </div>
        )}

        {!user && scanState === 'idle' && (
          <p className="text-xs text-center text-muted-foreground">
            Sign in required to validate tickets against your account.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
