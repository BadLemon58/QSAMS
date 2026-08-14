import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { QrCode, Mail, Lock, User, Hash, GraduationCap, BookOpen, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'student',
    studentId: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.role === 'student' && !form.studentId.trim()) {
      setError('Student ID is required for student accounts.')
      return
    }

    setLoading(true)
    const { error: err } = await signUp({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role,
      studentId: form.role === 'student' ? form.studentId : null,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => navigate('/login'), 2500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] flex items-center justify-center p-4 selection:bg-[#005a36]/20">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-10 text-center max-w-md w-full animate-fade-in shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mb-2">Account Created!</h2>
          <p className="text-[#64748b] text-xs">
            Registration successful. Redirecting you to sign in...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] flex items-center justify-center p-4 selection:bg-[#005a36]/20">
      <div className="w-full max-w-md animate-fade-in py-8">
        {/* Institutional Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#005a36] mb-3 shadow-md text-[#ffffff]">
            <QrCode size={32} />
          </div>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a]">QSAMS</h1>
          <p className="text-[#005a36] text-xs uppercase tracking-wider font-bold mt-1">
            Create Your Account
          </p>
        </div>

        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-7 sm:p-8 shadow-sm">
          {error && (
            <div className="flex items-center gap-2.5 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector */}
          <div className="flex gap-2 mb-5 p-1 bg-[#f8fafc] rounded-[18px] border border-[#cbd5e1]">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'student' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-xs font-bold transition-all ${
                form.role === 'student'
                  ? 'bg-[#005a36] text-[#ffffff] shadow-sm'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <GraduationCap size={16} />
              Student
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'teacher' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-xs font-bold transition-all ${
                form.role === 'teacher'
                  ? 'bg-[#005a36] text-[#ffffff] shadow-sm'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <BookOpen size={16} />
              Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Juan Dela Cruz"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

            {form.role === 'student' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                  Student ID Number
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="2024-00001"
                    value={form.studentId}
                    onChange={e => setForm({ ...form, studentId: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
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
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#64748b] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#005a36] font-bold hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
