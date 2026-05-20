'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginHeader from '@/components/loginHeader';
import { ROLE_DASHBOARDS, saveAuthSession } from '@/app/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface VerifyEmailResponse {
  message: string;
  email_verified: boolean;
  otp_code?: string | null;
  access_token?: string;
  token_type?: string;
  user_id?: string;
  role?: string;
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = searchParams.get('role') ?? '';
  const email = searchParams.get('email') ?? '';

  const OTP_LENGTH = 6;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Removed Auto-send OTP on mount to prevent overwriting the registration OTP


  const sendOtp = async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          data && typeof data.detail === 'string'
            ? data.detail
            : 'Failed to send OTP';
        setError(detail);
        console.error(detail);
        return;
      }

      setError('');

      if (typeof data?.message === 'string') {
        setResendMsg(data.message);
        setTimeout(() => setResendMsg(''), 8000);
      }
    } catch (e) {
      setError('Network error while sending OTP.');
      console.error('Network error while sending OTP', e);
    }
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerify();
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length < OTP_LENGTH) {
      setError('Please enter the complete OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp_code: enteredOtp }),
      });
      const data: VerifyEmailResponse = await res.json().catch(() => ({
        message: 'Invalid OTP. Please try again.',
        email_verified: false,
      }));

      if (!res.ok) {
        setError((data as { detail?: string }).detail || data.message || 'Invalid OTP. Please try again.');
        return;
      }

      if (data.access_token) {
        saveAuthSession(data.access_token, data.token_type || 'bearer', true);
      }
      if (data.user_id) {
        localStorage.setItem('user_id', data.user_id);
      }

      setSuccess(true);
      const dest =
        role === 'organizer'
          ? '/organizer/register'
          : role === 'vendor'
          ? '/vendor/verification'
          : ROLE_DASHBOARDS[role] || '/';
      setTimeout(() => router.push(dest), 1200);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await sendOtp();
    setCooldown(30);
  };

  // Countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h1>
          <p className="text-slate-500 text-sm">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoginHeader />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 pt-20">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#062E22]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#062E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#062E22]">Verify Your Email</h1>
            <p className="text-slate-500 text-sm mt-2">
              Enter the OTP sent to <span className="font-semibold text-[#062E22]">{email}</span>
            </p>
          </div>

          {resendMsg && (
            <p className="text-green-600 text-sm text-center mb-3 bg-green-50 py-2 rounded-lg">{resendMsg}</p>
          )}

          <div className="flex items-center justify-center gap-3 mb-5">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                ref={(el: HTMLInputElement | null) => {
                  inputsRef.current[index] = el;
                }}
                aria-label={`OTP digit ${index + 1}`}
                className="w-14 h-14 text-center border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] text-xl font-bold text-slate-800 outline-none transition bg-slate-50"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            className="w-full bg-[#062E22] text-white py-3 rounded-xl font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full text-[#062E22] py-3 rounded-xl border border-[#062E22] hover:bg-[#062E22] hover:text-white transition text-sm font-medium disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
