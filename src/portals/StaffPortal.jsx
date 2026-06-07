import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  DollarSign,
  TrendingUp,
  UserPlus,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import { dbService } from "../services/firebase";

/* ── collapsible nav group (controlled) ──────────────────────────── */
function NavGroup({ icon, label, children, isOpen, onToggle }) {
  return (
    <div className="adm-nav-group">
      <button className="adm-nav-parent" onClick={onToggle}>
        <span className="adm-nav-parent-left">
          {icon}
          <span>{label}</span>
        </span>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {isOpen && <div className="adm-nav-children">{children}</div>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button
      className={`adm-nav-child ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon && <span className="adm-nav-child-icon">{icon}</span>}
      {label}
      {badge > 0 && (
        <span
          style={{
            marginLeft: "auto",
            background: "#f59e0b",
            color: "#1c1917",
            borderRadius: "9999px",
            fontSize: "10px",
            fontWeight: 700,
            padding: "1px 7px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── stat card (mirrors AdminPortal) ─────────────────────────── */
function StatCard({ label, value, icon, iconColor }) {
  return (
    <div className="adm-stat-card">
      <div className="adm-stat-info">
        <div className="adm-stat-label">{label}</div>
        <div className="adm-stat-value">{value}</div>
      </div>
      <div className="adm-stat-icon" style={{ color: iconColor }}>
        {icon}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────── */
export default function StaffPortal({
  currentUser,
  showNotification,
  onLogout,
}) {
  const [activeView, setActiveView] = useState("dashboard");
  const [openNavGroup, setOpenNavGroup] = useState("schedule");
  const toggleNavGroup = (key) =>
    setOpenNavGroup((prev) => (prev === key ? null : key));

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Search terms
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPatientTerm, setSearchPatientTerm] = useState("");

  // Reschedule modal
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Manual payment modal
  const [showManualPayment, setShowManualPayment] = useState(null);
  const [manualPayMethod, setManualPayMethod] = useState("Cash");

  // New patient form
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
    dob: "",
    bloodType: "O+",
    address: "",
  });
  const [patientLoading, setPatientLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const apts = await dbService.getAppointments();
      setAppointments(apts);
      const pats = await dbService.getPatients();
      setPatients(pats);
      const txns = await dbService.getTransactions();
      setTransactions(txns);
    } catch (e) {
      console.error("Failed to load staff data", e);
    }
  };

  /* ── actions ─────────────────────────────────────────────── */
  const handleApprove = async (aptId) => {
    try {
      await dbService.updateAppointmentStatus(aptId, { status: "Confirmed" });
      await dbService.logAction(
        currentUser.email,
        "Appointment Confirmed",
        `Staff approved: ${aptId}`,
      );
      showNotification("Appointment confirmed successfully!", "success");
      loadData();
    } catch (e) {
      showNotification("Failed to approve: " + e.message, "error");
    }
  };

  const handleReject = async (aptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?"))
      return;
    try {
      await dbService.updateAppointmentStatus(aptId, { status: "Cancelled" });
      await dbService.logAction(
        currentUser.email,
        "Appointment Cancelled",
        `Staff cancelled: ${aptId}`,
      );
      showNotification("Appointment cancelled.", "info");
      loadData();
    } catch (e) {
      showNotification("Failed to cancel: " + e.message, "error");
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;
    try {
      await dbService.updateAppointmentStatus(reschedulingApt.id, {
        date: newDate,
        time: newTime,
        status: "Pending",
      });
      await dbService.logAction(
        currentUser.email,
        "Appointment Rescheduled",
        `Rescheduled apt ${reschedulingApt.id} to ${newDate} at ${newTime}`,
      );
      showNotification("Appointment rescheduled.", "success");
      setReschedulingApt(null);
      loadData();
    } catch (e) {
      showNotification("Rescheduling failed: " + e.message, "error");
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setPatientLoading(true);
    try {
      const uid = "pat_" + Date.now();
      await dbService.createUser({
        uid,
        email: newPatientData.email,
        name: newPatientData.name,
        role: "patient",
        phone: newPatientData.phone,
        gender: newPatientData.gender,
        dob: newPatientData.dob,
        bloodType: newPatientData.bloodType,
        address: newPatientData.address,
      });
      showNotification("Patient record created successfully!", "success");
      setNewPatientData({
        name: "",
        email: "",
        phone: "",
        gender: "Male",
        dob: "",
        bloodType: "O+",
        address: "",
      });
      loadData();
      setActiveView("view-patient");
    } catch (e) {
      showNotification("Patient creation failed: " + e.message, "error");
    } finally {
      setPatientLoading(false);
    }
  };

  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!showManualPayment) return;
    try {
      const refId =
        "ref_cash_" + Math.random().toString(36).substring(2, 9).toUpperCase();
      await dbService.updateAppointmentStatus(showManualPayment.id, {
        paymentStatus: "Paid",
        status:
          showManualPayment.status === "Pending"
            ? "Confirmed"
            : showManualPayment.status,
      });
      await dbService.addTransaction({
        appointmentId: showManualPayment.id,
        patientId: showManualPayment.patientId,
        patientName: showManualPayment.patientName,
        amount: showManualPayment.fee,
        paymentMethod: "Manual - " + manualPayMethod,
        status: "Successful",
        referenceId: refId,
      });
      await dbService.logAction(
        currentUser.email,
        "Manual Transaction Processed",
        `Payment of ₱${showManualPayment.fee} logged for ${showManualPayment.patientName}`,
      );
      showNotification("Manual transaction processed successfully!", "success");
      setShowManualPayment(null);
      loadData();
    } catch (e) {
      showNotification("Transaction failed: " + e.message, "error");
    }
  };

  /* ── derived data ─────────────────────────────────────────── */
  const pendingApts = appointments.filter((a) => a.status === "Pending");
  const confirmedApts = appointments.filter(
    (a) => a.status === "Confirmed" || a.status === "Approved",
  );
  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);

  const filteredApts = appointments.filter(
    (a) =>
      a.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.specialty?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchPatientTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchPatientTerm.toLowerCase()),
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "Confirmed":
      case "Approved":
        return "adm-badge green";
      case "Pending":
        return "adm-badge orange";
      case "Cancelled":
        return "adm-badge red";
      case "Completed":
        return "adm-badge blue";
      default:
        return "adm-badge";
    }
  };

  const TIME_SLOTS = [
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
  ];

  return (
    <div className="adm-layout">
      {/* ── top bar ── */}
      <header className="adm-topbar">
        <h1 className="adm-system-title">Hospital Appointment System</h1>
        {onLogout && (
          <button
            className="adm-topbar-logout"
            onClick={onLogout}
            title="Sign Out"
          >
            <X size={15} />
          </button>
        )}
      </header>

      <div className="adm-body">
        {/* ── sidebar ── */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-label">Staff Navigation</div>

          <button
            className={`adm-nav-dashboard ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <NavGroup
            icon={<CalendarClock size={16} />}
            label="Schedule Desk"
            isOpen={openNavGroup === "schedule"}
            onToggle={() => toggleNavGroup("schedule")}
          >
            <NavItem
              label="Full Queue"
              active={activeView === "queue"}
              onClick={() => setActiveView("queue")}
            />
            <NavItem
              label="Pending Approvals"
              active={activeView === "pending-appointment"}
              onClick={() => setActiveView("pending-appointment")}
              badge={pendingApts.length}
            />
            <NavItem
              label="Confirmed Appointments"
              active={activeView === "confirmed-appointment"}
              onClick={() => setActiveView("confirmed-appointment")}
            />
          </NavGroup>

          <NavGroup
            icon={<Users size={16} />}
            label="Patients"
            isOpen={openNavGroup === "patients"}
            onToggle={() => toggleNavGroup("patients")}
          >
            <NavItem
              label="Register Patient"
              active={activeView === "add-patient"}
              onClick={() => setActiveView("add-patient")}
            />
            <NavItem
              label="Patient Directory"
              active={activeView === "view-patient"}
              onClick={() => setActiveView("view-patient")}
            />
          </NavGroup>

          <NavGroup
            icon={<CreditCard size={16} />}
            label="Ledger & Payments"
            isOpen={openNavGroup === "ledger"}
            onToggle={() => toggleNavGroup("ledger")}
          >
            <NavItem
              label="Billing History"
              active={activeView === "ledger"}
              onClick={() => setActiveView("ledger")}
            />
          </NavGroup>
        </aside>

        {/* ── main content ── */}
        <main className="adm-main">
          {/* ── RESCHEDULE MODAL ── */}
          {reschedulingApt && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
            >
              <div className="adm-form-card" style={{ width: 360 }}>
                <div className="adm-panel-header" style={{ marginBottom: 12 }}>
                  <h2 className="adm-panel-title" style={{ fontSize: "1rem" }}>Reschedule Appointment</h2>
                  <button
                    onClick={() => setReschedulingApt(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--adm-text-muted, #6b7280)",
                    marginBottom: 16,
                  }}
                >
                  Patient: <strong>{reschedulingApt.patientName}</strong>
                </p>
                <form onSubmit={handleRescheduleSubmit} className="adm-form">
                  <div className="adm-field">
                    <label className="adm-label">New Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="adm-input"
                    />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">New Time Slot</label>
                    <select
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="adm-input"
                    >
                      <option value="">-- Choose Slot --</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      onClick={() => setReschedulingApt(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="adm-btn-primary">
                      Update Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── MANUAL PAYMENT MODAL ── */}
          {showManualPayment && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
            >
              <div className="adm-form-card" style={{ width: 360 }}>
                <div className="adm-panel-header" style={{ marginBottom: 12 }}>
                  <h2 className="adm-panel-title" style={{ fontSize: "1rem" }}>Record Manual Payment</h2>
                  <button
                    onClick={() => setShowManualPayment(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--adm-text-muted, #6b7280)",
                    marginBottom: 16,
                  }}
                >
                  Logging payment for{" "}
                  <strong>{showManualPayment.patientName}</strong>'s
                  consultation (₱{showManualPayment.fee?.toLocaleString()}).
                </p>
                <form onSubmit={handleManualPaymentSubmit} className="adm-form">
                  <div className="adm-field">
                    <label className="adm-label">Payment Method</label>
                    <select
                      value={manualPayMethod}
                      onChange={(e) => setManualPayMethod(e.target.value)}
                      className="adm-input"
                    >
                      <option value="Cash">Cash Ledger</option>
                      <option value="POS - Credit Card">
                        POS - Credit Card
                      </option>
                      <option value="POS - Debit Card">POS - Debit Card</option>
                      <option value="Direct GCash/Maya OTC">
                        Direct GCash/Maya OTC
                      </option>
                    </select>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--adm-text-muted, #9ca3af)",
                      fontStyle: "italic",
                    }}
                  >
                    Note: Logging this payment will automatically confirm the
                    appointment and generate an audit ledger reference number.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      onClick={() => setShowManualPayment(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="adm-btn-primary">
                      Verify & Log Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== DASHBOARD ===== */}
          {activeView === "dashboard" && (
            <div className="adm-content-panel">
              <div className="adm-white-card">
                <div className="adm-panel-header">
                  <div>
                    <h2 className="adm-panel-title">Dashboard</h2>
                    <p className="adm-panel-sub">Staff Desk Overview</p>
                  </div>
                </div>
                <div className="adm-stats-row">
                  <StatCard
                    label="Total Patients"
                    value={patients.length}
                    icon={<Users size={36} />}
                    iconColor="#e91e8c"
                  />
                  <StatCard
                    label="Pending Approvals"
                    value={pendingApts.length}
                    icon={<Clock size={36} />}
                    iconColor="#f59e0b"
                  />
                  <StatCard
                    label="Confirmed Today"
                    value={confirmedApts.length}
                    icon={<ShieldCheck size={36} />}
                    iconColor="#17a2b8"
                  />
                  <StatCard
                    label="Total Revenue"
                    value={`₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={<TrendingUp size={36} />}
                    iconColor="#28a745"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== FULL QUEUE ===== */}
          {activeView === "queue" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Central Scheduling Queue</h2>
                <div style={{ position: "relative" }}>
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                    }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by patient, doctor, specialty..."
                    className="adm-input"
                    style={{ paddingLeft: 28, width: 280 }}
                  />
                </div>
              </div>
              <div className="adm-form-card">
                {filteredApts.length === 0 ? (
                  <div className="adm-empty">No appointments found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Fee</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApts.map((apt, i) => (
                        <tr key={apt.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{apt.patientName}</td>
                          <td>
                            {apt.doctorName}
                            <br />
                            <span style={{ fontSize: 11, color: "#6366f1" }}>
                              {apt.specialty}
                            </span>
                          </td>
                          <td>{apt.date}</td>
                          <td>{apt.time}</td>
                          <td style={{ fontWeight: 600 }}>
                            ₱{apt.fee?.toLocaleString()}
                          </td>
                          <td>
                            {apt.paymentStatus === "Paid" ? (
                              <span className="adm-badge green">Paid</span>
                            ) : (
                              <button
                                className="adm-btn-secondary"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                onClick={() => setShowManualPayment(apt)}
                              >
                                <DollarSign size={11} /> Record
                              </button>
                            )}
                          </td>
                          <td>
                            <span className={getStatusBadge(apt.status)}>
                              {apt.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 6,
                              }}
                            >
                              {apt.status === "Pending" && (
                                <>
                                  <button
                                    className="adm-btn-primary"
                                    style={{
                                      fontSize: 11,
                                      padding: "4px 10px",
                                      background: "#16a34a",
                                    }}
                                    onClick={() => handleApprove(apt.id)}
                                    title="Confirm"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    className="adm-btn-secondary"
                                    style={{
                                      fontSize: 11,
                                      padding: "4px 10px",
                                      color: "#ef4444",
                                      borderColor: "#ef4444",
                                    }}
                                    onClick={() => handleReject(apt.id)}
                                    title="Cancel"
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              )}
                              {apt.status !== "Cancelled" &&
                                apt.status !== "Completed" && (
                                  <button
                                    className="adm-btn-secondary"
                                    style={{
                                      fontSize: 11,
                                      padding: "4px 10px",
                                    }}
                                    onClick={() => {
                                      setReschedulingApt(apt);
                                      setNewDate(apt.date);
                                      setNewTime(apt.time);
                                    }}
                                  >
                                    Reschedule
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== PENDING APPOINTMENTS ===== */}
          {activeView === "pending-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Pending Approvals</h2>
              </div>
              <div className="adm-form-card">
                {pendingApts.length === 0 ? (
                  <div className="adm-empty">No pending appointments.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApts.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.patientName}</td>
                          <td>
                            {a.doctorName}
                            <br />
                            <span style={{ fontSize: 11, color: "#6366f1" }}>
                              {a.specialty}
                            </span>
                          </td>
                          <td>{a.date}</td>
                          <td>{a.time}</td>
                          <td>₱{a.fee?.toLocaleString()}</td>
                          <td>
                            <span className="adm-badge orange">{a.status}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 6,
                              }}
                            >
                              <button
                                className="adm-btn-primary"
                                style={{
                                  fontSize: 11,
                                  padding: "4px 12px",
                                  background: "#16a34a",
                                }}
                                onClick={() => handleApprove(a.id)}
                              >
                                Confirm
                              </button>
                              <button
                                className="adm-btn-secondary"
                                style={{
                                  fontSize: 11,
                                  padding: "4px 12px",
                                  color: "#ef4444",
                                  borderColor: "#ef4444",
                                }}
                                onClick={() => handleReject(a.id)}
                              >
                                Cancel
                              </button>
                              <button
                                className="adm-btn-secondary"
                                style={{ fontSize: 11, padding: "4px 12px" }}
                                onClick={() => {
                                  setReschedulingApt(a);
                                  setNewDate(a.date);
                                  setNewTime(a.time);
                                }}
                              >
                                Reschedule
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== CONFIRMED APPOINTMENTS ===== */}
          {activeView === "confirmed-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Confirmed Appointments</h2>
              </div>
              <div className="adm-form-card">
                {confirmedApts.length === 0 ? (
                  <div className="adm-empty">No confirmed appointments.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Fee</th>
                        <th>Payment</th>
                        <th style={{ textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confirmedApts.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.patientName}</td>
                          <td>
                            {a.doctorName}
                            <br />
                            <span style={{ fontSize: 11, color: "#6366f1" }}>
                              {a.specialty}
                            </span>
                          </td>
                          <td>{a.date}</td>
                          <td>{a.time}</td>
                          <td>₱{a.fee?.toLocaleString()}</td>
                          <td>
                            {a.paymentStatus === "Paid" ? (
                              <span className="adm-badge green">Paid</span>
                            ) : (
                              <button
                                className="adm-btn-secondary"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                onClick={() => setShowManualPayment(a)}
                              >
                                <DollarSign size={11} /> Record
                              </button>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="adm-badge green">{a.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== REGISTER PATIENT ===== */}
          {activeView === "add-patient" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Register New Patient</h2>
              </div>
              <div className="adm-form-card" style={{ maxWidth: 560 }}>
                <form onSubmit={handleCreatePatient} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field">
                      <label className="adm-label">Full Name</label>
                      <input
                        type="text"
                        className="adm-input"
                        placeholder="Juan dela Cruz"
                        value={newPatientData.name}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Email Address</label>
                      <input
                        type="email"
                        className="adm-input"
                        placeholder="patient@email.com"
                        value={newPatientData.email}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Phone Number</label>
                      <input
                        type="text"
                        className="adm-input"
                        placeholder="+63 9XX XXX XXXX"
                        value={newPatientData.phone}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            phone: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Date of Birth</label>
                      <input
                        type="date"
                        className="adm-input"
                        value={newPatientData.dob}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            dob: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Gender</label>
                      <select
                        className="adm-input"
                        value={newPatientData.gender}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            gender: e.target.value,
                          })
                        }
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Blood Type</label>
                      <select
                        className="adm-input"
                        value={newPatientData.bloodType}
                        onChange={(e) =>
                          setNewPatientData({
                            ...newPatientData,
                            bloodType: e.target.value,
                          })
                        }
                      >
                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                          (b) => (
                            <option key={b}>{b}</option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Home Address</label>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="Metro Manila"
                      value={newPatientData.address}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          address: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="adm-btn-primary"
                    disabled={patientLoading}
                  >
                    {patientLoading ? "Saving..." : "Save Patient Record"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===== PATIENT DIRECTORY ===== */}
          {activeView === "view-patient" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Patient Directory</h2>
                <button
                  className="adm-btn-primary"
                  onClick={() => setActiveView("add-patient")}
                >
                  <UserPlus
                    size={14}
                    style={{ display: "inline", marginRight: 5 }}
                  />
                  Register Patient
                </button>
              </div>
              <div className="adm-form-card">
                <div
                  style={{
                    marginBottom: 14,
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                    }}
                  />
                  <input
                    type="text"
                    value={searchPatientTerm}
                    onChange={(e) => setSearchPatientTerm(e.target.value)}
                    placeholder="Search patients..."
                    className="adm-input"
                    style={{ paddingLeft: 28, width: 240 }}
                  />
                </div>
                {filteredPatients.length === 0 ? (
                  <div className="adm-empty">No patient records found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Gender</th>
                        <th>Phone</th>
                        <th>Blood Type</th>
                        <th>DOB</th>
                        <th>Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p, i) => (
                        <tr key={p.uid || i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.email}</td>
                          <td>{p.gender || "—"}</td>
                          <td>{p.phone || "—"}</td>
                          <td>
                            <span className="adm-badge blue">
                              {p.bloodType || "—"}
                            </span>
                          </td>
                          <td>{p.dob || "—"}</td>
                          <td style={{ color: "#6b7280", fontSize: 12 }}>
                            {p.address || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== BILLING LEDGER ===== */}
          {activeView === "ledger" && (
            <div className="adm-content-panel">
              <div className="adm-white-card" style={{ marginBottom: 16 }}>
                <div className="adm-panel-header">
                  <div>
                    <h2 className="adm-panel-title">Ledger & Payments</h2>
                    <p className="adm-panel-sub">Financial billing history</p>
                  </div>
                </div>
                <div className="adm-stats-row">
                  <StatCard
                    label="Total Revenue"
                    value={`₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={<TrendingUp size={36} />}
                    iconColor="#28a745"
                  />
                  <StatCard
                    label="Total Transactions"
                    value={transactions.length}
                    icon={<CreditCard size={36} />}
                    iconColor="#17a2b8"
                  />
                </div>
              </div>

              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Billing History</h2>
              </div>
              <div className="adm-form-card">
                {transactions.length === 0 ? (
                  <div className="adm-empty">
                    No payment logs found in ledger.
                  </div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date Logged</th>
                        <th style={{ textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn, i) => (
                        <tr key={txn.id}>
                          <td>{i + 1}</td>
                          <td
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {txn.referenceId || txn.id}
                          </td>
                          <td style={{ fontWeight: 600 }}>{txn.patientName}</td>
                          <td style={{ fontWeight: 700, color: "#16a34a" }}>
                            ₱{txn.amount?.toLocaleString()}
                          </td>
                          <td>{txn.paymentMethod}</td>
                          <td style={{ fontSize: 12, color: "#6b7280" }}>
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="adm-badge green">
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
