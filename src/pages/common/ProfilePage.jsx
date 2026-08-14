import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import {
  User, Mail, Shield, KeyRound, Camera, Trash2,
  CheckCircle, AlertCircle, Save, ArrowLeft, Hash
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

  // Handle Avatar File Selection
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image must be under 2MB.' })
      return
    }

    setUploadingAvatar(true)
    setProfileMessage(null)

    try {
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
          setProfileMessage({ type: 'success', text: 'Profile picture updated successfully!' })
          setUploadingAvatar(false)
          return
        }
      }

      // Base64 Data URL fallback
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result
        setAvatarUrl(base64Data)
        await updateProfile({ avatar_url: base64Data })
        setProfileMessage({ type: 'success', text: 'Profile picture updated successfully!' })
        setUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setProfileMessage({ type: 'error', text: `Failed to upload image: ${err.message}` })
      setUploadingAvatar(false)
    }
  }

  // Remove Avatar
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

  // Save Profile Details
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
      setProfileMessage({ type: 'error', text: `Update failed: ${error.message}` })
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' })
    }
    setSavingProfile(false)
  }

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setSavingPassword(true)
    const { error } = await updatePassword(newPassword)

    if (error) {
      setPasswordMessage({ type: 'error', text: `Password update failed: ${error.message}` })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(isTeacher ? '/teacher' : '/student')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#ee6a2a] hover:underline mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
          <span className="text-xs uppercase font-bold tracking-wider text-[#7a7a7a]">Account Settings</span>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#1a1a1a] mt-0.5 mb-1">
            User Profile
          </h1>
          <p className="text-[#7a7a7a] text-xs">
            Manage your personal profile picture, identity details, and account security
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── CARD 1: Profile & Avatar ── */}
        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-6 sm:p-8 shadow-sm">
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
            <User size={18} className="text-[#ee6a2a]" /> Personal Information
          </h2>

          {profileMessage && (
            <div className={`flex items-center gap-2.5 rounded-[16px] px-4 py-3 mb-5 text-xs font-semibold ${
              profileMessage.type === 'success'
                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
            }`}>
              {profileMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{profileMessage.text}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[rgba(0,0,0,0.06)] mb-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-2xl font-bold shadow-sm overflow-hidden border-2 border-[#ffffff]">
                {uploadingAvatar ? (
                  <Spinner size="md" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || <User size={30} />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#ee6a2a] text-[#000000] hover:scale-105 transition-transform shadow-md"
                title="Change Photo"
              >
                <Camera size={13} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1a1a1a]">Profile Picture</p>
              <p className="text-xs text-[#7a7a7a]">JPG, PNG or GIF up to 2MB</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="btn-secondary btn-sm"
                >
                  Upload New Photo
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-[12px] bg-[#ffffff] text-[#B91C1C] border border-[#FCA5A5] text-xs font-semibold hover:bg-[#FEE2E2] transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                  <input
                    type="email"
                    className="input-field pl-10 opacity-70 cursor-not-allowed bg-[#ebebeb]"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                  User Role
                </label>
                <div className="relative">
                  <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                  <input
                    type="text"
                    className="input-field pl-10 opacity-70 cursor-not-allowed bg-[#ebebeb] capitalize"
                    value={profile?.role || 'user'}
                    disabled
                  />
                </div>
              </div>

              {profile?.student_id && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                    Student ID
                  </label>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                    <input
                      type="text"
                      className="input-field pl-10 opacity-70 cursor-not-allowed bg-[#ebebeb] font-mono"
                      value={profile?.student_id}
                      disabled
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary"
              >
                {savingProfile ? <Spinner size="sm" /> : <Save size={15} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* ── CARD 2: Security & Password Change ── */}
        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-6 sm:p-8 shadow-sm">
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a] mb-2 flex items-center gap-2">
            <KeyRound size={18} className="text-[#ee6a2a]" /> Security & Password
          </h2>
          <p className="text-[#7a7a7a] text-xs mb-5">
            Ensure your account is using a strong password of at least 6 characters
          </p>

          {passwordMessage && (
            <div className={`flex items-center gap-2.5 rounded-[16px] px-4 py-3 mb-5 text-xs font-semibold ${
              passwordMessage.type === 'success'
                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
            }`}>
              {passwordMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="btn-primary"
              >
                {savingPassword ? <Spinner size="sm" /> : <Save size={15} />}
                Update Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
