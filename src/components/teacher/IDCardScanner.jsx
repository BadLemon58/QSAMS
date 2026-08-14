import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'
import Spinner from '../common/Spinner'

export default function IDCardScanner({ onScan, onError }) {
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | requesting | scanning | error | success
  const [errorMsg, setErrorMsg] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const SCANNER_ID = 'id-card-scanner'

  const startScanner = async () => {
    setStatus('requesting')
    setErrorMsg('')

    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (permErr) {
      const msg = permErr.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
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
          if (decodedText === lastScanned) return
          setLastScanned(decodedText)
          setStatus('success')
          onScan?.(decodedText)

          setTimeout(() => {
            setLastScanned(null)
            setStatus('scanning')
          }, 1800)
        },
        () => {}
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

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scanner Viewport */}
      <div className="relative w-full max-w-sm">
        <div
          id={SCANNER_ID}
          className="w-full rounded-[20px] overflow-hidden bg-[#f8fafc] min-h-[280px] flex items-center justify-center border border-[#cbd5e1]"
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#f8fafc]">
            <div className="w-14 h-14 rounded-full bg-[#ffffff] flex items-center justify-center text-[#64748b] shadow-sm border border-[#e2e8f0]">
              <Camera size={26} />
            </div>
            <p className="text-[#64748b] text-xs font-semibold">Camera is off</p>
          </div>
        )}

        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#ffffff]/90 backdrop-blur-sm">
            <Spinner size="lg" />
            <p className="text-[#0f172a] text-xs font-semibold">Requesting camera access...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-[#dcfce7] text-[#15803d] p-4 text-center animate-fade-in border border-[#86efac]">
            <CheckCircle size={40} />
            <p className="font-['Source_Serif_4',Georgia,serif] font-bold text-base">QR ID Scanned!</p>
            <p className="text-xs">Marking student in roster...</p>
          </div>
        )}

        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-[15%] border-2 border-dashed border-[#005a36] rounded-2xl animate-pulse" />
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="w-full max-w-sm flex items-start gap-2.5 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 text-xs font-semibold animate-fade-in">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Camera Error</p>
            <p className="mt-0.5 text-[11px]">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2.5">
        {(status === 'idle' || status === 'error') && (
          <button onClick={startScanner} className="btn-primary py-3 px-5 text-xs">
            <Camera size={15} />
            Start Camera Scanner
          </button>
        )}

        {(status === 'scanning' || status === 'success' || status === 'requesting') && (
          <button onClick={stopScanner} className="btn-danger py-3 px-5 text-xs">
            <CameraOff size={15} />
            Stop Camera
          </button>
        )}

        {status === 'error' && (
          <button onClick={startScanner} className="btn-secondary py-3 px-5 text-xs">
            <RotateCcw size={15} />
            Retry
          </button>
        )}
      </div>

      {status === 'scanning' && (
        <p className="text-[#64748b] text-xs text-center">
          Point camera at the student's static or digital ID QR
        </p>
      )}
    </div>
  )
}
