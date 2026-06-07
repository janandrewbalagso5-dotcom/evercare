import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Captcha({ onVerify }) {
  const [captchaText, setCaptchaText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'success', 'error'
  const canvasRef = useRef(null);

  const generateCaptchaText = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // Removed similar looking chars (I, 1, l, O, 0)
    let text = "";
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  };

  const drawCaptcha = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(0.5, "#0f172a");
    gradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (noise)
    ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 15) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw random noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 255, 0.4)`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw distorted text
    ctx.font = "bold 26px 'Outfit', sans-serif";
    ctx.textBaseline = "middle";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = canvas.width / (text.length + 1);
      const x = (i + 0.8) * charWidth + (Math.random() * 8 - 4);
      const y = canvas.height / 2 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 30 - 15) * Math.PI / 180; // rotate -15 to 15 deg

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Randomize character colors (bright clinical colors)
      const colors = ["#14b8a6", "#06b6d4", "#6366f1", "#8b5cf6", "#a855f7"];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Draw noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handleRefresh = () => {
    const text = generateCaptchaText();
    setCaptchaText(text);
    setInputValue("");
    setStatus("idle");
    onVerify(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length === 6) {
      if (value.toLowerCase() === captchaText.toLowerCase()) {
        setStatus("success");
        onVerify(true);
      } else {
        setStatus("error");
        onVerify(false);
      }
    } else {
      setStatus("idle");
      onVerify(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  useEffect(() => {
    if (captchaText) {
      drawCaptcha(captchaText);
    }
  }, [captchaText]);

  return (
    <div className="captcha-container glass-card" style={{ padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(15, 23, 42, 0.3)" }}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
          Security Verification
        </label>

        <div className="flex items-center gap-3">
          <canvas
            ref={canvasRef}
            width={180}
            height={50}
            className="rounded-lg border border-slate-700 shadow-inner bg-slate-900"
            style={{ width: "180px", height: "50px", display: "block" }}
          />
          <button
            type="button"
            onClick={handleRefresh}
            className="p-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition duration-200"
            title="Refresh Captcha"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="relative mt-2">
          <input
            type="text"
            maxLength={6}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter the 6-character code"
            className={`w-full px-4 py-3 rounded-lg border text-sm font-semibold tracking-widest text-center transition duration-200 uppercase bg-slate-900/60 text-white ${status === "success"
                ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                : status === "error"
                  ? "border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              }`}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {status === "success" && (
              <span className="text-emerald-500 flex items-center gap-1 text-xs">
                <CheckCircle2 size={16} /> Verified
              </span>
            )}
            {status === "error" && (
              <span className="text-rose-500 flex items-center gap-1 text-xs">
                <AlertTriangle size={16} /> Incorrect
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
