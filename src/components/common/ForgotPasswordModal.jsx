import { useState } from 'react'
import { KeyRound, Mail, X, CheckCircle, AlertCircle } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import Spinner from './Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function ForgotPasswordModal({ initialEmail = '', source = 'login', onClose }) {
  const { resetPassword, user } = useAuth()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const isFromProfile = source === 'profile' || !!user

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: resetErr } = await resetPassword(email.trim())

      if (resetErr) {
        setError(resetErr.message || 'Unable to send password reset email. Please verify your address.')
      } else {
        setSent(true)
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]"
    >
      <div className={`w-full max-w-md p-6 sm:p-7 rounded-[26px] shadow-2xl relative text-center border transition-colors ${
        isDark
          ? 'bg-[#1e293b] text-[#f8fafc] border-[#334155]'
          : 'bg-[#ffffff] text-[#0f172a] border-[#e2e8f0]'
      }`}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#334155] text-[#cbd5e1] hover:bg-[#475569]'
              : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
          }`}
          aria-label="Close dialog"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        {sent ? (
          /* Success State */
          <div>
            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mx-auto mb-3.5 shadow-sm border-2 ${
              isDark
                ? 'bg-[#14532d]/40 border-[#22c55e]/50 text-[#86efac]'
                : 'bg-[#f0fdf4] border-[#86efac] text-[#16a34a]'
            }`}>
              <MorphIcon icon={CheckCircle} size={28} />
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border ${
              isDark
                ? 'bg-[#14532d]/40 text-[#86efac] border-[#22c55e]/50'
                : 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'
            }`}>
              <span>Verification Email Sent</span>
            </div>

            <h3 className={`font-['Source_Serif_4',Georgia,serif] text-xl font-bold mb-2 ${
              isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
            }`}>
              Password Reset Link Sent
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${
              isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
            }`}>
              A password reset link has been dispatched to{' '}
              <strong className={isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}>{email}</strong>. Please check your email inbox to proceed with updating your credentials.
            </p>

            <div className={`rounded-[16px] p-3.5 text-xs text-left space-y-1.5 mb-5 border ${
              isDark
                ? 'bg-[#0f172a]/60 border-[#334155] text-[#94a3b8]'
                : 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
            }`}>
              <p className={`font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}>Next steps:</p>
              <p>1. Open your email inbox (please check your Spam or Junk folder if the message is not visible within a few minutes).</p>
              <p>2. Click the verified password reset link in the message.</p>
              <p>3. Enter and confirm your new password.</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary w-full justify-center py-3"
            >
              {isFromProfile ? 'Return to Profile' : 'Return to Sign In'}
            </button>
          </div>
        ) : (
          /* Form State */
          <div>
            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mx-auto mb-3.5 shadow-sm border-2 ${
              isDark
                ? 'bg-[#005a36]/30 border-[#005a36]/50 text-[#86efac]'
                : 'bg-[#e6f2ec] border-[#005a36]/30 text-[#005a36]'
            }`}>
              <MorphIcon icon={KeyRound} size={28} />
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border ${
              isDark
                ? 'bg-[#005a36]/20 text-[#86efac] border-[#005a36]/40'
                : 'bg-[#e6f2ec] text-[#005a36] border-[#005a36]/30'
            }`}>
              <span>{isFromProfile ? 'Account Security' : 'Account Recovery'}</span>
            </div>

            <h3 className={`font-['Source_Serif_4',Georgia,serif] text-xl font-bold mb-2 ${
              isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
            }`}>
              {isFromProfile ? 'Reset Account Password' : 'Forgot Your Password?'}
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed mb-5 ${
              isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
            }`}>
              {isFromProfile
                ? 'Confirm your registered institutional email address below. A secure password reset link will be sent to your inbox.'
                : 'Enter your registered school email address below. A secure password recovery link will be sent to help you regain access.'}
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-3.5 py-2.5 mb-4 text-xs font-semibold text-left">
                <MorphIcon icon={AlertCircle} size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <MorphIcon icon={Mail} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.edu"
                    className="input-field pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className={`flex-1 py-3 px-4 rounded-[16px] font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                    isDark
                      ? 'bg-[#334155] text-[#cbd5e1] hover:bg-[#475569]'
                      : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-[16px] bg-[#005a36] hover:bg-[#00482b] text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
