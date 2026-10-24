'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: signInError } = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    if (mode === 'sign-up' && !data.session) {
      setNotice('Check your email to confirm the account, then sign in.')
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={handleSubmit} className="w-full space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-semibold">{mode === 'sign-in' ? 'Sign in' : 'Create researcher account'}</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === 'sign-in' ? 'Open your research workspace.' : 'Create an account to start your own private research workspace.'}</p>
        </div>
        <label className="block text-sm font-medium">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="text-sm text-indigo-600" onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          setError('')
          setNotice('')
        }}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
