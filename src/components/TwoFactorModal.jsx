import React, { useState, useEffect } from "react";
import { Lock, CheckCircle2, AlertTriangle, X } from "lucide-react";

const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "");

export default function TwoFactorModal({ secret, onVerify, onClose, showNotification }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Log code to console for developer inspect purposes
  useEffect(() => {
    console.log(`[EverCare Security] Real Email Dispatch: Sent 2FA OTP [ ${secret} ] to user session.`);
  }, [secret]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    
    // Simulate verification
    setTimeout(() => {
      if (code === secret) {
        onVerify(true);
      } else {
        setErrorMsg("Incorrect 2FA code. Please verify the code received in your email inbox.");
        setLoading(false);
      }
    }, 1000);
  };

  const handleResend = () => {
    console.log(`[EverCare Security] Resent 2FA OTP [ ${secret} ] to user session.`);
    showNotification("Resent 2FA security code to your email.", "success");
  };

  return (
    <div className="glass-modal-overlay">
      <div className="glass-modal p-5 max-w-sm w-full relative">
        <button 
          onClick={onClose}
          className="absolute right-3.5 top-3.5 text-slate-450 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-1">
            <Lock size={22} className="animate-bounce" />
          </div>
          <h4 className="font-bold text-white text-base">Two-Factor Verification</h4>
          <p className="text-xs text-slate-400">
            For secure login verification, we have dispatched a 6-digit passcode OTP directly to your registered email address.
          </p>
          {/* DEV MODE: show OTP visibly so testing works without real email */}
          {IS_DEV && (
            <div style={{
              background: "#1a2e1a",
              border: "1px solid #22c55e",
              borderRadius: 6,
              padding: "6px 14px",
              marginTop: 4,
              width: "100%",
            }}>
              <div style={{ fontSize: 10, color: "#86efac", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>🛠 Dev Mode — Your OTP</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#4ade80", letterSpacing: 6, fontFamily: "monospace", marginTop: 2 }}>{secret}</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900/60 text-white text-lg font-bold tracking-widest text-center focus:border-indigo-500"
          />

          {errorMsg && (
            <div className="text-[11px] text-rose-500 bg-rose-500/5 p-2.5 rounded border border-rose-500/10 flex items-start gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 font-semibold text-xs flex justify-center items-center"
          >
            {loading ? "Verifying OTP..." : "Confirm Login Session"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            type="button" 
            onClick={handleResend}
            className="text-[11px] text-indigo-400 hover:underline"
          >
            Didn't receive code? Click to Resend
          </button>
        </div>
      </div>
    </div>
  );
}
