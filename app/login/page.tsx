'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Mode state: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setMode('signup')
    }
  }, [searchParams])

  const handleGoogleAuth = async () => {
    setErrorMsg(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      })

      if (error) {
        setErrorMsg(error.message)
      } else if (data.user && !data.session) {
        setSuccessMsg('Account created! Check your email to confirm your account.')
      } else {
        router.push('/')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        router.push('/')
      }
    }

    setLoading(false)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 shadow-2xl">
      {/* TABS FOR CLEAR SIGN IN / SIGN UP SELECTION */}
      <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setErrorMsg(null)
            setSuccessMsg(null)
          }}
          className={`py-2 text-xs font-black rounded-xl transition ${
            mode === 'signin'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setErrorMsg(null)
            setSuccessMsg(null)
          }}
          className={`py-2 text-xs font-black rounded-xl transition ${
            mode === 'signup'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* DYNAMIC HEADER */}
      <div className="text-center space-y-1">
        <div className="text-3xl">🎯</div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          {mode === 'signup'
            ? 'Start building habits and tracking goals with GoalCircle'
            : 'Sign in to continue tracking your goals'}
        </p>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold p-3 rounded-xl text-center">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold p-3 rounded-xl text-center">
          {successMsg}
        </div>
      )}

      {/* GOOGLE OAUTH */}
      <button
        onClick={handleGoogleAuth}
        type="button"
        className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 text-xs transition shadow-md"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.3 21.32 7.37 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.3 2.68 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
          />
        </svg>
        {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-800 w-full"></div>
        <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 absolute">
          or email
        </span>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
              required={mode === 'signup'}
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-2"
        >
          {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      {/* FOOTER SWITCH */}
      <div className="text-center pt-1">
        <p className="text-xs text-slate-400 font-medium">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="text-amber-500 font-bold hover:underline ml-1"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-xs text-slate-500 font-semibold animate-pulse">
            Loading authentication...
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  )
}