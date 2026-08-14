import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import {
  Download, ArrowLeft, Check, Shield, Share2,
  Sparkles, RefreshCw, User
} from 'lucide-react'

export default function MyQRPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [downloaded, setDownloaded] = useState(false)

  const studentQrData = JSON.stringify({
    type: 'student_id',
    studentId: profile?.student_id,
    name: profile?.full_name,
    id: profile?.id,
  })

  const downloadQR = () => {
    const svg = document.getElementById('student-id-qr')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width + 80
      canvas.height = img.height + 80

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 40, 40)

      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `QSAMS-QR-${profile?.student_id || 'ID'}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2500)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-sm flex flex-col gap-4 animate-fade-in">
          
          {/* Back Link */}
          <button
            onClick={() => navigate('/student')}
            className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-[#005a36] hover:underline transition-colors"
          >
            <ArrowLeft size={15} /> Dashboard
          </button>

          {/* Digital ID Card */}
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-7 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            
            {/* Top Banner Stripe */}
            <div className="w-full bg-[#005a36] text-white py-2 px-4 rounded-[14px] mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">NDMC Digital ID</span>
              <span className="text-[10px] font-mono opacity-90">{profile?.student_id || 'Student'}</span>
            </div>

            <div className="w-16 h-16 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center text-xl font-bold mb-3 shadow-sm overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() || <User size={24} />
              )}
            </div>

            <h1 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] leading-tight">
              {profile?.full_name || 'Student'}
            </h1>
            <p className="text-xs text-[#005a36] font-mono font-semibold mt-0.5">
              Student ID: {profile?.student_id || 'Not Assigned'}
            </p>

            {/* QR Code Container with Pulse Frame */}
            <div className="relative my-5 p-5 bg-[#f8fafc] rounded-[20px] border border-[#e2e8f0] shadow-sm flex items-center justify-center">
              <div
                className="absolute inset-[-6px] rounded-[26px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
              />
              <QRCodeSVG
                id="student-id-qr"
                value={studentQrData}
                size={180}
                level="H"
                includeMargin={false}
                fgColor="#005a36"
              />
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed max-w-xs">
              Present this static ID QR code to your instructor for rapid scanner verification
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2.5 w-full mt-6">
              <button
                onClick={downloadQR}
                className="btn-primary flex-1 justify-center text-xs py-3.5"
              >
                {downloaded ? (
                  <><Check size={15} /> Saved!</>
                ) : (
                  <><Download size={15} /> Save to Gallery</>
                )}
              </button>
            </div>
          </div>

          {/* Security Indicator */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
            <Shield size={12} className="text-[#005a36]" />
            <span>Official Notre Dame of Midsayap College QR Credential</span>
          </div>
        </div>
      </div>
    </div>
  )
}
