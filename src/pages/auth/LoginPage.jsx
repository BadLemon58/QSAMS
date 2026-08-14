import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { QrCode, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await signIn({ email: form.email, password: form.password })

    if (err) {
      let msg = typeof err === 'string' ? err : err.message || (err.error_description ?? JSON.stringify(err))
      if (!msg || msg === '{}') {
        msg = 'Invalid login credentials. Please check your email and password.'
      }
      setError(msg)
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] flex items-center justify-center p-4 selection:bg-[#ee6a2a]/20">
      <div className="w-full max-w-md animate-fade-in">
        {/* Institutional Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#ee6a2a] mb-3 shadow-sm text-[#000000]">
            <QrCode size={30} />
          </div>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#1a1a1a]">QSAMS</h1>
          <p className="text-[#7a7a7a] text-xs uppercase tracking-wider font-semibold mt-1">
            Notre Dame of Midsayap College
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-7 sm:p-8 shadow-sm">
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#1a1a1a]">Sign in</h2>
          <p className="text-[#7a7a7a] text-xs mt-1 mb-6">Enter your school account details to continue</p>

          {error && (
            <div className="flex items-center gap-2.5 bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] rounded-[16px] px-4 py-3 mb-5 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="name@school.edu"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#1a1a1a]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-[#7a7a7a] mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#ee6a2a] font-bold hover:underline transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
