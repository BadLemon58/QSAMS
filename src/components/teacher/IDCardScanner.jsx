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

    const html5QrCode = new Html5Qrcode(SCANNER_ID, {
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true, // Native hardware acceleration
      }
    })
    scannerRef.current = html5QrCode

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 24, // Fast scan rate
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
          }, 1200)
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
            <p className="text-[#0f172a] text-xs font-semibold">Starting camera...</p>
          </div>
        )}

        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-[15%] border-2 border-dashed border-[#005a36] rounded-2xl animate-pulse" />
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-[#005a36]/90 text-white backdrop-blur-sm animate-fade-in">
            <CheckCircle size={44} className="text-white" />
            <p className="font-['Source_Serif_4',Georgia,serif] text-base font-bold">ID Card Scanned!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center rounded-[20px] bg-[#fee2e2] text-[#b91c1c]">
            <AlertTriangle size={32} />
            <p className="text-xs font-semibold">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2.5 w-full max-w-sm">
        {status === 'idle' || status === 'error' ? (
          <button
            onClick={startScanner}
            className="btn-primary w-full justify-center text-xs py-3.5"
          >
            <Camera size={16} /> Start Camera Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="btn-secondary w-full justify-center text-xs py-3.5"
          >
            <CameraOff size={16} /> Stop Camera
          </button>
        )}
      </div>
    </div>
  )
}
