import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Share2, Info } from 'lucide-react'

export default function MyQRPage() {
  const { profile } = useAuth()

  // The QR value is a JSON payload containing the student's unique student_id
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
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">My QR ID Card</h1>
          <p className="text-slate-400 text-sm mt-1">Show this to your teacher for attendance scanning</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 flex flex-col items-center gap-6">
          {/* User info */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
            <p className="text-indigo-400 font-mono text-sm mt-1">
              {profile?.student_id || 'No Student ID'}
            </p>
          </div>

          {/* QR Code */}
          <div className="p-5 bg-white rounded-2xl shadow-2xl shadow-indigo-500/20">
            <QRCodeSVG
              id="student-qr-svg"
              value={qrPayload}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#1e1b4b"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 w-full">
            <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-indigo-300/80 text-xs leading-relaxed">
              This is your <strong>static QR ID</strong>. It is permanently tied to your student account and does not expire. Keep it accessible for easy teacher scanning.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button onClick={handleDownload} className="btn-secondary flex-1 justify-center">
              <Download size={15} />
              Download
            </button>
            <button
              onClick={() => navigator.share?.({ title: 'My QSAMS QR', text: `Student ID: ${profile?.student_id}` })}
              className="btn-primary flex-1 justify-center"
            >
              <Share2 size={15} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
