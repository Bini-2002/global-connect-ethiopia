'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoginHeader from '@/components/loginHeader'

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_email')
    if (stored) setEmail(stored)
  }, [])

  const checkStrength = (pwd: string) => {
    if (pwd.length === 0) return setPasswordStrength('')
    if (pwd.length < 6) return setPasswordStrength('Weak')
    if (pwd.length < 10) return setPasswordStrength('Medium')
    setPasswordStrength('Strong')
  }

  const strengthColor = {
    Weak: 'text-red-500',
    Medium: 'text-amber-500',
    Strong: 'text-emerald-600',
  }[passwordStrength] || ''

  const handleResend = async () => {
    if (!email) return
    setIsResending(true)
    setError('')
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp_code: otpCode,
          new_password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Reset failed.')

      setSuccess(true)
      sessionStorage.removeItem('reset_email')
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <LoginHeader />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#062E22]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#062E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-1">Reset Your Password</h2>
          <p className="text-sm text-slate-500 text-center mb-6">
            Enter the OTP we sent to <span className="font-semibold text-slate-700">{email || 'your email'}</span> and choose a new password.
          </p>

          {error && (
            <div className="mb-4 text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800">Password reset successfully!</p>
              <p className="text-sm text-slate-500 mt-1">Redirecting you to the login page…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email (editable in case sessionStorage is empty) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#062E22] outline-none transition"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* OTP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
                    One-Time Code (OTP)
                  </label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                  >
                    {isResending ? 'Sending…' : 'Resend code'}
                  </button>
                </div>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] tracking-widest text-center text-lg font-mono focus:ring-2 focus:ring-[#062E22] outline-none transition"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); checkStrength(e.target.value) }}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#062E22] outline-none transition"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                {passwordStrength && (
                  <p className={`text-xs mt-1 font-medium ${strengthColor}`}>
                    Strength: {passwordStrength}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#062E22] outline-none transition"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#062E22] hover:bg-[#0a4a37] text-white font-semibold py-3 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : 'Reset Password →'}
              </button>
            </form>
          )}

          <p className="text-center mt-6 text-sm text-slate-600">
            Back to{' '}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
