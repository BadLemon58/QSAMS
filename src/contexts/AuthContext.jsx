import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data)
      } else {
        // Fallback to user_metadata if table row doesn't exist yet
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const fallback = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'User',
            role: user.user_metadata?.role || 'student',
            student_id: user.user_metadata?.student_id || null,
          }
          setProfile(fallback)
          // Auto-heal by inserting into profiles table
          await supabase.from('profiles').upsert(fallback)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async ({ email, password, fullName, role, studentId }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          student_id: studentId || null,
        },
      },
    })
    return { data, error }
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('No active user') }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      if (data) setProfile(data)
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚡
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Vercel Environment Variables Missing</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            QSAMS is deployed on Vercel, but needs your Supabase API keys to connect to the database.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl text-left text-xs font-mono text-slate-300 space-y-2 mb-6 border border-slate-800/80">
            <p className="text-blue-400 font-semibold mb-2">Add these in Vercel → Project Settings → Environment Variables:</p>
            <p className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-300">VITE_SUPABASE_URL</span>
            </p>
            <p className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-300">VITE_SUPABASE_ANON_KEY</span>
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Once added, go to <b>Deployments</b> on Vercel and click <b>Redeploy</b>!
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, updatePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
