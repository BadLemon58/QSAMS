import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import {
  User, Mail, Shield, KeyRound, Camera, Trash2,
  CheckCircle, AlertCircle, Save, ArrowLeft, Sparkles, Hash
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // Profile fields state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password fields state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Alert state
  const [profileMessage, setProfileMessage] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState(null)

  const isTeacher = profile?.role === 'teacher'

  // ── Handle Avatar File Selection ───────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image must be under 2MB.' })
      return
    }

    setUploadingAvatar(true)
    setProfileMessage(null)

    try {
      // 1. Try uploading to Supabase Storage 'avatars' bucket
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) {
          setAvatarUrl(urlData.publicUrl)
          await updateProfile({ avatar_url: urlData.publicUrl })
          setProfileMessage({ type: 'success', text: 'Profile picture updated!' })
          setUploadingAvatar(false)
          return
        }
      }

      // 2. Fallback: Convert to Base64 Data URL if bucket doesn't exist
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result
        setAvatarUrl(base64Data)
        await updateProfile({ avatar_url: base64Data })
        setProfileMessage({ type: 'success', text: 'Profile picture updated!' })
        setUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setProfileMessage({ type: 'error', text: `Failed to upload image: ${err.message}` })
      setUploadingAvatar(false)
    }
  }

  // ── Remove Avatar ──────────────────────────────────────────
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    const { error } = await updateProfile({ avatar_url: null })
    if (error) {
      setProfileMessage({ type: 'error', text: error.message })
    } else {
      setAvatarUrl('')
      setProfileMessage({ type: 'success', text: 'Profile picture removed.' })
    }
    setUploadingAvatar(false)
  }

  // ── Save Profile Details ───────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setProfileMessage({ type: 'error', text: 'Full name cannot be empty.' })
      return
    }

    setSavingProfile(true)
    setProfileMessage(null)

    const { error } = await updateProfile({ full_name: fullName.trim() })

    if (error) {
      setProfileMessage({ type: 'error', text: error.message })
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' })
    }
    setSavingProfile(false)
  }

  // ── Save New Password ──────────────────────────────────────
  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSavingPassword(true)
    const { error } = await updatePassword(newPassword)

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(isTeacher ? '/teacher' : '/student')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* Page Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-3 py-1 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles size={13} /> Account Settings
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account information, profile picture, and security</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN: Avatar & Overview ── */}
          <div className="glass-card p-6 flex flex-col items-center text-center">
            {/* Avatar Circle with Upload Overlay */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/10">
                {uploadingAvatar ? (
                  <Spinner size="lg" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || <User size={36} />
                )}
              </div>

              {/* Upload trigger button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1 cursor-pointer"
              >
                <Camera size={20} />
                <span>Change</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn-secondary btn-sm flex items-center gap-1 text-xs"
              >
                <Camera size={13} /> Upload Photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                  title="Remove photo"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <h2 className="text-lg font-bold text-white">{profile?.full_name || 'User'}</h2>
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Shield size={11} /> {profile?.role}
            </div>

            {profile?.student_id && (
              <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mt-3">
                <Hash size={12} className="text-slate-500" />
                <span>Student ID: {profile.student_id}</span>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Profile Form & Password Form ── */}
          <div className="md:col-span-2 space-y-6">

            {/* Profile Information Card */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <User size={16} className="text-indigo-400" />
                Personal Information
              </h3>

              {profileMessage && (
                <div className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-4 text-sm ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {profileMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-field pl-10 opacity-60 cursor-not-allowed bg-slate-900/50"
                    />
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Email is linked to your authentication account.</p>
                </div>

                {profile?.role === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Student ID Number
                    </label>
                    <input
                      type="text"
                      value={profile?.student_id || 'Not assigned'}
                      disabled
                      className="input-field opacity-60 cursor-not-allowed bg-slate-900/50 font-mono"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-primary"
                  >
                    {savingProfile ? <Spinner size="sm" /> : <Save size={15} />}
                    Save Profile
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-indigo-400" />
                Change Password
              </h3>

              {passwordMessage && (
                <div className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-4 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {passwordMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Repeat new password"
                    minLength={6}
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword}
                    className="btn-secondary"
                  >
                    {savingPassword ? <Spinner size="sm" /> : <KeyRound size={15} />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
