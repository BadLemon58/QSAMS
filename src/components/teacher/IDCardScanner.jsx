import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CameraOff, AlertTriangle, CheckCircle, RotateCcw, RefreshCw } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { Skeleton } from '../common/Skeleton'

export default function IDCardScanner({ onScan, onError }) {
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | requesting | scanning | error | success
  const [errorMsg, setErrorMsg] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [scanBoxSize, setScanBoxSize] = useState(null)
  const SCANNER_ID = 'id-card-scanner'
  const lastScanTimeRef = useRef(0)

  // Play quick audio chime on successful scan
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (_) {}
  }

  const startScanner = async (targetFacing = facingMode) => {
    setStatus('requesting')
    setErrorMsg('')

    await stopScanner()

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Release camera tracks immediately
        stream.getTracks().forEach(t => t.stop())
      }
    } catch (permErr) {
      const msg = permErr.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : `Could not access camera: ${permErr.message}`
      setErrorMsg(msg)
      setStatus('error')
      onError?.(msg)
      return
    }

    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      scannerRef.current = html5QrCode

      const scanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.max(Math.floor(minEdge * 0.72), 160)
          setScanBoxSize(size)
          return {
            width: size,
            height: size
          }
        },
      }

      const onScanSuccess = (decodedText) => {
        const now = Date.now()
        // Rate limit: Enforce a global 2-second cooldown between ANY successful scans
        if (now - lastScanTimeRef.current < 2000) return
        
        if (decodedText === lastScanned) return
        
        lastScanTimeRef.current = now
        playSuccessChime()
        setLastScanned(decodedText)
        setStatus('success')
        onScan?.(decodedText)

        setTimeout(() => {
          setLastScanned(null)
          setStatus('scanning')
        }, 1200)
      }

      try {
        await html5QrCode.start(
          {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          scanConfig,
          onScanSuccess,
          () => {}
        )
      } catch (cameraErr) {
        console.warn('Target facingMode failed, falling back to any camera:', cameraErr)
        await html5QrCode.start(
          { facingMode: 'user' },
          scanConfig,
          onScanSuccess,
          () => {}
        )
      }

      setStatus('scanning')
    } catch (err) {
      const msg = `Failed to start scanner: ${err?.message || err}`
      setErrorMsg(msg)
      setStatus('error')
      onError?.(msg)
    }
  }

  const toggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    await startScanner(nextMode)
  }



  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
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
      <div className="relative w-full max-w-sm mx-auto">
        <div
          id={SCANNER_ID}
          className={`w-full rounded-[24px] overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] shadow-inner flex items-center justify-center transition-all duration-200 ${
            status === 'scanning' ? 'min-h-0' : 'min-h-[260px]'
          }`}
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[24px] bg-[#f8fafc] dark:bg-[#0f172a]">
            <div className="w-14 h-14 rounded-full bg-[#ffffff] dark:bg-[#1e293b] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] shadow-sm border border-[#e2e8f0] dark:border-[#334155]">
              <MorphIcon icon={Camera} size={26} />
            </div>
            <p className="text-[#64748b] dark:text-[#94a3b8] text-xs font-semibold">Camera is off</p>
          </div>
        )}

        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[24px] bg-[#ffffff]/90 dark:bg-[#0f172a]/90 backdrop-blur-xs p-6">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        )}

        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
            {/* Precision Centered Scan Reticle */}
            <div
              className="relative flex items-center justify-center pointer-events-none transition-all duration-300"
              style={{
                width: scanBoxSize ? `${scanBoxSize}px` : '72%',
                height: scanBoxSize ? `${scanBoxSize}px` : undefined,
                maxWidth: '85%',
                maxHeight: '85%',
                aspectRatio: '1 / 1',
              }}
            >
              {/* Subtle outer glow & dashed frame */}
              <div className="absolute inset-0 border-2 border-dashed border-[#005a36] dark:border-[#22c55e] rounded-2xl animate-pulse" />
              
              {/* High-visibility corner targeting brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#005a36] dark:border-[#22c55e] rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#005a36] dark:border-[#22c55e] rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#005a36] dark:border-[#22c55e] rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#005a36] dark:border-[#22c55e] rounded-br-lg" />

              {/* Laser Scan Sweeper */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_8px_#22c55e] animate-laser-scan" />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-[#005a36]/90 text-white backdrop-blur-xs animate-fade-in">
            <MorphIcon icon={CheckCircle} size={44} className="text-white" />
            <p className="font-['Source_Serif_4',Georgia,serif] text-base font-bold">ID Card Scanned!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center rounded-[24px] bg-[#fee2e2] dark:bg-[#7f1d1d]/80 text-[#b91c1c] dark:text-[#fca5a5]">
            <MorphIcon icon={AlertTriangle} size={32} />
            <p className="text-xs font-semibold">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2.5 w-full max-w-sm">
        {status === 'idle' || status === 'error' ? (
          <button
            onClick={() => startScanner()}
            className="btn-primary w-full justify-center text-xs py-3.5"
          >
            <MorphIcon icon={Camera} size={16} /> Start Camera Scanner
          </button>
        ) : (
          <div className="flex gap-2 w-full">
            <button
              onClick={stopScanner}
              className="btn-secondary flex-1 justify-center text-xs py-3.5"
            >
              <MorphIcon icon={CameraOff} size={16} /> Stop Camera
            </button>
            <button
              onClick={toggleCamera}
              className="btn-secondary text-xs py-3.5 px-3.5"
              title="Flip Camera (Front/Back)"
            >
              <MorphIcon icon={RefreshCw} size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
