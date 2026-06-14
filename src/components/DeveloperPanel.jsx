import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  Database,
  Activity,
  AlertTriangle,
  Download,
  RotateCcw,
  Zap,
  CheckCircle,
  Clock
} from "lucide-react";
import { dbService } from "../services/firebase";

export default function DeveloperPanel({
  currentUser,
  setCurrentUser,
  onSimulateCrash,
  isCrashed,
  onRecoverCrash
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbMode, setDbMode] = useState("Detecting...");
  const [uptime, setUptime] = useState(99.98);
  const [sessionUptime, setSessionUptime] = useState(0);

  // Uptime ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch DB mode
  useEffect(() => {
    const checkMode = async () => {
      try {
        const isMock = await dbService.isMockMode();
        setDbMode(isMock ? "Mock (LocalStorage)" : "Live (Firebase)");
      } catch (e) {
        setDbMode("Live (Connected)");
      }
    };
    checkMode();
  }, []);

  const formatUptimeSession = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleRoleSwitch = async (email) => {
    try {
      const user = await dbService.getUser(email);
      if (user) {
        setCurrentUser(user);
        await dbService.logAction(user.email, "Developer Overwrite", `Role-switched via Developer Control Panel.`);
      }
    } catch (e) {
      console.error("Failed to switch role", e);
    }
  };

  const handleResetDB = async () => {
    if (window.confirm("Are you sure you want to restore the database to its clean seeded state? This will delete custom bookings.")) {
      try {
        await dbService.resetMockDatabase();
        alert("Database successfully restored! Reloading page...");
        window.location.reload();
      } catch (e) {
        alert("Failed to reset database: " + e.message);
      }
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupStr = await dbService.getDatabaseBackup();
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(backupStr);

      const exportFileDefaultName = `evercare_db_backup_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      await dbService.logAction(currentUser?.email || "system", "Database Backup", "Database backup file downloaded.");
    } catch (e) {
      alert("Failed to export backup: " + e.message);
    }
  };

  return (
    <div className={`dev-panel ${isOpen ? "open" : "closed"}`}>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="dev-panel-toggle shadow-lg"
        title="Developer Panel"
      >
        <Settings className={isOpen ? "spin" : ""} size={20} />
      </button>

      {/* Panel Body */}
      <div className="dev-panel-content glass-card">
        <div className="dev-header">
          <Activity className="pulse text-teal-400" size={18} />
          <h4>Demo Controls</h4>
        </div>

        <div className="dev-section">
          <div className="dev-section-title">Quick Role Switcher</div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleRoleSwitch("patient@evercare.com")}
              className={`dev-btn ${currentUser?.role === "patient" ? "active" : ""}`}
            >
              <User size={14} className="mr-1.5" /> Patient (Andrew)
            </button>
            <button
              onClick={() => handleRoleSwitch("doctor")}
              className={`dev-btn ${currentUser?.role === "doctor" ? "active" : ""}`}
            >
              <User size={14} className="mr-1.5" /> Doctor (Dr. Vance)
            </button>
            <button
              onClick={() => handleRoleSwitch("staff@evercare.com")}
              className={`dev-btn ${currentUser?.role === "staff" ? "active" : ""}`}
            >
              <User size={14} className="mr-1.5" /> Medical Staff (Sarah)
            </button>
            <button
              onClick={() => handleRoleSwitch("janandrewbalagso5@gmail.com")}
              className={`dev-btn ${currentUser?.role === "admin" ? "active" : ""}`}
            >
              <User size={14} className="mr-1.5" /> Administrator
            </button>
          </div>
        </div>

        <div className="dev-section">
          <div className="dev-section-title">System Status</div>
          <div className="dev-metric">
            <Database size={13} className="text-slate-400" />
            <span>Database:</span>
            <span className="font-bold text-teal-400 ml-auto text-xs">{dbMode}</span>
          </div>
          <div className="dev-metric">
            <Clock size={13} className="text-slate-400" />
            <span>App Uptime:</span>
            <span className="font-bold text-emerald-400 ml-auto text-xs">{uptime}%</span>
          </div>
          <div className="dev-metric">
            <Zap size={13} className="text-slate-400" />
            <span>Session:</span>
            <span className="font-bold text-indigo-400 ml-auto text-xs">{formatUptimeSession(sessionUptime)}</span>
          </div>
        </div>

        <div className="dev-section">
          <div className="dev-section-title">Disaster Simulation</div>
          <div className="flex flex-col gap-1.5">
            {!isCrashed ? (
              <button
                onClick={onSimulateCrash}
                className="dev-btn danger"
              >
                <AlertTriangle size={14} className="mr-1.5" /> Simulate Server Crash
              </button>
            ) : (
              <button
                onClick={onRecoverCrash}
                className="dev-btn success"
              >
                <CheckCircle size={14} className="mr-1.5" /> Initiate Crash Recovery
              </button>
            )}
            <button
              onClick={handleResetDB}
              className="dev-btn secondary"
            >
              <RotateCcw size={14} className="mr-1.5" /> Reset Database (Restore)
            </button>
            <button
              onClick={handleExportBackup}
              className="dev-btn secondary"
            >
              <Download size={14} className="mr-1.5" /> Export DB Backup
            </button>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 mt-4 text-center">
          EverCare Demo Environment v1.0.0
        </div>
      </div>
    </div>
  );
}
