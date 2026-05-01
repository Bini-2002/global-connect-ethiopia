// components/RegistrationForm.js
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

  const [passwordStrength, setPasswordStrength] = useState("Weak"); // Will calculate based on password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate password strength when password field changes
    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const handleRoleSelect = (role: "organizer" | "vendor" | "attendee") => {
    setFormData(prev => ({
      ...prev,
      role: role
    }));
  };

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



  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case "Weak": return "text-red-500";
      case "Medium": return "text-yellow-500";
      case "Strong": return "text-green-500";
      default: return "text-slate-500";
    }



  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post<{ user_id?: string, otp_code?: string | null }>("/auth/register", {
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        password: formData.password,
      });

      if (response.user_id) {
        localStorage.setItem("user_id", response.user_id);
      }

      // Check if verification was skipped (internal roles)
      if (response.otp_code === null || ["ministry_gov", "municipal_gov", "police"].includes(formData.role)) {
        router.push("/login");
        return;
      }

      // Redirect to verify-email page
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
  return (<>
    <LoginHeader />
    <div className="min-h-screen mt-15 bg-gradient-to-br from-slate-50 to-slate-100  flex items-center justify-center p-4 py-12">
      <div className="max-w-3xl w-full bg-[#8CB98820] rounded-2xl shadow-xl p-8 border border-slate-200">



        {/* Progress Step */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-amber-600 mb-2">STEP 1 </p>
          <h2 className="text-2xl font-bold text-slate-800">Create Your Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Basic Information
            </h3>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Abebe Bikila"
                className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] outline-none transition"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] outline-none transition"
                  required
                />
              </div>

              {/* Phone Number */}
              {/*<div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <PhoneInput
                international
                defaultCountry="ET"
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+251 911 234 567"
                className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] outline-none transition"
                required
              />
            </div> </div>

            Office Location 
            <div>
              <label htmlFor="officeLocation" className="block text-sm font-medium text-slate-700 mb-1">
                Office Location
              </label>
              <input
                type="text"
                id="officeLocation"
                name="officeLocation"
                value={formData.officeLocation}
                onChange={handleChange}
                placeholder="City, Building"
                className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] outline-none transition"
                required
              />*/}
            </div>
          </div>

          {/* Professional Role Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Professional Role
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Organizer Card */}
              <div
                onClick={() => handleRoleSelect("organizer")}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.role === "organizer"
                    ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
              >
                <h4 className="font-bold text-slate-800 mb-1">Organizer</h4>
                <p className="text-sm text-slate-600">Host events and manage vendors</p>
              </div>

              {/* Vendor Card */}
              <div
                onClick={() => handleRoleSelect("vendor")}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.role === "vendor"
                    ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
              >
                <h4 className="font-bold text-slate-800 mb-1">Vendor</h4>
                <p className="text-sm text-slate-600">Showcase products and services</p>
              </div>

              {/* Attendee Card */}
              <div
                onClick={() => handleRoleSelect("attendee")}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.role === "attendee"
                    ? "border-[#062E22] bg-amber-50 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                  }`}
              >
                <h4 className="font-bold text-slate-800 mb-1">Attendee</h4>
                <p className="text-sm text-slate-600">Explore and network with others</p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Security
            </h3>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:ring-2 focus:ring-[#062E22] focus:border-[#062E22] outline-none transition"
                required
                minLength={8}
              />
            </div>

            {/* Password Strength Indicator */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Password Strength:</span>
                <span className={`text-sm font-bold ${getPasswordStrengthColor()}`}>
                  {passwordStrength}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Use 8+ characters with a mix of letters, numbers & symbols
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-[#062E22] hover:bg-[#325b4f] text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              {loading ? "Registering..." : "Continue to Next Step →"}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mb-2">
              {error}
            </p>
          )}
          {/* Terms Agreement */}
          <p className="text-xs text-center text-slate-500">
            By clicking &quot;Continue&quot;, you agree to Global Connect Ethiopia&apos;s{" "}
            <Link href="/terms" className="text-amber-600 hover:text-amber-700 font-medium">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-amber-600 hover:text-amber-700 font-medium">
              Privacy Policy
            </Link>.
          </p>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-center text-xs text-slate-400">
            © 2024 Global Connect Ethiopia. All rights reserved.
          </p>
        </div>
      </div>
    </div> </>
  );
} 
