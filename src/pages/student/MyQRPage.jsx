import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Share2, Info, User, QrCode } from 'lucide-react'

export default function MyQRPage() {
  const { profile } = useAuth()

  const qrPayload = JSON.stringify({
    type: 'student_id',
    studentId: profile?.student_id,
    name: profile?.full_name,
    uid: profile?.id,
  })

  const handleDownload = () => {
    const svg = document.getElementById('student-qr-svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `QSAMS_ID_${profile?.student_id || 'QR'}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgStr)
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[20px] bg-[#ee6a2a] mb-3 text-[#000000] shadow-sm">
            <QrCode size={26} />
          </div>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#1a1a1a]">
            My QR ID Card
          </h1>
          <p className="text-[#7a7a7a] text-xs mt-1">
            Show this permanent ID to your teacher for rapid attendance check-in
          </p>
        </div>

        {/* Chalk Register ID Card */}
        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-7 flex flex-col items-center gap-5 shadow-sm">
          {/* User Info */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-xl font-bold mx-auto mb-2.5 shadow-sm">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() || <User size={24} />
              )}
            </div>
            <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a]">
              {profile?.full_name || 'Student Name'}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-[#ffffff] text-[#ee6a2a] font-mono text-xs font-bold shadow-sm">
              ID: {profile?.student_id || 'N/A'}
            </span>
          </div>

          {/* QR Code Frame with Pulse Ring */}
          <div className="relative p-5 bg-[#ffffff] rounded-[20px] shadow-sm flex items-center justify-center">
            <div
              className="absolute inset-[-6px] rounded-[26px] border-2 border-[rgba(0,0,0,0.06)] opacity-55 pointer-events-none"
              style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
            />
            <QRCodeSVG
              id="student-qr-svg"
              value={qrPayload}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#1a1a1a"
            />
          </div>

          {/* Info Card */}
          <div className="flex items-start gap-2.5 bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] px-4 py-3 w-full">
            <Info size={15} className="text-[#7a7a7a] shrink-0 mt-0.5" />
            <p className="text-[#7a7a7a] text-xs leading-relaxed">
              This is your <strong>permanent student ID QR</strong>. Keep it on your device or print it for daily classroom scanning.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 w-full">
            <button onClick={handleDownload} className="btn-secondary flex-1 justify-center py-3.5">
              <Download size={15} />
              Download PNG
            </button>
            <button
              onClick={() => navigator.share?.({ title: 'My QSAMS QR', text: `Student ID: ${profile?.student_id}` })}
              className="btn-primary flex-1 justify-center py-3.5"
            >
              <Share2 size={15} />
              Share ID
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
