import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'
import Spinner from '../common/Spinner'

/**
 * IDCardScanner — opens the teacher's camera to scan a student's static QR code.
 *
 * Props:
 *   onScan(studentId: string)  — called when a valid QR is decoded
 *   onError(message: string)   — called on unrecoverable errors
 */
export default function IDCardScanner({ onScan, onError }) {
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | requesting | scanning | error | success
  const [errorMsg, setErrorMsg] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const SCANNER_ID = 'id-card-scanner'

  const startScanner = async () => {
    setStatus('requesting')
    setErrorMsg('')

    // Request camera permission explicitly first
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (permErr) {
      const msg = permErr.name === 'NotAllowedError'
        ? 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
        : `Could not access camera: ${permErr.message}`
      setErrorMsg(msg)
      setStatus('error')
      onError?.(msg)
      return
    }

    const html5QrCode = new Html5Qrcode(SCANNER_ID)
    scannerRef.current = html5QrCode

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent rapid duplicate scans
          if (decodedText === lastScanned) return
          setLastScanned(decodedText)
          setStatus('success')
          onScan?.(decodedText)

          // Reset after 2 seconds to allow next scan
          setTimeout(() => {
            setLastScanned(null)
            setStatus('scanning')
          }, 2000)
        },
        () => { /* QR not found in frame — ignore */ }
      )
      setStatus('scanning')
    } catch (err) {
      const msg = `Failed to start scanner: ${err?.message || err}`
      setErrorMsg(msg)
      setStatus('error')
      onError?.(msg)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (_) {}
      scannerRef.current = null
    }
    setStatus('idle')
    setLastScanned(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Scanner viewport */}
      <div className="relative w-full max-w-sm">
        {/* The div html5-qrcode will mount its video into */}
        <div
          id={SCANNER_ID}
          className="w-full rounded-2xl overflow-hidden bg-slate-900/60 min-h-[300px] flex items-center justify-center"
        />

        {/* Overlay states shown on top */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/80 border border-white/10">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <Camera size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">Camera is off</p>
          </div>
        )}

        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/90">
            <Spinner size="lg" />
            <p className="text-slate-400 text-sm">Requesting camera access...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 animate-fade-in">
            <CheckCircle size={40} className="text-emerald-400" />
            <p className="text-emerald-300 font-semibold">QR Scanned!</p>
            <p className="text-emerald-400/70 text-xs">Processing...</p>
          </div>
        )}

        {/* Scanning corners overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-[15%] border-2 border-transparent">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && (
        <div className="w-full max-w-sm flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-fade-in">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Camera Error</p>
            <p className="text-red-400/70 text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-3">
        {(status === 'idle' || status === 'error') && (
          <button onClick={startScanner} className="btn-primary">
            <Camera size={16} />
            Start Camera
          </button>
        )}

        {(status === 'scanning' || status === 'success' || status === 'requesting') && (
          <button onClick={stopScanner} className="btn-danger">
            <CameraOff size={16} />
            Stop Camera
          </button>
        )}

        {status === 'error' && (
          <button onClick={startScanner} className="btn-secondary">
            <RotateCcw size={16} />
            Retry
          </button>
        )}
      </div>

      {status === 'scanning' && (
        <p className="text-slate-500 text-xs text-center">
          Point the camera at a student's QR ID card
        </p>
      )}
    </div>
  )
}
