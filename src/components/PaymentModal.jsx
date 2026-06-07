import React, { useState } from "react";
import { ShieldCheck, CreditCard, Smartphone, Check, Loader, AlertTriangle, ArrowLeft } from "lucide-react";
import { dbService } from "../services/firebase";

export default function PaymentModal({ sessionData, onSuccess, onCancel, showNotification }) {
  const { aptId, amount, desc, name, email } = sessionData;
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card', 'gcash', 'maya'
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // 'form', 'otp', 'success'
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  
  // E-Wallet Inputs
  const [phoneNumber, setPhoneNumber] = useState("");

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate PayMongo SSL Processing Flow
    setTimeout(() => {
      if (paymentMethod === "card") {
        setStep("success");
        setLoading(false);
      } else {
        // GCash/Maya OTP simulation
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

  const handleComplete = async () => {
    try {
      // 1. Log payment transaction
      await dbService.addTransaction({
        appointmentId: aptId,
        patientId: "pat_sample",
        patientName: name,
        amount: Number(amount),
        paymentMethod: `PayMongo - ${paymentMethod.toUpperCase()}`,
        status: "Successful",
        referenceId: "pm_ref_" + Math.random().toString(36).substring(2, 10).toUpperCase()
      });

      // 2. Set appointment status to Paid
      await dbService.updateAppointmentStatus(aptId, { paymentStatus: "Paid" });
      
      onSuccess();
    } catch (e) {
      showNotification("Error recording payment: " + e.message, "error");
    }
  };

  return (
    <div className="paymongo-overlay animate-fade-in">
      <div className="paymongo-container glass-card">
        {step !== "success" && (
          <div className="paymongo-header">
            <button onClick={onCancel} className="paymongo-back-btn">
              <ArrowLeft size={16} /> Back to EverCare
            </button>
            <div className="paymongo-logo">
              <span className="pay-tag text-teal-400">pay</span>
              <span className="mongo-tag text-slate-100">mongo</span>
              <span className="secure-badge">
                <ShieldCheck size={11} className="mr-0.5 text-teal-400" /> Secure SSL
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: FORM INPUT */}
        {step === "form" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: Summary */}
            <div className="md:col-span-2 paymongo-summary border-r border-slate-800/80 pr-4">
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Payment Summary</h4>
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="text-xs text-slate-500">Merchant</div>
                  <div className="text-sm font-semibold text-slate-200">EverCare Medical Center</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Description</div>
                  <div className="text-sm font-semibold text-slate-200">{desc}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Ref Code</div>
                  <div className="text-sm font-mono text-slate-350">{aptId}</div>
                </div>
                <div className="border-t border-slate-800 pt-3 mt-2">
                  <div className="text-xs text-slate-400">Total Amount</div>
                  <div className="text-2xl font-bold text-teal-400">₱{Number(amount).toLocaleString()}.00</div>
                </div>
              </div>
            </div>

            {/* Right: Payment Details */}
            <div className="md:col-span-3">
              <h4 className="font-bold text-white text-sm mb-4">Select Payment Option</h4>
              
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`pm-method-tab ${paymentMethod === "card" ? "active" : ""}`}
                >
                  <CreditCard size={14} /> Card
                </button>
                <button
                  onClick={() => setPaymentMethod("gcash")}
                  className={`pm-method-tab ${paymentMethod === "gcash" ? "active" : ""}`}
                >
                  <Smartphone size={14} /> GCash
                </button>
                <button
                  onClick={() => setPaymentMethod("maya")}
                  className={`pm-method-tab ${paymentMethod === "maya" ? "active" : ""}`}
                >
                  <Smartphone size={14} /> Maya
                </button>
              </div>

              {/* Form details */}
              <form onSubmit={handlePay} className="flex flex-col gap-3.5">
                {paymentMethod === "card" ? (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder={name}
                        className="pm-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Card Number</label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        className="pm-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength={5}
                          placeholder="MM/YY"
                          className="pm-input text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          required
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                          maxLength={3}
                          placeholder="***"
                          className="pm-input text-center"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      {paymentMethod.toUpperCase()} Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="09171234567"
                      className="pm-input"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="pm-btn mt-4 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={14} /> SECURING CONNECTION...
                    </>
                  ) : (
                    `PAY PHP ${Number(amount).toLocaleString()}.00`
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: WALLET OTP SIMULATION */}
        {step === "otp" && (
          <div className="max-w-md mx-auto text-center p-5 flex flex-col items-center">
            <Smartphone className="text-teal-400 mb-3 animate-pulse" size={32} />
            <h4 className="font-bold text-white mb-2">{paymentMethod.toUpperCase()} Security OTP Code</h4>
            <p className="text-xs text-slate-400 mb-4">
              We have sent a mock OTP to <strong>{phoneNumber.slice(0, 4)}***{phoneNumber.slice(-4)}</strong>. Use code <strong>123456</strong>.
            </p>

            <form onSubmit={handleOtpVerify} className="w-full flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                required
                placeholder="123456"
                className="pm-input text-center font-bold tracking-widest text-lg py-2.5"
              />
              
              <button
                type="submit"
                disabled={loading}
                className="pm-btn flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader className="animate-spin" size={14} /> : "VERIFY & PROCESS PAYMENT"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: TRANSACTION SUCCESSFUL */}
        {step === "success" && (
          <div className="text-center p-8 flex flex-col items-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <Check size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Reflected Successfully!</h3>
            <p className="text-xs text-slate-450 leading-relaxed mb-6">
              Your transaction has been securely cleared by PayMongo and recorded into the EverCare ledger. The clinical slot is now verified.
            </p>

            <button
              onClick={handleComplete}
              className="btn-primary w-full py-3 text-xs font-bold"
            >
              Continue to EverCare Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
