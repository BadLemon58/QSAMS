import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import Spinner from '../../components/common/Spinner'
import qsamsLogo from '../../assets/QsamsLogoNew.png'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // 1. Check if Supabase returned an error in hash fragment or query params
    const hash = window.location.hash
    const urlParams = new URLSearchParams(window.location.search)

    if (hash && hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const errorDesc = hashParams.get('error_description') || hashParams.get('error')
      setError(decodeURIComponent(errorDesc || 'The password reset link is invalid or has expired.'))
      setLoading(false)
      return
    }

    if (urlParams.get('error')) {
      const errorDesc = urlParams.get('error_description') || urlParams.get('error')
      setError(decodeURIComponent(errorDesc || 'The password reset link is invalid or has expired.'))
      setLoading(false)
      return
    }

    // 2. Check for recovery indicators (PKCE code or implicit hash)
    const code = urlParams.get('code')
    const isRecoveryHash = hash && hash.includes('type=recovery')

    // If there is neither a PKCE code nor a recovery hash, user accessed this page directly without a valid reset link
    if (!code && !isRecoveryHash) {
      setSessionReady(false)
      setLoading(false)
      return
    }

    let isMounted = true

    // 3. If PKCE code exists, exchange code for session
    const initAuth = async () => {
      if (code) {
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!isMounted) return
          if (!exchangeErr && data?.session) {
            setSessionReady(true)
            setLoading(false)
            return
          } else if (exchangeErr) {
            setError(exchangeErr.message || 'The password reset link is invalid or has expired.')
            setSessionReady(false)
            setLoading(false)
            return
          }
        } catch (_) {
          if (!isMounted) return
          setError('Failed to verify recovery token. The link may have expired.')
          setSessionReady(false)
          setLoading(false)
          return
        }
      }
    }

    initAuth()

    // 4. Listen for PASSWORD_RECOVERY event (implicit flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true)
        setLoading(false)
      }
    })

    // Timeout fallback: if recovery verification takes too long, stop loading
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 8000)

    return () => {
      isMounted = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setUpdating(true)
    setError('')

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })

      if (updateErr) {
        setError(updateErr.message || 'Failed to update password. The link may have expired.')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] flex items-center justify-center p-4 selection:bg-[#005a36]/20">
      <div className="w-full max-w-md animate-fade-in">
        {/* Institutional Branding */}
        <div className="text-center mb-6">
          <img
            src={qsamsLogo}
            alt="QSAMS Logo"
            className="w-20 h-20 object-contain mx-auto mb-3 shadow-md rounded-[20px]"
          />
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a]">QSAMS</h1>
          <p className="text-[#005a36] text-xs uppercase tracking-wider font-bold mt-1">
            Notre Dame of Midsayap College
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-7 sm:p-8 shadow-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Spinner size="md" />
              <p className="text-xs text-[#64748b] mt-4 font-semibold">Verifying secure recovery token...</p>
            </div>
          ) : success ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 rounded-[22px] bg-[#dcfce7] border-2 border-[#86efac] text-[#15803d] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MorphIcon icon={CheckCircle} size={32} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border bg-[#dcfce7] text-[#15803d] border-[#86efac]">
                <span>Password Changed</span>
              </div>

              <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mb-2">
                Password Updated Successfully
              </h2>

              <p className="text-[#64748b] text-xs sm:text-sm leading-relaxed mb-6">
                Your password has been successfully updated. You can now use your new credentials to sign in.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary w-full justify-center py-3.5"
              >
                Proceed to Sign In
              </button>
            </div>
          ) : !sessionReady ? (
            /* Expired / Invalid Token State */
            <div className="text-center">
              <div className="w-16 h-16 rounded-[22px] bg-[#fee2e2] border-2 border-[#fca5a5] text-[#b91c1c] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MorphIcon icon={AlertCircle} size={32} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]">
                <span>Invalid or Expired Link</span>
              </div>

              <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mb-2">
                Recovery Link Expired
              </h2>

              <p className="text-[#64748b] text-xs sm:text-sm leading-relaxed mb-6">
                This password reset link is invalid, has already been used, or has expired after the 1-hour validity window.
              </p>

              <div className="space-y-2.5">
                <Link
                  to="/login"
                  className="btn-primary w-full justify-center py-3.5 block text-center"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Active Reset Form State */
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-[16px] bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shrink-0">
                  <MorphIcon icon={KeyRound} size={22} />
                </div>
                <div>
                  <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a]">
                    Create New Password
                  </h2>
                  <p className="text-[#64748b] text-xs">Enter and confirm your new account password</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-5 text-xs font-semibold">
                  <MorphIcon icon={AlertCircle} size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <MorphIcon icon={Lock} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                    >
                      {showPass ? <MorphIcon icon={EyeOff} size={16} /> : <MorphIcon icon={Eye} size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <MorphIcon icon={Lock} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-[14px]">
                  <span>Ensure your password is at least 6 characters and matches in both fields.</span>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary w-full justify-center py-3.5 mt-2"
                >
                  {updating ? <Spinner size="sm" /> : 'Update Password'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
                >
                  <MorphIcon icon={ArrowLeft} size={13} />
                  <span>Cancel and back to sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
