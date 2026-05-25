'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock, User, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/app/lib/apiBase';

type Step = 'register' | 'verify';

const API = getApiBaseUrl();

export default function TeamRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Verify form
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/team/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone_number: phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setUserId(data.user_id || '');
      if (data.otp_code) setDebugOtp(data.otp_code);
      setStep('verify');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/team/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp_code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');
      // Store token and redirect
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role || 'team_member');
        localStorage.setItem('user_id', data.user_id || '');
      }
      router.push('/team/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062E22] via-[#0a4a37] to-[#0d6349] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Team Hub</h1>
          <p className="text-white/60 mt-2 text-sm">Event-Sphere</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[28px] p-8">
          {/* Steps */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 ${step === 'register' ? 'text-white' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'register' ? 'bg-white text-[#062E22]' : step === 'verify' ? 'bg-[#EC5B13] text-white' : 'bg-white/20 text-white'}`}>
                {step === 'verify' ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-semibold">Register</span>
            </div>
            <div className="flex-1 h-px bg-white/20" />
            <div className={`flex items-center gap-2 ${step === 'verify' ? 'text-white' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'verify' ? 'bg-white text-[#062E22]' : 'bg-white/20 text-white'}`}>
                2
              </div>
              <span className="text-sm font-semibold">Verify Phone</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+251 9xx xxx xxxx"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#EC5B13] hover:bg-[#d44d0f] text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-center">
                <Phone className="w-6 h-6 text-white mx-auto mb-2" />
                <p className="text-white/70 text-sm">OTP sent to <strong className="text-white">{phone}</strong></p>
                {debugOtp && (
                  <p className="text-yellow-300 text-xs mt-2 font-mono">Debug OTP: {debugOtp}</p>
                )}
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">6-Digit OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="••••••"
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-[#EC5B13] hover:bg-[#d44d0f] text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {loading ? 'Verifying...' : 'Verify & Enter Hub'}
              </button>

              <button
                type="button"
                onClick={() => setStep('register')}
                className="w-full text-white/50 hover:text-white/80 text-sm transition"
              >
                ← Back to registration
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-white/70 hover:text-white transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
