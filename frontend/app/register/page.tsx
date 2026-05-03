// components/RegistrationForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoginHeader from "@/components/loginHeader";
import api from "@/app/lib/api";

export default function RegistrationForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    password: "",
  });
  const [passwordStrength, setPasswordStrength] = useState("Weak");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculatePasswordStrength = (password: string) => {
    // Simple password strength calculation
    if (password.length < 6) {
      setPasswordStrength("Weak");
    } else if (password.length < 10) {
      setPasswordStrength("Medium");
    } else {
      setPasswordStrength("Strong");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const handleRoleSelect = (role: "organizer" | "vendor" | "attendee") => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case "Weak":
        return "text-red-500";
      case "Medium":
        return "text-yellow-500";
      case "Strong":
        return "text-green-500";
      default:
        return "text-slate-500";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post<{
        user_id?: string;
        otp_code?: string | null;
      }>("/auth/register", {
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        password: formData.password,
      });

      if (response.user_id) {
        localStorage.setItem("user_id", response.user_id);
      }

      const internalRoles = ["ministry_gov", "municipal_gov", "police", "admin"];
      const skipsOtp = response.otp_code === null || internalRoles.includes(formData.role);

      if (skipsOtp) {
        router.push("/login");
        return;
      }

      const params = new URLSearchParams({
        role: formData.role,
        email: formData.email,
      }).toString();

      router.push(`/verify-email?${params}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginHeader />
      <div className="min-h-screen mt-15 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-[#8CB98820] p-8 shadow-xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-amber-600">STEP 1</p>
            <h2 className="text-2xl font-bold text-slate-800">Create Your Profile</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">
                Basic Information
              </h3>

              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Abebe Bikila"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-black outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-black outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">
                Professional Role
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div
                  onClick={() => handleRoleSelect("organizer")}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    formData.role === "organizer"
                      ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
                >
                  <h4 className="mb-1 font-bold text-slate-800">Organizer</h4>
                  <p className="text-sm text-slate-600">Host events and manage vendors</p>
                </div>

                <div
                  onClick={() => handleRoleSelect("vendor")}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    formData.role === "vendor"
                      ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
                >
                  <h4 className="mb-1 font-bold text-slate-800">Vendor</h4>
                  <p className="text-sm text-slate-600">Showcase products and services</p>
                </div>

                <div
                  onClick={() => handleRoleSelect("attendee")}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    formData.role === "attendee"
                      ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
                >
                  <h4 className="mb-1 font-bold text-slate-800">Attendee</h4>
                  <p className="text-sm text-slate-600">Explore and network with others</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">
                Security
              </h3>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-black outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Password Strength:</span>
                  <span className={`text-sm font-bold ${getPasswordStrengthColor()}`}>
                    {passwordStrength}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Use 8+ characters with a mix of letters, numbers & symbols</p>
              </div>
            </div>

            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full rounded-lg bg-[#062E22] px-4 py-3 font-semibold text-white shadow-md transition duration-200 hover:bg-[#325b4f] hover:shadow-lg"
              >
                {loading ? "Registering..." : "Continue to Next Step →"}
              </button>
            </div>

            {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

            <p className="text-center text-xs text-slate-500">
              By clicking &quot;Continue&quot;, you agree to Global Connect Ethiopia&apos;s{" "}
              <Link href="/terms" className="font-medium text-amber-600 hover:text-amber-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-amber-600 hover:text-amber-700">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-center text-xs text-slate-400">© 2024 Global Connect Ethiopia. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
}
