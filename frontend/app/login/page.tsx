
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoginHeader from "../../components/loginHeader"
import {
  getOrganizerPortalRoute,
  getRoleFromToken,
  getVendorPortalRoute,
  ROLE_DASHBOARDS,
  saveAuthSession,
} from '@/app/lib/auth'

interface LoginResponse {
  access_token: string
  token_type: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? data.detail || 'Your account is deactivated.'
            : response.status === 401
            ? data.detail || 'Incorrect email or password.'
            : data.detail || 'Login failed.'
        )
      }

      const tokenData: LoginResponse = data
      saveAuthSession(tokenData.access_token, tokenData.token_type, keepLoggedIn)
      const role = getRoleFromToken(tokenData.access_token)

      if (role === 'organizer') {
        const organizerRoute = await getOrganizerPortalRoute(tokenData.access_token)
        router.replace(organizerRoute)
        return
      }

      if (role === 'vendor') {
        const vendorRoute = await getVendorPortalRoute(tokenData.access_token)
        router.replace(vendorRoute)
        return
      }

      router.replace(role ? ROLE_DASHBOARDS[role] || '/dashboard' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <LoginHeader />

      <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#8CB98820] rounded-2xl shadow-xl p-8 border border-slate-200">
          {/* Welcome */}
          <h2 className="text-3xl font-bold text-[#0F172A] mb-2">Welcome Back</h2>
          <p className="text-sm text-slate-500 mb-6">
            Enter your credentials to access your portal.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-2 text-center font-medium text-red-600 rounded text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/** Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border text-[#0F172A] border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0F172A] outline-none transition"
                required
                disabled={isLoading}
              />
            </div>

            {/** Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border text-[#0F172A] border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0F172A] outline-none transition"
                required
                disabled={isLoading}
              />
            </div>

            {/** Forgot Password */}
            <div className="flex justify-end text-sm">
              <Link href="/forgot-password" className="text-amber-600 hover:text-amber-700 font-medium">
                Forgot password?
              </Link>
            </div>

            {/** Keep Logged In */}
            <div className="flex items-center gap-2">
              <input
                id="keep-logged"
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="h-4 w-4 border-slate-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="keep-logged" className="text-sm text-slate-600">
                Keep me logged in
              </label>
            </div>

            {/** Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#062E22] hover:bg-[#045c33] text-white font-semibold py-3 rounded-lg flex items-center justify-center transition-shadow duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/** Register Link */}
          <p className="text-center mt-6 text-sm text-slate-600">
            New to Global Connect Ethiopia?{' '}
            <Link href="/register" className="text-amber-600 hover:text-amber-700 font-medium">
              Create an account
            </Link>
          </p>

          {/** Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-amber-600 transition">PRIVACY POLICY</Link>
            <Link href="/terms" className="hover:text-amber-600 transition">TERMS OF SERVICE</Link>
            <Link href="/support" className="hover:text-amber-600 transition">SUPPORT</Link>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            © 2024 Global Connect Ethiopia. Empowering the Digital Transformation of Ethiopian Events.
          </p>
        </div>
      </main>
    </>
  )
}
