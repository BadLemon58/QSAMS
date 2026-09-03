import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Skeleton } from '../../components/common/Skeleton'
import Navbar from '../../components/common/Navbar'
import { Camera, CameraOff, AlertTriangle, CheckCircle, ArrowLeft, RotateCcw, MapPin, Shield } from 'lucide';
import { MorphIcon } from 'morphicons/react';

export default function ScanPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const userLocationRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | requesting | scanning | verifying | success | error
  const [message, setMessage] = useState('')
  const [scanResult, setScanResult] = useState(null)

  const SCANNER_ID = 'student-camera-scanner'

  // 1. Fetch and warm-up GPS location immediately on mount
  const fetchLocation = () => {
    if (!navigator.geolocation) return Promise.resolve(null)
    if (userLocationRef.current) return Promise.resolve(userLocationRef.current)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }
          userLocationRef.current = coords
          resolve(coords)
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      )
    })
  }

  // Calculate distance between two lat/lng points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180
    const phi2 = (lat2 * Math.PI) / 180
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const startScanner = async () => {
    setStatus('requesting')
    setMessage('')
    setScanResult(null)

    // Pre-fetch location in parallel with camera request
    fetchLocation()

    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (permErr) {
      const msg = permErr.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera permissions in your browser settings.'
        : `Cannot access camera: ${permErr.message}`
      setMessage(msg)
      setStatus('error')
      return
    }

    const html5QrCode = new Html5Qrcode(SCANNER_ID, {
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: false,
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
        handleScanSuccess,
        () => {}
      )
      setStatus('scanning')
    } catch (err) {
      setMessage(`Failed to start camera: ${err?.message || err}`)
      setStatus('error')
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
  }

  const handleScanSuccess = async (decodedText) => {
    await stopScanner()
    setStatus('verifying')

    let parsed
    try {
      parsed = JSON.parse(decodedText)
    } catch {
      setStatus('error')
      setMessage('Invalid QR code format.')
      return
    }

    if (parsed.type === 'join_class') {
      const joinCode = parsed.joinCode
      if (!joinCode) {
        setStatus('error')
        setMessage('Invalid join QR code.')
        return
      }

      // 1. Find the class
      const { data: foundClasses, error: searchErr } = await supabase
        .from('classes')
        .select('*')

      if (searchErr) {
        setStatus('error')
        setMessage(`Error finding class: ${searchErr.message}`)
        return
      }

      const matchedClass = (foundClasses || []).find(c =>
        c.join_code?.toUpperCase() === joinCode.toUpperCase() ||
        c.id.substring(0, 6).toUpperCase() === joinCode.toUpperCase()
      )

      if (!matchedClass) {
        setStatus('error')
        setMessage('Class not found. Please ask your teacher for a new code.')
        return
      }

      // 2. Enroll student
      const { error: enrollErr } = await supabase
        .from('enrollments')
        .insert({ class_id: matchedClass.id, student_id: profile.id })

      if (enrollErr) {
        setStatus('error')
        if (enrollErr.code === '23505') {
          setMessage(`You are already enrolled in "${matchedClass.name}".`)
        } else {
          setMessage(`Enrollment failed: ${enrollErr.message}`)
        }
        return
      }

      setScanResult({
        actionType: 'join_class',
        className: matchedClass.name,
      })
      setStatus('success')
      return
    }

    if (parsed.type !== 'attendance' || !parsed.sessionId || !parsed.token) {
      setStatus('error')
      setMessage('Unrecognized QR code. Please scan a valid QSAMS QR code.')
      return
    }

    // 1. Verify session validity & token
    const { data: session, error: sessErr } = await supabase
      .from('attendance_sessions')
      .select('*, classes(name, room)')
      .eq('id', parsed.sessionId)
      .single()

    if (sessErr || !session) {
      setStatus('error')
      setMessage('Attendance session not found or has concluded.')
      return
    }

    if (!session.is_active) {
      setStatus('error')
      setMessage('This attendance session is no longer active.')
      return
    }

    // Check token match
    if (session.session_token !== parsed.token) {
      setStatus('error')
      setMessage('QR token has rotated! Please point your camera at the current QR code on screen.')
      return
    }

    // 2. Geofence verification (instant via pre-fetched coords)
    const currentCoords = userLocationRef.current || await fetchLocation()
    if (session.latitude && session.longitude && currentCoords) {
      const dist = calculateDistance(
        session.latitude,
        session.longitude,
        currentCoords.latitude,
        currentCoords.longitude
      )
      const ALLOWED_RADIUS_METERS = 200
      if (dist > ALLOWED_RADIUS_METERS) {
        setStatus('error')
        setMessage(`Out of range! You are ${Math.round(dist)}m away from the classroom session.`)
        return
      }
    }

    // 3. Mark attendance
    const { error: logErr } = await supabase
      .from('attendance_logs')
      .upsert({
        session_id: session.id,
        student_id: profile.id,
        class_id: session.class_id,
        status: 'present',
        method: 'qr_student',
        marked_at: new Date().toISOString(),
      }, { onConflict: 'session_id,student_id' })

    if (logErr) {
      setStatus('error')
      setMessage(`Failed to record attendance: ${logErr.message}`)
      return
    }

    setScanResult({
      actionType: 'attendance',
      className: session.classes?.name || 'Class Session',
      room: session.classes?.room,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
    setStatus('success')
  }

  useEffect(() => {
    fetchLocation()
    startScanner()
    return () => { stopScanner() }
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-md bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-6 sm:p-8 shadow-sm flex flex-col items-center gap-5 relative">
          
          {/* Back Link */}
          <button
            onClick={() => navigate('/student')}
            className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-[#005a36] hover:underline transition-colors"
          >
            <MorphIcon icon={ArrowLeft} size={15} /> Dashboard
          </button>

          <div className="text-center">
            <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Instant Check-in</span>
            <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
              Scan Classroom QR
            </h1>
            <p className="text-[#64748b] text-xs mt-1">Point your camera at the QR code on the teacher screen</p>
          </div>

          {/* Viewport Frame */}
          <div className="relative w-full max-w-xs">
            <div
              id={SCANNER_ID}
              className="w-full rounded-[20px] overflow-hidden bg-[#f8fafc] min-h-[280px] flex items-center justify-center border border-[#cbd5e1]"
            />

            {status === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#ffffff]/90 rounded-[20px] p-6">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            )}

            {status === 'verifying' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#ffffff]/95 rounded-[20px] p-6 text-center">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-3.5 w-48 rounded-md" />
              </div>
            )}

            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-dashed border-[#005a36] rounded-2xl animate-pulse" />
              </div>
            )}
          </div>

          {/* Results / Feedback */}
          {status === 'success' && scanResult && (
            <div className="w-full bg-[#dcfce7] border border-[#86efac] rounded-[20px] p-5 text-center flex flex-col items-center gap-2 animate-fade-in text-[#15803d]">
              <MorphIcon icon={CheckCircle} size={36} />
              <h3 className="font-['Source_Serif_4',Georgia,serif] text-lg font-bold">
                {scanResult.actionType === 'join_class' ? 'Class Joined!' : 'Attendance Recorded!'}
              </h3>
              <p className="text-xs">
                {scanResult.actionType === 'join_class' ? (
                  <>Successfully enrolled in <strong className="text-[#0f172a]">{scanResult.className}</strong></>
                ) : (
                  <>Marked present for <strong className="text-[#0f172a]">{scanResult.className}</strong> at {scanResult.time}</>
                )}
              </p>
              <button
                onClick={() => navigate('/student')}
                className="btn-primary w-full justify-center mt-2 text-xs py-3"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full bg-[#fee2e2] border border-[#fca5a5] rounded-[20px] p-5 text-center flex flex-col items-center gap-2 text-[#b91c1c] animate-fade-in">
              <MorphIcon icon={AlertTriangle} size={32} />
              <h3 className="font-bold text-sm">Scan Failed</h3>
              <p className="text-xs">{message}</p>
              <button
                onClick={startScanner}
                className="btn-secondary w-full justify-center mt-2 text-xs py-3 flex items-center gap-1.5"
              >
                <MorphIcon icon={RotateCcw} size={14} /> Try Again
              </button>
            </div>
          )}

          {/* GPS Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <MorphIcon icon={Shield} size={12} className="text-[#005a36]" />
            <span>Fast Geo-verification enabled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
