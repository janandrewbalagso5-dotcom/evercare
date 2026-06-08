import React, { useState, useRef } from "react";
import { ShieldCheck, CreditCard, Smartphone, Check, Loader, ArrowLeft, Upload, X, BadgePercent, AlertTriangle, User, Accessibility } from "lucide-react";
import { dbService } from "../services/firebase";

// Discount configuration
const DISCOUNT_CONFIG = {
  senior: {
    label: "Senior Citizen",
    icon: User,
    color: "amber",
    discountRate: 0.20,
    vatExempt: true,
    vatRate: 0.12,
    description: "20% discount + VAT exemption on covered transactions",
    law: "Republic Act No. 9994 – Expanded Senior Citizens Act",
    benefits: [
      "20% discount on medical services",
      "VAT exemption on covered transactions",
      "Valid government-issued Senior Citizen ID required",
    ],
  },
  pwd: {
    label: "Person with Disability (PWD)",
    icon: Accessibility,
    color: "blue",
    discountRate: 0.20,
    vatExempt: true,
    vatRate: 0.12,
    description: "20% discount + VAT exemption + 5% discount on basic goods",
    law: "Republic Act No. 10754 – PWD Discount Act",
    benefits: [
      "20% discount + VAT exemption on medical services",
      "5% discount on basic goods & commodities",
      "Valid PWD ID issued by DSWD/LGU required",
      "Applicable to 7 categories of disability under RA 10754",
    ],
  },
};

function computeDiscountedAmount(baseAmount, discountType) {
  if (!discountType) return { finalAmount: baseAmount, discountAmt: 0, vatSaved: 0 };
  const cfg = DISCOUNT_CONFIG[discountType];
  const vatInclusiveBase = baseAmount;
  const vatExclusiveBase = cfg.vatExempt
    ? vatInclusiveBase / (1 + cfg.vatRate)
    : vatInclusiveBase;
  const vatSaved = cfg.vatExempt ? vatInclusiveBase - vatExclusiveBase : 0;
  const discountAmt = vatExclusiveBase * cfg.discountRate;
  const finalAmount = vatExclusiveBase - discountAmt;
  return {
    finalAmount: Math.round(finalAmount * 100) / 100,
    discountAmt: Math.round(discountAmt * 100) / 100,
    vatSaved: Math.round(vatSaved * 100) / 100,
    totalSaved: Math.round((discountAmt + vatSaved) * 100) / 100,
  };
}

