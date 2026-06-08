import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Calendar as CalIcon,
  User,
  Save,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Stethoscope,
  ClipboardList,
  CheckCircle,
  DollarSign,
  HeartPulse,
  Plus,
  Eye,
  Printer,
  X,
  Play,
  Menu,
} from "lucide-react";
import { dbService } from "../services/firebase";
import { notificationService } from "../services/notifications";

/* ─── helpers ──────────────────────────────────────────────────────── */
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
function NavItem({ label, active, onClick }) {
  return (
    <button
      className={`adm-nav-child ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
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
function statusBadge(status) {
  const map = {
    Confirmed: "green",
    Pending: "orange",
    Cancelled: "red",
    Completed: "blue",
    Active: "green",
  };
  return <span className={`adm-badge ${map[status] || "blue"}`}>{status}</span>;
}

/* ─── full-screen modal (like the reference images) ────────────────── */
function SlidePanel({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 0,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 940,
          minHeight: "100vh",
          boxShadow: "0 0 60px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        {/* purple corner accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderTop: "40px solid #7c3aed",
            borderLeft: "40px solid transparent",
          }}
        />
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5eaf0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.15rem",
              fontWeight: 700,
              color: "#1c2e3e",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "24px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── accordion section ────────────────────────────────────────────── */
function AccordionSection({ label, open, onToggle, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5eaf0",
        borderRadius: 6,
        marginBottom: 8,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "14px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "0.88rem",
          color: "#4a6274",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "1rem",
            color: "#7c3aed",
            minWidth: 14,
          }}
        >
          {open ? "–" : "+"}
        </span>
        <span>{label}</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f0f4f8" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── info table row (label | value two-column) ─────────────────────── */
function InfoRow({ label, value, shade }) {
  return (
    <tr style={{ background: shade ? "#f5f7fa" : "#fff" }}>
      <td
        style={{
          padding: "11px 16px",
          fontWeight: 700,
          fontSize: "0.84rem",
          color: "#1c2e3e",
          width: "30%",
        }}
      >
        {label}
      </td>
      <td
        style={{ padding: "11px 16px", fontSize: "0.84rem", color: "#374151" }}
      >
        {value || "—"}
      </td>
    </tr>
  );
}

/* ─── form row ──────────────────────────────────────────────────────── */
function FormRow({ label, children, shade }) {
  return (
    <tr style={{ background: shade ? "#f5f7fa" : "#fff" }}>
      <td
        style={{
          padding: "12px 20px",
          fontSize: "0.84rem",
          color: "#374151",
          width: "38%",
          verticalAlign: "middle",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "10px 20px", verticalAlign: "middle" }}>
        {children}
      </td>
    </tr>
  );
}

const inp = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d0dce6",
  borderRadius: 4,
  fontSize: "0.84rem",
  color: "#1c2e3e",
  background: "#f9fbfd",
  boxSizing: "border-box",
};
const sel = { ...inp, appearance: "none" };
const pinkInp = { ...inp, background: "#fce4e4", borderColor: "#f5b8b8" };

/* ═══════════════════════════════════════════════════════════════════ */
export default function DoctorPortal({
  currentUser,
  showNotification,
  onLogout,
}) {
  const [activeView, setActiveView] = useState("dashboard");
  const [openNavGroup, setOpenNavGroup] = useState("appointment");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleNavGroup = (key) =>
    setOpenNavGroup((prev) => (prev === key ? null : key));

  /* ── data ── */
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [availableHours, setAvailableHours] = useState([]);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");

  /* ── approval modal ── */
  const [approvalApt, setApprovalApt] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    department: "",
    date: "",
    time: "",
  });

  /* ── patient report panel ── */
  const [reportPatient, setReportPatient] = useState(null);
  const [openSections, setOpenSections] = useState({
    profile: false,
    appointment: false,
    treatment: false,
    prescription: false,
    billing: false,
  });

  /* ── treatment ── */
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [showAddTreat, setShowAddTreat] = useState(false);
  const [treatForm, setTreatForm] = useState({
    type: "",
    description: "",
    file: null,
    date: "",
    time: "",
    cost: "",
  });

  /* ── prescription ── */
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescStep, setShowPrescStep] = useState(null); // null | 1 | 2
  const [prescBase, setPrescBase] = useState({ date: "" });
  const [prescMed, setPrescMed] = useState({
    medicine: "",
    cost: "",
    unit: "",
    totalCost: "",
    dosage: "",
  });

  const printRef = useRef();

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      const allApts = await dbService.getAppointments();
      const docApts = allApts.filter((a) => a.doctorId === currentUser.uid);
      setAppointments(docApts);
      const uniqueIds = [...new Set(docApts.map((a) => a.patientId))];
      const allPats = await dbService.getPatients();
      setPatients(allPats.filter((p) => uniqueIds.includes(p.uid)));
      const docs = await dbService.getDoctors();
      const me = docs.find((d) => d.id === currentUser.uid);
      if (me) {
        setAvailableDays(me.availability?.days || []);
        setAvailableHours(me.availability?.hours || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSection = (k) =>
    setOpenSections((prev) => {
      const isAlreadyOpen = prev[k];
      // close all, then toggle the clicked one
      const fresh = Object.keys(prev).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {},
      );
      return { ...fresh, [k]: !isAlreadyOpen };
    });

  /* ── open report panel ── */
  const openReport = (pat) => {
    setReportPatient(pat);
    setOpenSections({
      profile: false,
      appointment: false,
      treatment: false,
      prescription: false,
      billing: false,
    });
    setActiveView("report-panel");
  };

  /* ── approve ── */
  const openApproval = (apt) => {
    setApprovalApt(apt);
    setApprovalForm({
      department: apt.department || "",
      date: apt.date || "",
      time: apt.time || "",
    });
  };
  const submitApproval = async (e) => {
    e.preventDefault();
    try {
      await dbService.updateAppointmentStatus(approvalApt.id, {
        status: "Confirmed",
        department: approvalForm.department,
        date: approvalForm.date,
        time: approvalForm.time,
      });
      showNotification("Appointment approved!", "success");
      setApprovalApt(null);
      await loadData();
      const pat = patients.find((p) => p.uid === approvalApt.patientId);
      if (pat) openReport(pat);
    } catch (err) {
      showNotification("Failed: " + err.message, "error");
    }
  };

  /* ── treatment ── */
  const submitTreat = (e) => {
    e.preventDefault();
    setTreatmentRecords((p) => [
      ...p,
      { id: Date.now(), ...treatForm, doctor: currentUser.name },
    ]);
    setTreatForm({
      type: "",
      description: "",
      file: null,
      date: "",
      time: "",
      cost: "",
    });
    setShowAddTreat(false);
    showNotification("Treatment record added!", "success");
  };

  /* ── prescription step 1 ── */
  const submitPrescBase = (e) => {
    e.preventDefault();
    setShowPrescStep(2);
  };
  /* ── prescription step 2 ── */
  const submitPrescMed = (e) => {
    e.preventDefault();
    setPrescriptions((p) => [
      ...p,
      {
        id: Date.now(),
        patient: reportPatient?.name,
        doctor: currentUser.name,
        date: prescBase.date,
        ...prescMed,
      },
    ]);
    setShowPrescStep(null);
    setPrescBase({ date: "" });
    setPrescMed({
      medicine: "",
      cost: "",
      unit: "",
      totalCost: "",
      dosage: "",
    });
    showNotification("Prescription saved!", "success");
  };

  /* ── print ── */
  const handlePrint = () => {
    const c = printRef.current?.innerHTML;
    if (!c) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Prescription</title><style>
      body{font-family:Georgia,serif;padding:32px;color:#1c2e3e}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{padding:10px 14px;border:1px solid #ddd;font-size:14px;text-align:left}
      th{background:#f5f7fa;font-weight:700} h2{color:#7c3aed;margin-bottom:4px}
      .lbl{color:#6b7280;font-size:12px;font-weight:700}
    </style></head><body>${c}</body></html>`);
    w.document.close();
    w.print();
  };

  /* ── availability ── */
  const toggleDay = (d) =>
    setAvailableDays((p) =>
      p.includes(d) ? p.filter((x) => x !== d) : [...p, d],
    );
  const toggleHour = (h) =>
    setAvailableHours((p) =>
      p.includes(h) ? p.filter((x) => x !== h) : [...p, h],
    );
  const saveAvail = async () => {
    try {
      await dbService.updateDoctorAvailability(currentUser.uid, {
        days: availableDays,
        hours: availableHours,
      });
      showNotification("Saved!", "success");
    } catch (e) {
      showNotification("Failed: " + e.message, "error");
    }
  };

  /* ── computed ── */
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const stdHours = [
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
    "06:00 PM",
  ];
  const treatTypes = [
    "Blood Test",
    "X-Ray",
    "MRI",
    "Ultrasound",
    "ECG",
    "Surgery",
    "Physiotherapy",
    "Vaccination",
    "Consultation",
    "Other",
  ];
  const medicines = [
    "Amoxicillin 500mg",
    "Paracetamol 500mg",
    "Ibuprofen 400mg",
    "Metformin 500mg",
    "Amlodipine 5mg",
    "Omeprazole 20mg",
    "Cetirizine 10mg",
    "Azithromycin 500mg",
  ];
  const departments = [
    "Gynecology",
    "Cardiology",
    "Orthopedics",
    "Neurology",
    "Pediatrics",
    "Dermatology",
    "General Medicine",
  ];

  const pendingApts = appointments.filter((a) => a.status === "Pending");
  const approvedApts = appointments.filter((a) => a.status === "Confirmed");
  const completedApts = appointments.filter((a) => a.status === "Completed");
  const totalIncome = completedApts.reduce(
    (s, a) => s + (parseFloat(a.fee) || 0),
    0,
  );
  const filteredPats = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchPatientTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchPatientTerm.toLowerCase()),
  );

  const aptForPatient = reportPatient
    ? appointments.find((a) => a.patientId === reportPatient.uid)
    : null;
  const billConsult = parseFloat(aptForPatient?.fee || 155);
  const billTreat = treatmentRecords.reduce(
    (s, t) => s + (parseFloat(t.cost) || 0),
    0,
  );
  const billRx = prescriptions.reduce(
    (s, p) => s + (parseFloat(p.cost) || 0),
    0,
  );
  const billSub = billConsult + billTreat + billRx;
  const billTax = billSub * 0.05;
  const billGrand = billSub + billTax;

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="adm-layout">
      <header className="adm-topbar">
        {/* Mobile sidebar toggle */}
        <button
          className="adm-mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="adm-topbar-center">
          <h1 className="adm-system-title">Hospital Appointment System</h1>
        </div>
        {onLogout && (
          <button className="adm-topbar-logout" onClick={onLogout}>
            <LogOut size={15} />
          </button>
        )}
      </header>

      <div className="adm-body">
        {/* Overlay for mobile — closes sidebar on tap */}
        <div
          className={`adm-sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className={`adm-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="adm-sidebar-label">MAIN NAVIGATION</div>
          <button
            className={`adm-nav-dashboard ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveView("dashboard"); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          <button
            className={`adm-nav-dashboard ${activeView === "profile" ? "active" : ""}`}
            onClick={() => { setActiveView("profile"); setSidebarOpen(false); }}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <NavGroup
            icon={<CalIcon size={16} />}
            label="Appointment"
            isOpen={openNavGroup === "appointment"}
            onToggle={() => toggleNavGroup("appointment")}
          >
            <NavItem
              label="View Pending Appointments"
              active={activeView === "apt-pending"}
              onClick={() => { setActiveView("apt-pending"); setSidebarOpen(false); }}
            />
            <NavItem
              label="View Approved Appointments"
              active={activeView === "apt-approved"}
              onClick={() => { setActiveView("apt-approved"); setSidebarOpen(false); }}
            />
          </NavGroup>
          <NavGroup
            icon={<Stethoscope size={16} />}
            label="Doctors"
            isOpen={openNavGroup === "doctors"}
            onToggle={() => toggleNavGroup("doctors")}
          >
            <NavItem
              label="Add Visiting Hour"
              active={activeView === "doc-add"}
              onClick={() => { setActiveView("doc-add"); setSidebarOpen(false); }}
            />
            <NavItem
              label="View Visiting Hour"
              active={activeView === "doc-view"}
              onClick={() => { setActiveView("doc-view"); setSidebarOpen(false); }}
            />
          </NavGroup>
          <NavGroup
            icon={<Users size={16} />}
            label="Patients"
            isOpen={openNavGroup === "patients"}
            onToggle={() => toggleNavGroup("patients")}
          >
            <NavItem
              label="View Patients"
              active={activeView === "patients"}
              onClick={() => { setActiveView("patients"); setSidebarOpen(false); }}
            />
          </NavGroup>
          <button
            className={`adm-nav-dashboard ${activeView === "income" ? "active" : ""}`}
            onClick={() => { setActiveView("income"); setSidebarOpen(false); }}
          >
            <DollarSign size={16} />
            <span>Income Report</span>
          </button>
          <NavGroup
            icon={<HeartPulse size={16} />}
            label="Service"
            isOpen={openNavGroup === "service"}
            onToggle={() => toggleNavGroup("service")}
          >
            <NavItem
              label="View Treatment Records"
              active={activeView === "treat-records"}
              onClick={() => { setActiveView("treat-records"); setSidebarOpen(false); }}
            />
            <NavItem
              label="View Treatment"
              active={activeView === "treat-view"}
              onClick={() => { setActiveView("treat-view"); setSidebarOpen(false); }}
            />
          </NavGroup>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <main className="adm-main">
          {/* ═══ DASHBOARD ════════════════════════════════════ */}
          {activeView === "dashboard" && (
            <div className="adm-content-panel">
              <div className="adm-white-card">
                <div className="adm-panel-header">
                  <div>
                    <h2 className="adm-panel-title">Dashboard</h2>
                    <p className="adm-panel-sub">
                      Welcome, Dr. {currentUser.name}
                    </p>
                  </div>
                </div>
                <div className="adm-stats-row">
                  <StatCard
                    label="Pending Appointments"
                    value={pendingApts.length}
                    icon={<ClipboardList size={36} />}
                    iconColor="#f59e0b"
                  />
                  <StatCard
                    label="Approved Appointments"
                    value={approvedApts.length}
                    icon={<CheckCircle size={36} />}
                    iconColor="#17a2b8"
                  />
                  <StatCard
                    label="Registered Patients"
                    value={patients.length}
                    icon={<Users size={36} />}
                    iconColor="#3f51b5"
                  />
                  <StatCard
                    label="Total Income"
                    value={`₱${totalIncome.toLocaleString()}`}
                    icon={<DollarSign size={36} />}
                    iconColor="#28a745"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ PROFILE ══════════════════════════════════════ */}
          {activeView === "profile" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">My Profile</h2>
              </div>
              <div className="adm-form-card">
                <table className="adm-info-table">
                  <tbody>
                    <tr>
                      <td className="adm-info-label">Name</td>
                      <td>Dr. {currentUser.name}</td>
                    </tr>
                    <tr>
                      <td className="adm-info-label">Email</td>
                      <td>{currentUser.email}</td>
                    </tr>
                    <tr>
                      <td className="adm-info-label">Role</td>
                      <td>
                        <span className="adm-badge blue">Doctor</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ PENDING APPOINTMENTS ═════════════════════════ */}
          {activeView === "apt-pending" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Pending Appointments</h2>
                <span className="adm-badge orange">
                  {pendingApts.length} Pending
                </span>
              </div>
              <div className="adm-form-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    fontSize: "0.83rem",
                    color: "#6b7280",
                    alignItems: "center",
                  }}
                >
                  <div>
                    Show{" "}
                    <select
                      style={{ ...sel, width: 60, display: "inline-block" }}
                    >
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>{" "}
                    entries
                  </div>
                  <div>
                    Search:{" "}
                    <input
                      style={{
                        ...inp,
                        width: 200,
                        display: "inline-block",
                        marginLeft: 6,
                      }}
                    />
                  </div>
                </div>
                {pendingApts.length === 0 ? (
                  <div className="adm-empty">No pending appointments.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Patient Detail</th>
                        <th>Date &amp; Time</th>
                        <th>Department</th>
                        <th>Doctor</th>
                        <th>Appointment Reason</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApts.map((apt) => (
                        <tr key={apt.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {apt.patientName}
                            </div>
                            <div
                              style={{ fontSize: "0.72rem", color: "#7a9ab0" }}
                            >
                              {apt.patientId}
                            </div>
                          </td>
                          <td>
                            {apt.date}
                            <div
                              style={{ fontSize: "0.72rem", color: "#7a9ab0" }}
                            >
                              {apt.time}
                            </div>
                          </td>
                          <td>{apt.department || "—"}</td>
                          <td>{apt.doctorName || currentUser.name}</td>
                          <td
                            style={{
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {apt.complaint}
                          </td>
                          <td>{statusBadge("Pending")}</td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 5,
                              }}
                            >
                              <button
                                className="adm-btn-primary"
                                style={{
                                  padding: "5px 14px",
                                  fontSize: "0.74rem",
                                  background: "#17a2b8",
                                  border: "none",
                                  borderRadius: 4,
                                }}
                                onClick={() => openApproval(apt)}
                              >
                                APPROVE
                              </button>
                              <button
                                style={{
                                  padding: "5px 14px",
                                  fontSize: "0.74rem",
                                  background: "#e05c5c",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                }}
                                onClick={async () => {
                                  await dbService.updateAppointmentStatus(
                                    apt.id,
                                    { status: "Cancelled" },
                                  );
                                  showNotification("Deleted.", "success");
                                  loadData();
                                }}
                              >
                                DELETE
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 14,
                    fontSize: "0.8rem",
                    color: "#6b7280",
                  }}
                >
                  <span>
                    Showing 1 to {pendingApts.length} of {pendingApts.length}{" "}
                    entries
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="adm-btn-secondary"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      Previous
                    </button>
                    <button
                      className="adm-btn-primary"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      1
                    </button>
                    <button
                      className="adm-btn-secondary"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ APPROVED APPOINTMENTS ════════════════════════ */}
          {activeView === "apt-approved" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Approved Appointments</h2>
                <span className="adm-badge green">
                  {approvedApts.length} Approved
                </span>
              </div>
              <div className="adm-form-card">
                {approvedApts.length === 0 ? (
                  <div className="adm-empty">No approved appointments.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Date &amp; Time</th>
                        <th>Department</th>
                        <th>Complaint</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedApts.map((apt, i) => {
                        const pat = patients.find(
                          (p) => p.uid === apt.patientId,
                        );
                        return (
                          <tr key={apt.id}>
                            <td>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>
                              {apt.patientName}
                            </td>
                            <td>
                              {apt.date}
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#7a9ab0",
                                }}
                              >
                                {apt.time}
                              </div>
                            </td>
                            <td>{apt.department || "—"}</td>
                            <td
                              style={{
                                maxWidth: 140,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {apt.complaint}
                            </td>
                            <td>₱{apt.fee}</td>
                            <td>{statusBadge("Confirmed")}</td>
                            <td>
                              <button
                                className="adm-btn-primary"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                                onClick={() => pat && openReport(pat)}
                              >
                                <Play size={11} style={{ fill: "white" }} />{" "}
                                Start
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══ VISITING HOURS ═══════════════════════════════ */}
          {activeView === "doc-add" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Add Visiting Hour</h2>
              </div>
              <div className="adm-form-card">
                <div className="adm-form-grid" style={{ marginBottom: 20 }}>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#1c2e3e",
                        marginBottom: 12,
                      }}
                    >
                      Available Days
                    </div>
                    {daysOfWeek.map((d) => (
                      <label
                        key={d}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          color: "#374151",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={availableDays.includes(d)}
                          onChange={() => toggleDay(d)}
                          style={{
                            accentColor: "#17a2b8",
                            width: 16,
                            height: 16,
                          }}
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#1c2e3e",
                        marginBottom: 12,
                      }}
                    >
                      Available Hours
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {stdHours.map((h) => (
                        <label
                          key={h}
                          onClick={() => toggleHour(h)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 6px",
                            border: `1px solid ${availableHours.includes(h) ? "#17a2b8" : "#d0dce6"}`,
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            background: availableHours.includes(h)
                              ? "#e0f7fa"
                              : "#f7fafc",
                            color: availableHours.includes(h)
                              ? "#0e7490"
                              : "#4a6274",
                          }}
                        >
                          {h}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  className="adm-btn-primary"
                  onClick={saveAvail}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Save size={15} /> Save Visiting Hours
                </button>
              </div>
            </div>
          )}
          {activeView === "doc-view" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Visiting Hours</h2>
              </div>
              <div className="adm-form-card">
                <div className="adm-form-grid">
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#1c2e3e",
                        marginBottom: 12,
                      }}
                    >
                      Scheduled Days
                    </div>
                    {availableDays.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: "0.83rem" }}>
                        No days configured.
                      </p>
                    ) : (
                      availableDays.map((d) => (
                        <div
                          key={d}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <CheckCircle size={14} color="#17a2b8" />
                          <span
                            style={{ fontSize: "0.85rem", color: "#374151" }}
                          >
                            {d}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#1c2e3e",
                        marginBottom: 12,
                      }}
                    >
                      Scheduled Hours
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {availableHours.map((h) => (
                        <span key={h} className="adm-badge blue">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PATIENTS ═════════════════════════════════════ */}
          {activeView === "patients" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">My Patients</h2>
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#7a9ab0",
                    }}
                  />
                  <input
                    className="adm-input"
                    value={searchPatientTerm}
                    onChange={(e) => setSearchPatientTerm(e.target.value)}
                    placeholder="Search patient..."
                    style={{ paddingLeft: 30, width: 220 }}
                  />
                </div>
              </div>
              <div className="adm-form-card">
                {filteredPats.length === 0 ? (
                  <div className="adm-empty">No patients found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Blood Type</th>
                        <th>Gender</th>
                        <th>Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPats.map((p, i) => (
                        <tr key={p.uid}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.email}</td>
                          <td>{p.phone || "—"}</td>
                          <td>
                            <span className="adm-badge blue">
                              {p.bloodType || "—"}
                            </span>
                          </td>
                          <td>{p.gender || "—"}</td>
                          <td>
                            {p.dob
                              ? `${new Date().getFullYear() - new Date(p.dob).getFullYear()} yrs`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══ INCOME ═══════════════════════════════════════ */}
          {activeView === "income" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Income Report</h2>
                <span className="adm-badge green">
                  Total: ₱{totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="adm-form-card">
                {completedApts.length === 0 ? (
                  <div className="adm-empty">
                    No completed appointments yet.
                  </div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Fee</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedApts.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.patientName}</td>
                          <td>{a.date}</td>
                          <td>{a.complaint}</td>
                          <td style={{ fontWeight: 700, color: "#28a745" }}>
                            ₱{a.fee}
                          </td>
                          <td>{statusBadge("Completed")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            padding: "10px 12px",
                          }}
                        >
                          Total:
                        </td>
                        <td style={{ fontWeight: 700, color: "#28a745" }}>
                          ₱{totalIncome.toLocaleString()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══ TREATMENT RECORDS / VIEW ═════════════════════ */}
          {(activeView === "treat-records" || activeView === "treat-view") && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">
                  {activeView === "treat-records"
                    ? "Treatment Records"
                    : "View Treatment"}
                </h2>
              </div>
              <div className="adm-form-card">
                {treatmentRecords.length === 0 ? (
                  <div className="adm-empty">No treatment records.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Treatment type</th>
                        <th>Doctor</th>
                        <th>Description</th>
                        <th>Date &amp; Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatmentRecords.map((t) => (
                        <tr key={t.id}>
                          <td>{t.type}</td>
                          <td>{t.doctor}</td>
                          <td
                            style={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.description}
                          </td>
                          <td>
                            {t.date}
                            <div
                              style={{ fontSize: "0.72rem", color: "#7a9ab0" }}
                            >
                              {t.time}
                            </div>
                          </td>
                          <td>{statusBadge("Active")}</td>
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

      {/* ══════════ PATIENT REPORT PANEL (full slide) ══════════════════ */}
      {activeView === "report-panel" && reportPatient && (
        <SlidePanel
          title="Patient Report Panel"
          onClose={() => setActiveView("apt-approved")}
        >
          {/* ── Patient Profile ── */}
          <AccordionSection
            label="Patient Profile"
            open={openSections.profile}
            onToggle={() => toggleSection("profile")}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
              }}
            >
              <tbody>
                <InfoRow
                  label="Patient Name"
                  value={reportPatient.name}
                  shade
                />
                <InfoRow label="Patient ID" value={reportPatient.uid} />
                <InfoRow label="Address" value={reportPatient.address} shade />
                <InfoRow label="Gender" value={reportPatient.gender} />
                <InfoRow
                  label="Contact Number"
                  value={reportPatient.phone}
                  shade
                />
                <InfoRow label="Date Of Birth" value={reportPatient.dob} />
              </tbody>
            </table>
          </AccordionSection>

          {/* ── Appointment Record ── */}
          <AccordionSection
            label="Appointment record"
            open={openSections.appointment}
            onToggle={() => toggleSection("appointment")}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
              }}
            >
              <tbody>
                <InfoRow
                  label="Department"
                  value={aptForPatient?.department}
                  shade
                />
                <InfoRow
                  label="Doctor"
                  value={aptForPatient?.doctorName || currentUser.name}
                />
                <InfoRow
                  label="Appointment Date"
                  value={aptForPatient?.date}
                  shade
                />
                <InfoRow label="Appointment Time" value={aptForPatient?.time} />
              </tbody>
            </table>
          </AccordionSection>

          {/* ── Treatment Record ── */}
          <AccordionSection
            label="Treatment record"
            open={openSections.treatment}
            onToggle={() => toggleSection("treatment")}
          >
            <table
              className="adm-table"
              style={{ marginTop: 8, marginBottom: 14 }}
            >
              <thead>
                <tr>
                  <th>Treatment type</th>
                  <th>Treatment date &amp; time</th>
                  <th>Doctor</th>
                  <th>Treatment Description</th>
                  <th>Treatment cost</th>
                </tr>
              </thead>
              <tbody>
                {treatmentRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
                        padding: 16,
                        fontSize: "0.83rem",
                      }}
                    >
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  treatmentRecords.map((t) => (
                    <tr key={t.id}>
                      <td>{t.type}</td>
                      <td>
                        {t.date}
                        <div style={{ fontSize: "0.72rem", color: "#7a9ab0" }}>
                          {t.time}
                        </div>
                      </td>
                      <td>{t.doctor}</td>
                      <td
                        style={{
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.description}
                      </td>
                      <td>₱{t.cost || "0"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button
              onClick={() => setShowAddTreat(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#17a2b8",
                fontSize: "0.88rem",
                fontWeight: 600,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Add Treatment records
            </button>
          </AccordionSection>

          {/* ── Prescription Record ── */}
          <AccordionSection
            label="Prescription record"
            open={openSections.prescription}
            onToggle={() => toggleSection("prescription")}
          >
            <table
              className="adm-table"
              style={{ marginTop: 8, marginBottom: 14 }}
            >
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Patient</th>
                  <th>Prescription Date</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
                        padding: 16,
                        fontSize: "0.83rem",
                      }}
                    >
                      No prescriptions yet.
                    </td>
                  </tr>
                ) : (
                  prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.doctor}</td>
                      <td>{p.patient}</td>
                      <td>{p.date}</td>
                      <td>
                        <button
                          className="adm-btn-secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => {
                            setPrescBase(p);
                            setPrescMed(p);
                            setShowPrescStep(2);
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button
              onClick={() => {
                setPrescBase({ date: "" });
                setShowPrescStep(1);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#17a2b8",
                fontSize: "0.88rem",
                fontWeight: 600,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Add Prescription records
            </button>
          </AccordionSection>

          {/* ── Billing Report ── */}
          <AccordionSection
            label="Billing Report"
            open={openSections.billing}
            onToggle={() => toggleSection("billing")}
          >
            <div style={{ marginTop: 12 }}>
              {/* bill header */}
              <table
                style={{
                  width: "60%",
                  borderCollapse: "collapse",
                  marginBottom: 20,
                }}
              >
                <tbody>
                  {[
                    [
                      "Bill number",
                      `#HMS_${reportPatient.uid?.slice(-1) || "6"}`,
                    ],
                    ["Appointment Number", aptForPatient?.id?.slice(-1) || "6"],
                    ["Billing Date", new Date().toISOString().split("T")[0]],
                    ["Billing time", new Date().toLocaleTimeString()],
                  ].map(([l, v], i) => (
                    <tr
                      key={l}
                      style={{ background: i % 2 === 0 ? "#f5f7fa" : "#fff" }}
                    >
                      <td
                        style={{
                          padding: "10px 16px",
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          textAlign: "right",
                          width: "50%",
                        }}
                      >
                        {l}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "0.84rem" }}>
                        {v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* line items */}
              <table className="adm-table" style={{ marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Bill Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{new Date().toISOString().split("T")[0]}</td>
                    <td>Consultancy Charge – Dr. {currentUser.name}</td>
                    <td style={{ textAlign: "right" }}>
                      ${billConsult.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>{new Date().toISOString().split("T")[0]}</td>
                    <td>Treatment</td>
                    <td style={{ textAlign: "right" }}>
                      ${(billTreat || 179).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>{new Date().toISOString().split("T")[0]}</td>
                    <td>Prescription Charge</td>
                    <td style={{ textAlign: "right" }}>${billRx.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              {/* totals */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                {[
                  ["Bill Amount", `$${billSub.toFixed(1)}`],
                  ["Tax Amount (5%)", `$${billTax.toFixed(1)}`],
                  ["Discount", "$0.00"],
                  ["Grand Total", `$${billGrand.toFixed(1)}`],
                ].map(([l, v], i) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      gap: 40,
                      padding: "6px 0",
                      borderTop:
                        l === "Grand Total" ? "2px solid #1c2e3e" : "none",
                      fontWeight: l === "Grand Total" ? 700 : 400,
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        color: "#6b7280",
                        minWidth: 160,
                        textAlign: "right",
                      }}
                    >
                      {l}
                    </span>
                    <span
                      style={{
                        minWidth: 80,
                        textAlign: "right",
                        color: "#1c2e3e",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>
        </SlidePanel>
      )}

      {/* ══════════ APPROVE APPOINTMENT MODAL ══════════════════════════ */}
      {approvalApt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 620,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                borderTop: "36px solid #7c3aed",
                borderLeft: "36px solid transparent",
              }}
            />
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid #e5eaf0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#1c2e3e",
                }}
              >
                Appointment Approval Process
              </h3>
            </div>
            <form onSubmit={submitApproval}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <FormRow label="Patient" shade>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#1c2e3e",
                        padding: "2px 0",
                      }}
                    >
                      {approvalApt.patientName} (Patient ID –{" "}
                      {approvalApt.patientId?.slice(-1) || "7"})
                    </div>
                  </FormRow>
                  <FormRow label="Department">
                    <select
                      style={sel}
                      value={approvalForm.department}
                      onChange={(e) =>
                        setApprovalForm((p) => ({
                          ...p,
                          department: e.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select</option>
                      {departments.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Doctor" shade>
                    <select style={sel}>
                      <option>
                        Dr. {currentUser.name} (
                        {approvalForm.department || "General"})
                      </option>
                    </select>
                  </FormRow>
                  <FormRow label="Appointment Date">
                    <input
                      type="date"
                      style={inp}
                      value={approvalForm.date}
                      onChange={(e) =>
                        setApprovalForm((p) => ({ ...p, date: e.target.value }))
                      }
                      required
                    />
                  </FormRow>
                  <FormRow label="Appointment Time" shade>
                    <input
                      type="time"
                      style={inp}
                      value={approvalForm.time}
                      onChange={(e) =>
                        setApprovalForm((p) => ({ ...p, time: e.target.value }))
                      }
                      required
                    />
                  </FormRow>
                  <FormRow label="Appointment reason">
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        fontStyle: "italic",
                        padding: "2px 0",
                      }}
                    >
                      {approvalApt.complaint}
                    </div>
                  </FormRow>
                </tbody>
              </table>
              <div
                style={{
                  padding: "20px 28px",
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: "10px 48px" }}
                >
                  SUBMIT
                </button>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{ padding: "10px 24px" }}
                  onClick={() => setApprovalApt(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ ADD TREATMENT MODAL ════════════════════════════════ */}
      {showAddTreat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 760,
              borderRadius: 4,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                borderTop: "36px solid #7c3aed",
                borderLeft: "36px solid transparent",
              }}
            />
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid #e5eaf0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#1c2e3e",
                }}
              >
                Add New treatment records
              </h3>
            </div>
            <form onSubmit={submitTreat}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <FormRow label="Appointment" shade>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        padding: "2px 0",
                      }}
                    >
                      {aptForPatient?.id?.slice(-1) || "6"}
                    </div>
                  </FormRow>
                  <FormRow label="Patient">
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        padding: "2px 0",
                      }}
                    >
                      {reportPatient?.name}
                    </div>
                  </FormRow>
                  <FormRow label="Select Treatment type" shade>
                    <select
                      style={sel}
                      value={treatForm.type}
                      onChange={(e) =>
                        setTreatForm((p) => ({ ...p, type: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select</option>
                      {treatTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Doctor">
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        padding: "2px 0",
                      }}
                    >
                      Dr. {currentUser.name} (
                      {aptForPatient?.department || "General"})
                    </div>
                  </FormRow>
                  <FormRow label="Treatment Description" shade>
                    <input
                      style={inp}
                      value={treatForm.description}
                      onChange={(e) =>
                        setTreatForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </FormRow>
                  <FormRow label="Treatment files">
                    <input
                      type="file"
                      style={{ fontSize: "0.84rem" }}
                      onChange={(e) =>
                        setTreatForm((p) => ({ ...p, file: e.target.files[0] }))
                      }
                    />
                  </FormRow>
                  <FormRow label="Treatment date" shade>
                    <input
                      type="date"
                      style={inp}
                      value={treatForm.date}
                      onChange={(e) =>
                        setTreatForm((p) => ({ ...p, date: e.target.value }))
                      }
                      required
                    />
                  </FormRow>
                  <FormRow label="Treatment Time">
                    <input
                      type="time"
                      style={inp}
                      value={treatForm.time}
                      onChange={(e) =>
                        setTreatForm((p) => ({ ...p, time: e.target.value }))
                      }
                      required
                    />
                  </FormRow>
                  <FormRow label="Treatment Cost (₱)" shade>
                    <input
                      type="number"
                      style={inp}
                      value={treatForm.cost}
                      onChange={(e) =>
                        setTreatForm((p) => ({ ...p, cost: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </FormRow>
                </tbody>
              </table>
              <div
                style={{
                  padding: "18px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #f0f4f8",
                }}
              >
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: "10px 36px" }}
                >
                  Submit
                </button>
                <a
                  href="#"
                  style={{
                    color: "#17a2b8",
                    fontSize: "0.83rem",
                    textDecoration: "none",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAddTreat(false);
                  }}
                >
                  | View Patient Report &gt;&gt;
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ PRESCRIPTION STEP 1 ════════════════════════════════ */}
      {showPrescStep === 1 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 760,
              borderRadius: 4,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                borderTop: "36px solid #7c3aed",
                borderLeft: "36px solid transparent",
              }}
            />
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid #e5eaf0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#1c2e3e",
                }}
              >
                Add New Prescription
              </h3>
            </div>
            <form onSubmit={submitPrescBase}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <FormRow label="Patient" shade>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        padding: "2px 0",
                      }}
                    >
                      {reportPatient?.uid?.slice(-1) || "7"} –{" "}
                      {reportPatient?.name}
                    </div>
                  </FormRow>
                  <FormRow label="Doctor">
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#4a6274",
                        padding: "2px 0",
                      }}
                    >
                      Dr. {currentUser.name} (
                      {aptForPatient?.department || "General"})
                    </div>
                  </FormRow>
                  <FormRow label="Prescription Date" shade>
                    <input
                      type="date"
                      style={inp}
                      value={prescBase.date}
                      onChange={(e) =>
                        setPrescBase((p) => ({ ...p, date: e.target.value }))
                      }
                      required
                    />
                  </FormRow>
                </tbody>
              </table>
              <div
                style={{
                  padding: "18px 28px",
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  borderTop: "1px solid #f0f4f8",
                }}
              >
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: "10px 40px" }}
                >
                  SUBMIT
                </button>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{ padding: "10px 24px" }}
                  onClick={() => setShowPrescStep(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ PRESCRIPTION STEP 2 ════════════════════════════════ */}
      {showPrescStep === 2 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 760,
              borderRadius: 4,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                borderTop: "36px solid #7c3aed",
                borderLeft: "36px solid transparent",
              }}
            />
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid #e5eaf0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#1c2e3e",
                }}
              >
                Add New Prescription Record
              </h3>
            </div>
            {/* header table */}
            <div style={{ padding: "16px 28px 0" }}>
              <table className="adm-table" style={{ marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Prescription Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Dr. {currentUser.name}</td>
                    <td>{reportPatient?.name}</td>
                    <td>{prescBase.date}</td>
                    <td>{statusBadge("Active")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <form onSubmit={submitPrescMed}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <FormRow label="Medicine" shade>
                    <select
                      style={sel}
                      value={prescMed.medicine}
                      onChange={(e) =>
                        setPrescMed((p) => ({ ...p, medicine: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select Medicine</option>
                      {medicines.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Cost">
                    <input
                      type="number"
                      style={pinkInp}
                      value={prescMed.cost}
                      onChange={(e) =>
                        setPrescMed((p) => ({
                          ...p,
                          cost: e.target.value,
                          totalCost: e.target.value,
                        }))
                      }
                      required
                    />
                  </FormRow>
                  <FormRow label="Unit" shade>
                    <input
                      style={inp}
                      value={prescMed.unit}
                      onChange={(e) =>
                        setPrescMed((p) => ({ ...p, unit: e.target.value }))
                      }
                      placeholder="e.g. tablet, capsule"
                    />
                  </FormRow>
                  <FormRow label="Total Cost">
                    <input
                      type="number"
                      style={pinkInp}
                      value={prescMed.totalCost}
                      onChange={(e) =>
                        setPrescMed((p) => ({
                          ...p,
                          totalCost: e.target.value,
                        }))
                      }
                    />
                  </FormRow>
                  <FormRow label="Dosage" shade>
                    <select
                      style={sel}
                      value={prescMed.dosage}
                      onChange={(e) =>
                        setPrescMed((p) => ({ ...p, dosage: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select</option>
                      {[
                        "Once daily",
                        "Twice daily",
                        "Three times daily",
                        "Every 8 hours",
                        "Every 6 hours",
                        "As needed",
                      ].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </FormRow>
                </tbody>
              </table>
              <div
                style={{
                  padding: "18px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #f0f4f8",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    className="adm-btn-primary"
                    style={{ padding: "10px 36px" }}
                  >
                    SUBMIT
                  </button>
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    style={{
                      padding: "10px 20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={handlePrint}
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{ padding: "10px 20px" }}
                  onClick={() => setShowPrescStep(null)}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* hidden print area */}
            <div ref={printRef} style={{ display: "none" }}>
              <h2>Prescription – Hospital Management System</h2>
              <table>
                <tbody>
                  <tr>
                    <td className="lbl">Doctor</td>
                    <td>Dr. {currentUser.name}</td>
                  </tr>
                  <tr>
                    <td className="lbl">Patient</td>
                    <td>{reportPatient?.name}</td>
                  </tr>
                  <tr>
                    <td className="lbl">Date</td>
                    <td>{prescBase.date}</td>
                  </tr>
                </tbody>
              </table>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Cost</th>
                    <th>Unit</th>
                    <th>Total Cost</th>
                    <th>Dosage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{prescMed.medicine}</td>
                    <td>${prescMed.cost}</td>
                    <td>{prescMed.unit}</td>
                    <td>${prescMed.totalCost}</td>
                    <td>{prescMed.dosage}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}