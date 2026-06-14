import { useState, useEffect } from "react";
import {
  Heart,
  LogOut,
  Sun,
  Moon,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Power,
  RotateCcw,
} from "lucide-react";
import { dbService } from "./services/firebase";
import { notificationService } from "./services/notifications";
import PatientPortal from "./portals/PatientPortal";
import DoctorPortal from "./portals/DoctorPortal";
import StaffPortal from "./portals/StaffPortal";
import AdminPortal from "./portals/AdminPortal";
import LandingPage from "./components/LandingPage";
import TwoFactorModal from "./components/TwoFactorModal";
import PaymentModal from "./components/PaymentModal";
import DeveloperPanel from "./components/DeveloperPanel";

const SESSION_USER_KEY = "evercare_session_user";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authRestored, setAuthRestored] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("evercare_theme") || "dark",
  );
  const [notification, setNotification] = useState(null);
  const [landingTab, setLandingTab] = useState("home"); // 'home', 'about', 'appointment', 'contact', 'login'

  // Auth Screen State
  const [authTab, setAuthTab] = useState("login"); // 'login', 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registerRole, setRegisterRole] = useState("patient");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  // Security Verification State
  const [twoFactorUser, setTwoFactorUser] = useState(null);
  const [activePayment, setActivePayment] = useState(null);

  // Used to trigger a data refresh in portals after payment without a full page reload
  const [portalRefreshKey, setPortalRefreshKey] = useState(0);

  // System Crash Simulation State
  const [isCrashed, setIsCrashed] = useState(false);

  // Developer Panel Visibility Easter Egg
  const [logoClicks, setLogoClicks] = useState(0);
  const [devPanelVisible, setDevPanelVisible] = useState(false);

  const handleLogoClick = () => {
    const clicks = logoClicks + 1;
    setLogoClicks(clicks);
    if (clicks >= 5) {
      setDevPanelVisible(!devPanelVisible);
      setLogoClicks(0);
      showNotification(
        devPanelVisible
          ? "Developer Console Disabled."
          : "Developer Console Unlocked! Click logo 5 times to lock.",
        "success",
      );
    }
  };

  const persistSession = (user) => {
    if (user?.email) {
      localStorage.setItem(SESSION_USER_KEY, user.email);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const savedEmail = localStorage.getItem(SESSION_USER_KEY);
      if (!savedEmail) {
        setAuthRestored(true);
        return;
      }

      try {
        const user = await dbService.getUser(savedEmail);
        if (cancelled) return;
        if (user) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem(SESSION_USER_KEY);
        }
      } catch (error) {
        console.error("Failed to restore session", error);
        localStorage.removeItem(SESSION_USER_KEY);
      } finally {
        if (!cancelled) setAuthRestored(true);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply Theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("evercare_theme", theme);
  }, [theme]);

  // Toast Notification handler
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    // Clear notification after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const user = await dbService.getUser(email);
      if (!user) {
        showNotification(
          "Account not found. Please register as a patient.",
          "error",
        );
        return;
      }

      // Only patients need to pass the CAPTCHA check
      if (user.role === "patient" && !captchaVerified) {
        showNotification(
          "Please complete the security CAPTCHA check.",
          "error",
        );
        return;
      }

      // Verify password against stored value
      if (!user.password || password !== user.password) {
        showNotification("Incorrect password. Please try again.", "error");
        return;
      }

      // Check if 2FA is required for user or globally
      const systemSettings = await dbService.getSystemSettings();
      const requires2FA =
        user.twoFactorEnabled || systemSettings.twoFactorRequired;

      if (requires2FA) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save new 2FA code to database so verification works
        user.twoFactorSecret = otpCode;
        await dbService.updateUser(user.uid, { twoFactorSecret: otpCode });

        // Dispatch real email OTP
        showNotification(
          "Sending 2FA OTP security code to your email...",
          "info",
        );
        notificationService
          .sendOTPCode(user.email, user.name, otpCode)
          .then((success) => {
            if (success) {
              showNotification(
                "OTP sent! Please check your email inbox (and spam/junk folder).",
                "success",
              );
            } else {
              showNotification(
                "SMTP dispatch failed. Falling back to SMS simulator.",
                "warning",
              );
            }
          });

        setTwoFactorUser(user);
      } else {
        setCurrentUser(user);
        persistSession(user);
        await dbService.logAction(
          user.email,
          "User Login",
          `Logged in successfully via ${user.role} console.`,
        );
        showNotification(`Welcome back, ${user.name}!`, "success");
      }
    } catch (error) {
      showNotification("Login failed: " + error.message, "error");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!captchaVerified) {
      showNotification("Please complete the security CAPTCHA check.", "error");
      return;
    }

    try {
      const uid = "usr_" + Date.now();
      const newUser = await dbService.createUser({
        uid,
        email,
        password,
        name,
        role: registerRole,
        phone: "+63 917 111 2222",
        gender: "Male",
        dob: "1995-01-01",
        bloodType: "B+",
        address: "Metropolitan Manila",
      });

      showNotification(
        "Account created successfully! Logging you in...",
        "success",
      );
      setAuthTab("login");
setEmail(email);
showNotification("Account created! Please log in.", "success");
    } catch (error) {
      showNotification("Registration failed: " + error.message, "error");
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await dbService.logAction(
        currentUser.email,
        "User Logout",
        "Logged out from system session.",
      );
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_KEY);
    setEmail("");
    setPassword("");
    setName("");
    setCaptchaVerified(false);
    setCaptchaResetKey((k) => k + 1);
    setLandingTab("home");
    showNotification("Logged out successfully.", "info");
  };

  const handle2FAVerify = async (success) => {
    if (success && twoFactorUser) {
      setCurrentUser(twoFactorUser);
      persistSession(twoFactorUser);
      await dbService.logAction(
        twoFactorUser.email,
        "MFA Verification Cleared",
        "Successful login after 2FA challenge.",
      );
      showNotification(
        `2FA Cleared. Welcome, ${twoFactorUser.name}!`,
        "success",
      );
      setTwoFactorUser(null);
    }
  };

  // Switch portals depending on role
  const renderPortal = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case "patient":
        return (
          <PatientPortal
            currentUser={currentUser}
            refreshKey={portalRefreshKey}
            onInitiatePayment={(apt) => {
              setActivePayment({
                aptId: apt.id,
                amount: apt.fee,
                desc: `${apt.specialty} teleconsultation with ${apt.doctorName}`,
                name: currentUser.name,
                email: currentUser.email,
              });
            }}
            showNotification={showNotification}
            onLogout={handleLogout}
          />
        );
      case "doctor":
        return (
          <DoctorPortal
            currentUser={currentUser}
            showNotification={showNotification}
            onLogout={handleLogout}
          />
        );
      case "staff":
        return (
          <StaffPortal
            currentUser={currentUser}
            showNotification={showNotification}
            onLogout={handleLogout}
          />
        );
      case "admin":
        return (
          <AdminPortal
            currentUser={currentUser}
            showNotification={showNotification}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-white">
            Invalid role configuration.
          </div>
        );
    }
  };

  // Show a full-screen loader while session is being restored from localStorage
  if (!authRestored) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: "4px solid rgba(255,255,255,0.12)",
            borderTop: "4px solid #17a2b8",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#7a9ab0", fontSize: "0.85rem", letterSpacing: 1 }}>
          Restoring session…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* SYSTEM CRASH FLATLINE VIEW */}
      {isCrashed ? (
        <div className="crash-screen flex flex-col items-center justify-center p-6 text-center animate-pulse">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <Power size={48} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-wide uppercase">
            Critical Connection Interrupted
          </h1>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-8">
            A mock hardware/server stack crash drill was triggered. Healthcare
            services are offline. EverCare systems are monitoring backups
            recovery logs.
          </p>
          <button
            onClick={() => {
              setIsCrashed(false);
              showNotification(
                "System services recovered. Database restored.",
                "success",
              );
            }}
            className="btn-primary bg-rose-600 border-rose-500/35 hover:bg-rose-500 text-white font-bold flex items-center gap-2 py-3 px-6 shadow-lg shadow-rose-950"
          >
            <RotateCcw size={16} /> Recover System & Sync Backups
          </button>
        </div>
      ) : (
        /* NORMAL APPLICATION STATE */
        <>
          {/* Global Toast Notifications Banner */}
          {notification && (
            <div
              className={`toast-notification glass-card show ${notification.type}`}
            >
              {notification.type === "success" ? (
                <CheckCircle size={18} className="text-emerald-400" />
              ) : notification.type === "error" ? (
                <ShieldAlert size={18} className="text-rose-500" />
              ) : (
                <AlertCircle size={18} className="text-indigo-400" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                {notification.message}
              </span>
            </div>
          )}

          {/* PayMongo Payment Overlay screen */}
          {activePayment && (
            <PaymentModal
              sessionData={activePayment}
              onSuccess={() => {
                setActivePayment(null);
                setPortalRefreshKey((k) => k + 1);
                showNotification(
                  "Consultation fee paid successfully!",
                  "success",
                );
              }}
              onCancel={() => {
                setActivePayment(null);
                showNotification("Payment canceled by user.", "warning");
              }}
              showNotification={showNotification}
            />
          )}

          {/* 2FA Challenge Modal */}
          {twoFactorUser && (
            <TwoFactorModal
              secret={twoFactorUser.twoFactorSecret || "123456"}
              onVerify={handle2FAVerify}
              onClose={() => setTwoFactorUser(null)}
              showNotification={showNotification}
            />
          )}

          {/* Floating Developer Demo sidebar panel - unlocked via logo click */}
          {devPanelVisible && currentUser?.role !== "admin" && (
            <DeveloperPanel
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onSimulateCrash={() => setIsCrashed(true)}
              isCrashed={isCrashed}
              onRecoverCrash={() => setIsCrashed(false)}
            />
          )}

          {currentUser ? (
            renderPortal()
          ) : (
          <LandingPage
              authTab={authTab}
              setAuthTab={setAuthTab}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              registerRole={registerRole}
              setRegisterRole={setRegisterRole}
              captchaVerified={captchaVerified}
              setCaptchaVerified={setCaptchaVerified}
              captchaResetKey={captchaResetKey}
              handleLogin={handleLogin}
              handleRegister={handleRegister}
              showNotification={showNotification}
              landingTab={landingTab}
              setLandingTab={setLandingTab}
              setCurrentUser={setCurrentUser}
              persistSession={persistSession}
            />
          )}
        </>
      )}
    </div>
  );
}