export default function PaymentModal({ sessionData, onSuccess, onCancel, showNotification }) {
  const { aptId, amount, desc, name, email } = sessionData;
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // 'form', 'otp', 'success'

  // Discount state
  const [discountType, setDiscountType] = useState(null);
  const [discountStep, setDiscountStep] = useState("select");
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [verifyingId, setVerifyingId] = useState(false);
  const [idVerifyError, setIdVerifyError] = useState(null);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const fileInputRef = useRef(null);

  // Card Inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // E-Wallet Inputs
  const [phoneNumber, setPhoneNumber] = useState("");

  const baseAmount = Number(amount);
  const discountResult = discountStep === "verified"
    ? computeDiscountedAmount(baseAmount, discountType)
    : { finalAmount: baseAmount, discountAmt: 0, vatSaved: 0, totalSaved: 0 };
  const finalAmount = discountResult.finalAmount;

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length > 0 ? parts.join(" ") : v;
  };

  const handleIdUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdFile(file);
    setIdVerifyError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setIdPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Use Claude Vision API to verify the uploaded ID is a real Philippine government ID
  const handleVerifyId = async () => {
    if (!idFile) return;
    setVerifyingId(true);
    setIdVerifyError(null);

    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(idFile);
      });

      const mediaType = idFile.type || "image/jpeg";
      const cfg = DISCOUNT_CONFIG[discountType];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: base64Data },
                },
                {
                  type: "text",
                  text: `You are an ID verification system for a Philippine medical payment portal. 
Analyze this image and determine if it is a valid Philippine government-issued ${cfg.label} ID card.

For Senior Citizen: Look for OSCA (Office for Senior Citizens Affairs) ID, or any Philippine government ID clearly showing the holder is a senior citizen (60+ years old). Acceptable IDs: OSCA ID, SSS ID, GSIS ID, PhilHealth ID, PRC ID, Passport, Driver's License, Voter's ID, or national ID (PhilSys).

For PWD: Look for a PWD ID issued by DSWD, LGU, or NCDA. It should clearly state "PWD" or "Person with Disability."

Respond ONLY with a valid JSON object (no markdown, no backticks) in this exact format:
{
  "isValid": true or false,
  "idType": "name of ID type detected or null",
  "reason": "brief explanation of why it is valid or invalid",
  "confidence": "high/medium/low"
}

Consider invalid if: the image is not an ID card, it's a random photo, screenshot of something unrelated, blank/solid color, cartoon/drawing, or clearly not a Philippine government ID.`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((i) => i.text || "").join("") || "";

      let result;
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        result = JSON.parse(clean);
      } catch {
        throw new Error("Could not parse verification response.");
      }

      if (result.isValid) {
        setDiscountStep("verified");
      } else {
        setIdVerifyError(
          result.reason || "The uploaded image does not appear to be a valid government ID. Please upload a clear photo of your official ID."
        );
        setIdFile(null);
        setIdPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      setIdVerifyError("Verification failed: " + err.message + ". Please try again.");
    } finally {
      setVerifyingId(false);
    }
  };

  const handleRemoveId = () => {
    setIdFile(null);
    setIdPreview(null);
    setIdVerifyError(null);
    setDiscountStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelDiscount = () => {
    setDiscountType(null);
    setDiscountStep("select");
    setIdFile(null);
    setIdPreview(null);
    setIdVerifyError(null);
    setShowDiscountPanel(false);
  };

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (paymentMethod === "card") {
        setStep("success");
        setLoading(false);
      } else {
        setStep("otp");
        setLoading(false);
      }
    }, 1800);
  };

  const handleOtpVerify = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setStep("success");
      setLoading(false);
    }, 1200);
  };

  // Back from OTP to payment form
  const handleBackFromOtp = () => {
    setStep("form");
  };

  const handleComplete = async () => {
    try {
      await dbService.addTransaction({
        appointmentId: aptId,
        patientId: "pat_sample",
        patientName: name,
        amount: finalAmount,
        originalAmount: baseAmount,
        discountType: discountType || "none",
        discountApplied: discountStep === "verified" ? discountResult.totalSaved : 0,
        paymentMethod: `PayMongo - ${paymentMethod.toUpperCase()}`,
        status: "Successful",
        referenceId: "pm_ref_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      });
      await dbService.updateAppointmentStatus(aptId, { paymentStatus: "Paid" });
      onSuccess();
    } catch (e) {
      showNotification("Error recording payment: " + e.message, "error");
    }
  };

  const cfg = discountType ? DISCOUNT_CONFIG[discountType] : null;

  return (
    /* ── Overlay: transparent so the dashboard shows through ── */
    <div
      className="paymongo-overlay animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      {/* ── Modal: white / light theme ── */}
      <div
        className="paymongo-container"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)",
          width: "100%",
          maxWidth: "760px",
          padding: "28px 28px 24px",
          color: "#1e293b",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {step !== "success" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
            <button
              onClick={onCancel}
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
            >
              <ArrowLeft size={14} /> Back to EverCare
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.5px" }}>
                <span style={{ color: "#0ea5e9" }}>pay</span>
                <span style={{ color: "#1e293b" }}>mongo</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#10b981", fontWeight: 600, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "999px", padding: "2px 8px" }}>
                <ShieldCheck size={10} /> Secure SSL
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 1: FORM ── */}
        {step === "form" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "24px" }}>
            {/* Left: Summary */}
            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "20px" }}>
              <h4 style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Payment Summary</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Merchant</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>EverCare Medical Center</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Description</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{desc}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Ref Code</div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#475569" }}>{aptId}</div>
                </div>

                {/* Discount Breakdown */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Base Amount</span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>₱{baseAmount.toLocaleString()}.00</span>
                  </div>
                  {discountStep === "verified" && cfg && (
                    <>
                      {discountResult.vatSaved > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "11px", color: "#10b981" }}>VAT Exemption</span>
                          <span style={{ fontSize: "11px", color: "#10b981" }}>-₱{discountResult.vatSaved.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "#10b981" }}>{cfg.label} Discount (20%)</span>
                        <span style={{ fontSize: "11px", color: "#10b981" }}>-₱{discountResult.discountAmt.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "4px", marginTop: "2px" }}>
                        <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Total Savings</span>
                        <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>₱{discountResult.totalSaved.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>Amount Due</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: discountStep === "verified" ? "#10b981" : "#0ea5e9" }}>
                      ₱{finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Discount badge */}
                {discountStep === "verified" && cfg && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px", padding: "8px 10px",
                    background: discountType === "senior" ? "#fffbeb" : "#eff6ff",
                    border: `1px solid ${discountType === "senior" ? "#fcd34d" : "#bfdbfe"}`,
                  }}>
                    <BadgePercent size={12} style={{ color: discountType === "senior" ? "#d97706" : "#3b82f6" }} />
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: discountType === "senior" ? "#92400e" : "#1d4ed8" }}>{cfg.label} Discount Applied</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{cfg.law}</div>
                    </div>
                  </div>
                )}

                {/* Discount toggle */}
                {discountStep !== "verified" && (
                  <button
                    onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                    style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 500, padding: 0 }}
                  >
                    <BadgePercent size={11} />
                    {showDiscountPanel ? "Hide" : "Apply"} Senior / PWD Discount
                  </button>
                )}
                {discountStep === "verified" && (
                  <button
                    onClick={handleCancelDiscount}
                    style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
                  >
                    <X size={11} /> Remove discount
                  </button>
                )}
              </div>
            </div>

            {/* Right: Payment / Discount Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* DISCOUNT PANEL */}
              {showDiscountPanel && discountStep !== "verified" && (
                <div style={{ borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h5 style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "5px", margin: 0 }}>
                      <BadgePercent size={12} style={{ color: "#0ea5e9" }} /> Discount Verification
                    </h5>
                    <button onClick={() => setShowDiscountPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <X size={13} />
                    </button>
                  </div>

                  {/* TYPE SELECTION */}
                  {discountStep === "select" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Select your discount type to apply government-mandated discounts.</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button
                          onClick={() => { setDiscountType("senior"); setDiscountStep("upload"); }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: "8px", border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", padding: "10px", cursor: "pointer" }}
                        >
                          <User size={20} style={{ color: "#d97706" }} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>Senior Citizen</div>
                            <div style={{ fontSize: "10px", color: "#b45309" }}>20% off + VAT exempt</div>
                          </div>
                        </button>
                        <button
                          onClick={() => { setDiscountType("pwd"); setDiscountStep("upload"); }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: "8px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "10px", cursor: "pointer" }}
                        >
                          <Accessibility size={20} style={{ color: "#3b82f6" }} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>PWD</div>
                            <div style={{ fontSize: "10px", color: "#2563eb" }}>20% off + VAT exempt</div>
                          </div>
                        </button>
                      </div>
                      <div style={{ borderRadius: "8px", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "10px" }}>
                        <p style={{ fontSize: "10px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                          <span style={{ color: "#0ea5e9", fontWeight: 600 }}>Governing law:</span> RA 9994 & RA 10754 grant 20% discount + VAT exemption on covered medical transactions. Valid government-issued ID required.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ID UPLOAD */}
                  {discountStep === "upload" && cfg && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={() => { setDiscountStep("select"); setDiscountType(null); setIdFile(null); setIdPreview(null); setIdVerifyError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                          <ArrowLeft size={13} />
                        </button>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: discountType === "senior" ? "#92400e" : "#1d4ed8" }}>
                          Upload {cfg.label} ID
                        </div>
                      </div>

                      <div style={{ borderRadius: "8px", border: `1px solid ${discountType === "senior" ? "#fcd34d" : "#bfdbfe"}`, background: discountType === "senior" ? "#fffbeb" : "#eff6ff", padding: "10px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Benefits under {cfg.law}:</p>
                        {cfg.benefits.map(b => (
                          <div key={b} style={{ fontSize: "10px", display: "flex", alignItems: "flex-start", gap: "5px", color: discountType === "senior" ? "#92400e" : "#1d4ed8", marginBottom: "3px" }}>
                            <Check size={9} style={{ marginTop: "2px", flexShrink: 0 }} />{b}
                          </div>
                        ))}
                      </div>

                      {/* Error message */}
                      {idVerifyError && (
                        <div style={{ borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <AlertTriangle size={12} style={{ color: "#ef4444", flexShrink: 0, marginTop: "1px" }} />
                          <p style={{ fontSize: "11px", color: "#b91c1c", margin: 0, lineHeight: 1.5 }}>{idVerifyError}</p>
                        </div>
                      )}

                      {!idPreview ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer", transition: "border-color 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "#0ea5e9"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}
                        >
                          <Upload size={18} style={{ color: "#94a3b8" }} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "12px", color: "#475569" }}>Click to upload your {cfg.label} ID</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>PNG, JPG accepted · Max 5MB</div>
                          </div>
                          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIdUpload} />
                        </div>
                      ) : (
                        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                          <img src={idPreview} alt="ID Preview" style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                          <button
                            onClick={handleRemoveId}
                            style={{ position: "absolute", top: "6px", right: "6px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}
                          >
                            <X size={11} />
                          </button>
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 8px", fontSize: "10px", color: "#fff" }}>{idFile?.name}</div>
                        </div>
                      )}

                      {idFile && (
                        <button
                          onClick={handleVerifyId}
                          disabled={verifyingId}
                          style={{ padding: "9px", borderRadius: "8px", background: "#0ea5e9", color: "#fff", border: "none", cursor: verifyingId ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: verifyingId ? 0.8 : 1 }}
                        >
                          {verifyingId ? (
                            <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Verifying ID with AI...</>
                          ) : (
                            <><ShieldCheck size={12} /> Verify & Apply Discount</>
                          )}
                        </button>
                      )}

                      <div style={{ display: "flex", gap: "8px", borderRadius: "8px", background: "#fffbeb", border: "1px solid #fde68a", padding: "8px" }}>
                        <AlertTriangle size={10} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
                        <p style={{ fontSize: "10px", color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                          Only valid Philippine government-issued IDs are accepted. Fraudulent claims are subject to legal action under existing laws.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT METHOD */}
              <div>
                <h4 style={{ fontWeight: 700, color: "#1e293b", fontSize: "14px", marginBottom: "14px" }}>Select Payment Option</h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "18px" }}>
                  {[
                    { id: "card", icon: <CreditCard size={13} />, label: "Card" },
                    { id: "gcash", icon: <Smartphone size={13} />, label: "GCash" },
                    { id: "maya", icon: <Smartphone size={13} />, label: "Maya" },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                        border: paymentMethod === m.id ? "2px solid #0ea5e9" : "1px solid #e2e8f0",
                        background: paymentMethod === m.id ? "#f0f9ff" : "#fff",
                        color: paymentMethod === m.id ? "#0284c7" : "#64748b",
                        transition: "all 0.15s",
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {paymentMethod === "card" ? (
                    <>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>Cardholder Name</label>
                        <input type="text" required placeholder={name} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>Card Number</label>
                        <input
                          type="text" required value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19} placeholder="4111 2222 3333 4444" style={inputStyle}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>Expiry Date</label>
                          <input type="text" required value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} maxLength={5} placeholder="MM/YY" style={{ ...inputStyle, textAlign: "center" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>CVC / CVV</label>
                          <input type="password" required value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))} maxLength={3} placeholder="***" style={{ ...inputStyle, textAlign: "center" }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>
                        {paymentMethod.toUpperCase()} Mobile Number
                      </label>
                      <input type="text" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))} placeholder="09171234567" style={inputStyle} />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ marginTop: "8px", padding: "12px", borderRadius: "8px", background: loading ? "#7dd3fc" : "#0ea5e9", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: "0.03em" }}
                  >
                    {loading ? (
                      <><Loader style={{ animation: "spin 1s linear infinite" }} size={13} /> SECURING CONNECTION...</>
                    ) : (
                      `PAY PHP ${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <div style={{ maxWidth: "380px", margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
            {/* Back button to return to payment form */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
              <button
                onClick={handleBackFromOtp}
                style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#64748b", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
              >
                <ArrowLeft size={13} /> Back to Payment
              </button>
            </div>

            <Smartphone style={{ color: "#0ea5e9", margin: "0 auto 12px", display: "block" }} size={30} />
            <h4 style={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px", fontSize: "15px" }}>
              {paymentMethod.toUpperCase()} Security OTP Code
            </h4>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
              We have sent a mock OTP to <strong>{phoneNumber.slice(0, 4)}***{phoneNumber.slice(-4)}</strong>. Use code <strong>123456</strong>.
            </p>
            <form onSubmit={handleOtpVerify} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="text" maxLength={6} required placeholder="123456"
                style={{ ...inputStyle, textAlign: "center", fontWeight: 700, letterSpacing: "0.25em", fontSize: "18px", padding: "12px" }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: "11px", borderRadius: "8px", background: loading ? "#7dd3fc" : "#0ea5e9", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                {loading ? <Loader style={{ animation: "spin 1s linear infinite" }} size={13} /> : "VERIFY & PROCESS PAYMENT"}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 3: SUCCESS ── */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "360px", margin: "0 auto" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#ecfdf5", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", marginBottom: "16px" }}>
              <Check size={28} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>Payment Reflected Successfully!</h3>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6, marginBottom: "16px" }}>
              Your transaction has been securely cleared by PayMongo and recorded into the EverCare ledger. The clinical slot is now verified.
            </p>
            {discountStep === "verified" && cfg && (
              <div style={{ width: "100%", borderRadius: "8px", padding: "12px", marginBottom: "16px", background: discountType === "senior" ? "#fffbeb" : "#eff6ff", border: `1px solid ${discountType === "senior" ? "#fcd34d" : "#bfdbfe"}` }}>
                <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: discountType === "senior" ? "#92400e" : "#1d4ed8" }}>
                  {cfg.label} Discount Applied
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  You saved <span style={{ color: "#10b981", fontWeight: 700 }}>₱{discountResult.totalSaved?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> on this transaction
                </div>
              </div>
            )}
            <button
              onClick={handleComplete}
              style={{ width: "100%", padding: "13px", borderRadius: "8px", background: "#0ea5e9", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
            >
              Continue to EverCare Portal
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "7px",
  border: "1px solid #e2e8f0",
  fontSize: "13px",
  color: "#1e293b",
  background: "#f8fafc",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};