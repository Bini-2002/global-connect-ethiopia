"use client";

import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LoginHeader from "@/components/loginHeader";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = searchParams.get("role") ?? "";
  const email = searchParams.get("email") ?? "";

  const OTP_LENGTH = 4;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only numbers allowed

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
        handleVerify();
      }
  };

  const handleVerify = () => {
    const enteredOtp = otp.join("");
    if (enteredOtp === "1234") { // Simulated OTP
      setSuccess(true);
      setError("");
      router.push(`/${role}/register`);
    } else {
      setError("Invalid OTP. Please try again.");
    }
  };

  const [resendMessage, setResendMessage] = useState("");

  const handleResend = () => {
    // Simulate resending OTP
    setResendMessage(`OTP has been resent to ${email}`);
  
    // Clear message after 3 seconds
    setTimeout(() => {
      setResendMessage("");
    }, 7000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-green-700 mb-2">Verified!</h1>
          <p className="text-[#062E22]">Your email has been successfully verified.</p>
        </div>
      </div>
    );
  }

  return (<>
  <LoginHeader/>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100  p-4">
      <div className="max-w-md w-full bg-[#8CB98820] rounded-2xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-2xl font-bold mb-4 text-center text-[#062E22]">
          Verify Your Email
        </h1>
        {resendMessage && (
  <p className="text-green-600 text-sm text-center mb-2">{resendMessage}</p>
)}
        <p className="mb-6 text-center text-[#062E22]">
          Enter the OTP sent to <span className="font-semibold">{email}</span>
        </p>

        <div className="flex items-center justify-center grid-cols-4 gap-3 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el: HTMLInputElement | null) => { inputsRef.current[index] = el; }}
              className="w-12 text-black h-12 text-center border bg-white border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] text-xl outline-none"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}

        <button
          onClick={handleVerify}
          className="w-full bg-[#062E22] text-white py-2 rounded-lg hover:bg-[#045c33] transition mb-2"
        >
          Verify OTP
        </button>

        <button
          onClick={handleResend}
          className="w-full text-[#062E22] py-2 rounded-lg border border-[#062E22] hover:bg-[#062E22] hover:text-white transition"
        >
          Resend OTP
        </button>
      </div>
    </div></>
  );
}