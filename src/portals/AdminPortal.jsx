import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  UserCircle,
  KeyRound,
  UserPlus,
  Users,
  CalendarPlus,
  CalendarCheck,
  CalendarClock,
  Stethoscope,
  UserSearch,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShieldAlert,
  RotateCcw,
  Database,
  Eye,
  Lock,
  UserCog,
  LogOut,
  Menu,
  X,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Bell,
}from "lucide-react";
import { dbService } from "../services/firebase";
import { notificationService } from "../services/notifications";

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

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      className={`adm-nav-child ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon && <span className="adm-nav-child-icon">{icon}</span>}
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

export default function AdminPortal({ currentUser, showNotification, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState(null);
  const toggleNavGroup = (key) =>
    setOpenNavGroup((prev) => (prev === key ? null : key));

  const [stats, setStats] = useState({ patients: 0, doctors: 0, admins: 1, earning: 0 });
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    twoFactorRequired: false,
    allowedDomains: "*",
    backupInterval: "Daily",
    departments: [],
    treatments: [],
    medicines: [],
  });

  // ── Service state ──────────────────────────────────────────────
  const [departments, setDepartments] = useState([
    { id: "dep_1", name: "Cardiology", description: "Heart and cardiovascular care" },
    { id: "dep_2", name: "Pediatrics", description: "Child and infant healthcare" },
    { id: "dep_3", name: "Dermatology", description: "Skin, hair, and nail conditions" },
    { id: "dep_4", name: "General Medicine", description: "Primary care and general health" },
    { id: "dep_5", name: "Orthopedics", description: "Bone, joint, and muscle treatment" },
  ]);
  const [newDepartment, setNewDepartment] = useState({ name: "", description: "" });

  const [treatmentTypes, setTreatmentTypes] = useState([
    { id: "tr_1", name: "Consultation", cost: 1000, status: "Active", note: "Standard doctor consultation" },
    { id: "tr_2", name: "ECG", cost: 800, status: "Active", note: "Electrocardiogram test" },
    { id: "tr_3", name: "Blood Test", cost: 500, status: "Active", note: "Complete blood count and analysis" },
  ]);
  const [newTreatment, setNewTreatment] = useState({ name: "", cost: "", status: "Active", note: "" });

  const [medicines, setMedicines] = useState([
    { id: "med_1", name: "Metoprolol", type: "Tablet", stock: 100, status: "Available" },
    { id: "med_2", name: "Amoxicillin", type: "Capsule", stock: 200, status: "Available" },
    { id: "med_3", name: "Ibuprofen", type: "Tablet", stock: 50, status: "Low Stock" },
  ]);
  const [newMedicine, setNewMedicine] = useState({ name: "", type: "Tablet", stock: "", status: "Available" });

  // ── Doctor / Patient forms ─────────────────────────────────────
  const [newDoc, setNewDoc] = useState({
    name: "", specialty: "Cardiology", fee: 1000, bio: "",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
  });
  const [docLoading, setDocLoading] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [editDocLoading, setEditDocLoading] = useState(false);
  const [newPat, setNewPat] = useState({ name: "", email: "", phone: "", gender: "Male", dob: "", address: "" });
  const [patLoading, setPatLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const apts = await dbService.getAppointments();
      const txns = await dbService.getTransactions();
      const docs = await dbService.getDoctors();
      const pats = await dbService.getPatients();
      const lg = await dbService.getSystemLogs();
      const cfg = await dbService.getSystemSettings();
      setDoctors(docs); setPatients(pats); setAppointments(apts); setLogs(lg);
      if (cfg && Object.keys(cfg).length > 0) setSettings(cfg);
      const earning = txns.reduce((s, t) => s + t.amount, 0);
      setStats({ patients: pats.length, doctors: docs.length, admins: 1, earning });
    } catch (e) { console.error(e); }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault(); setDocLoading(true);
    try {
      const docId = "doc_" + Date.now();
      await dbService.createUser({
        uid: docId,
        email: newDoc.name.toLowerCase().replace(/\s/g, "") + "@evercare.com",
        name: newDoc.name, role: "doctor", specialty: newDoc.specialty, phone: "+63 917 000 0000",
      });
      const doctorsData = JSON.parse(localStorage.getItem("evercare_doctors") || "[]");
      doctorsData.push({
        id: docId, name: newDoc.name, specialty: newDoc.specialty, rating: 5.0, experience: 5,
        fee: Number(newDoc.fee), avatar: newDoc.avatar, bio: newDoc.bio,
        availability: { days: ["Monday", "Wednesday", "Friday"], hours: ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM"] },
      });
      localStorage.setItem("evercare_doctors", JSON.stringify(doctorsData));
      showNotification("Doctor added successfully!", "success");
      setNewDoc({ name: "", specialty: "Cardiology", fee: 1000, bio: "", avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300" });
      loadData(); setActiveView("view-doctor");
    } catch (e) { showNotification("Error: " + e.message, "error"); } finally { setDocLoading(false); }
  };

  const handleEditDoctor = (e) => {
    e.preventDefault(); setEditDocLoading(true);
    try {
      const doctorsData = JSON.parse(localStorage.getItem("evercare_doctors") || "[]");
      const idx = doctorsData.findIndex((d) => d.id === editDoc.id);
      if (idx !== -1) {
        doctorsData[idx] = { ...doctorsData[idx], name: editDoc.name, specialty: editDoc.specialty, fee: Number(editDoc.fee), bio: editDoc.bio, avatar: editDoc.avatar };
        localStorage.setItem("evercare_doctors", JSON.stringify(doctorsData));
      }
      showNotification("Doctor updated successfully!", "success");
      setEditDoc(null); loadData(); setActiveView("view-doctor");
    } catch (e) { showNotification("Error: " + e.message, "error"); } finally { setEditDocLoading(false); }
  };

  const handleDeleteDoctor = (docId) => {
    if (!window.confirm("Delete this doctor? This cannot be undone.")) return;
    try {
      const doctorsData = JSON.parse(localStorage.getItem("evercare_doctors") || "[]");
      localStorage.setItem("evercare_doctors", JSON.stringify(doctorsData.filter((d) => d.id !== docId)));
      showNotification("Doctor removed.", "info"); loadData();
    } catch (e) { showNotification("Error: " + e.message, "error"); }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault(); setPatLoading(true);
    try {
      await dbService.createUser({ uid: "pat_" + Date.now(), email: newPat.email, password: "patient123", name: newPat.name, role: "patient", phone: newPat.phone, gender: newPat.gender, dob: newPat.dob, address: newPat.address, bloodType: "O+" });
      showNotification("Patient added successfully!", "success");
      setNewPat({ name: "", email: "", phone: "", gender: "Male", dob: "", address: "" });
      loadData(); setActiveView("view-patient");
    } catch (e) { showNotification("Error: " + e.message, "error"); } finally { setPatLoading(false); }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { showNotification("Passwords do not match.", "error"); return; }
    showNotification("Password updated successfully!", "success");
    setPwForm({ current: "", next: "", confirm: "" });
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await dbService.createUser({ uid: "adm_" + Date.now(), email: newAdmin.email, password: newAdmin.password, name: newAdmin.name, role: "admin", phone: "+63 919 000 0000" });
      showNotification("Admin account created!", "success");
      setNewAdmin({ name: "", email: "", password: "" });
    } catch (e) { showNotification("Error: " + e.message, "error"); }
  };

  const handleApproveAppointment = async (apt) => {
    try {
      await dbService.updateAppointmentStatus(apt.id, { status: "Confirmed" });
      await dbService.logAction(currentUser.email, "Appointment Approved", `Approved appointment ${apt.id} for ${apt.patientName} with ${apt.doctorName}`);
      const patient = patients.find((p) => p.uid === apt.patientId);
      if (patient?.email) notificationService.sendAppointmentApproved(patient.email, apt.patientName, apt.doctorName, apt.specialty, apt.date, apt.time);
      showNotification("Appointment confirmed. Patient notified via email.", "success"); loadData();
    } catch (e) { showNotification("Error approving appointment: " + e.message, "error"); }
  };

  const handleRejectAppointment = async (apt) => {
    if (!window.confirm(`Reject appointment for ${apt.patientName}?`)) return;
    try {
      await dbService.updateAppointmentStatus(apt.id, { status: "Cancelled" });
      await dbService.logAction(currentUser.email, "Appointment Rejected", `Rejected appointment ${apt.id} for ${apt.patientName}`);
      const patient = patients.find((p) => p.uid === apt.patientId);
      if (patient?.email) notificationService.sendAppointmentRejected(patient.email, apt.patientName, apt.doctorName, apt.date, apt.time, "");
      showNotification("Appointment rejected. Patient notified via email.", "info"); loadData();
    } catch (e) { showNotification("Error rejecting appointment: " + e.message, "error"); }
  };

  const handleSendReminder = async (apt) => {
    setRemindingId(apt.id);
    try {
      const patient = patients.find((p) => p.uid === apt.patientId);
      if (!patient?.email) { showNotification("Patient email not found.", "error"); return; }
      const sent = await notificationService.sendAppointmentReminder(patient.email, apt.patientName, apt.doctorName, apt.specialty, apt.date, apt.time);
      if (sent) {
        await dbService.logAction(currentUser.email, "Reminder Sent", `Reminder sent to ${apt.patientName} for appointment with ${apt.doctorName} on ${apt.date}`);
        showNotification(`Reminder sent to ${apt.patientName}.`, "success");
      } else { showNotification("Failed to send reminder.", "error"); }
    } catch (e) { showNotification("Error sending reminder: " + e.message, "error"); } finally { setRemindingId(null); }
  };

  // ── Service handlers ───────────────────────────────────────────
  const handleAddDepartment = (e) => {
    e.preventDefault();
    if (!newDepartment.name.trim()) return;
    setDepartments([...departments, { id: "dep_" + Date.now(), ...newDepartment }]);
    showNotification("Department added!", "success");
    setNewDepartment({ name: "", description: "" });
  };

  const handleDeleteDepartment = (id) => {
    if (!window.confirm("Delete this department?")) return;
    setDepartments(departments.filter((d) => d.id !== id));
    showNotification("Department removed.", "info");
  };

  const handleAddTreatment = (e) => {
    e.preventDefault();
    if (!newTreatment.name.trim()) return;
    setTreatmentTypes([...treatmentTypes, { id: "tr_" + Date.now(), ...newTreatment, cost: Number(newTreatment.cost) }]);
    showNotification("Treatment type added!", "success");
    setNewTreatment({ name: "", cost: "", status: "Active", note: "" });
  };

  const handleDeleteTreatment = (id) => {
    if (!window.confirm("Delete this treatment type?")) return;
    setTreatmentTypes(treatmentTypes.filter((t) => t.id !== id));
    showNotification("Treatment type removed.", "info");
  };

  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!newMedicine.name.trim()) return;
    setMedicines([...medicines, { id: "med_" + Date.now(), ...newMedicine, stock: Number(newMedicine.stock) }]);
    showNotification("Medicine added!", "success");
    setNewMedicine({ name: "", type: "Tablet", stock: "", status: "Available" });
  };

  const handleDeleteMedicine = (id) => {
    if (!window.confirm("Delete this medicine?")) return;
    setMedicines(medicines.filter((m) => m.id !== id));
    showNotification("Medicine removed.", "info");
  };

  const pendingApts = appointments.filter((a) => a.status === "Pending");
  const approvedApts = appointments.filter((a) => a.status === "Confirmed" || a.status === "Approved");

  const nav = (view) => { setActiveView(view); setSidebarOpen(false); };

  return (
    <div className="adm-layout">
      <header className="adm-topbar">
        <button className="adm-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="adm-topbar-center">
          <h1 className="adm-system-title">Hospital Appointment System</h1>
        </div>
        {onLogout && (
          <button className="adm-topbar-logout" onClick={onLogout} title="Sign Out">
            <LogOut size={15} />
          </button>
        )}
      </header>

      <div className="adm-body">
        <div className={`adm-sidebar-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`adm-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="adm-sidebar-label">MAIN NAVIGATION</div>

          <button className={`adm-nav-dashboard ${activeView === "dashboard" ? "active" : ""}`} onClick={() => nav("dashboard")}>
            <LayoutDashboard size={16} /><span>Dashboard</span>
          </button>

          <NavGroup icon={<UserCircle size={16} />} label="Profile" isOpen={openNavGroup === "profile"} onToggle={() => toggleNavGroup("profile")}>
            <NavItem label="Admin Profile" active={activeView === "admin-profile"} onClick={() => nav("admin-profile")} />
            <NavItem label="Change Password" active={activeView === "change-password"} onClick={() => nav("change-password")} />
            <NavItem label="Add Admin" active={activeView === "add-admin"} onClick={() => nav("add-admin")} />
            <NavItem label="View Admin" active={activeView === "view-admin"} onClick={() => nav("view-admin")} />
          </NavGroup>

          <NavGroup icon={<CalendarClock size={16} />} label="Appointment" isOpen={openNavGroup === "appointment"} onToggle={() => toggleNavGroup("appointment")}>
            <NavItem label="New Appointment" active={activeView === "new-appointment"} onClick={() => nav("new-appointment")} />
            <NavItem label="View Pending Appointment" active={activeView === "pending-appointment"} onClick={() => nav("pending-appointment")} />
            <NavItem label="View Approved Appointment" active={activeView === "approved-appointment"} onClick={() => nav("approved-appointment")} />
          </NavGroup>

          <NavGroup icon={<Stethoscope size={16} />} label="Doctors" isOpen={openNavGroup === "doctors"} onToggle={() => toggleNavGroup("doctors")}>
            <NavItem label="Add Doctor" active={activeView === "add-doctor"} onClick={() => nav("add-doctor")} />
            <NavItem label="View Doctor" active={activeView === "view-doctor"} onClick={() => nav("view-doctor")} />
            <NavItem label="Edit Doctor" active={activeView === "edit-doctor"} onClick={() => nav("edit-doctor")} />
          </NavGroup>
          </aside>
        <main className="adm-main">

          {/* ===== DASHBOARD ===== */}
          {activeView === "dashboard" && (
            <div className="adm-content-panel">
              <div className="adm-white-card">
                <div className="adm-panel-header">
                  <div>
                    <h2 className="adm-panel-title">Dashboard</h2>
                    <p className="adm-panel-sub">Welcome to Admin Panel</p>
                  </div>
                </div>
                <div className="adm-stats-row">
                  <StatCard label="Total Patient" value={stats.patients} icon={<Users size={36} />} iconColor="#e91e8c" />
                  <StatCard label="Total Doctor" value={stats.doctors} icon={<UserCog size={36} />} iconColor="#17a2b8" />
                  <StatCard label="Total Administrator" value={stats.admins} icon={<ShieldAlert size={36} />} iconColor="#3f51b5" />
                  <StatCard label="Hospital Earning" value={`$ ${stats.earning.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<DollarSign size={36} />} iconColor="#28a745" />
                </div>
              </div>
            </div>
          )}

          {/* ===== ADMIN PROFILE ===== */}
          {activeView === "admin-profile" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Admin Profile</h2></div>
              <div className="adm-form-card">
                <div className="adm-profile-avatar"><ShieldAlert size={48} color="#3f51b5" /></div>
                <table className="adm-info-table">
                  <tbody>
                    <tr><td className="adm-info-label">Name</td><td>{currentUser.name}</td></tr>
                    <tr><td className="adm-info-label">Email / Username</td><td>{currentUser.email}</td></tr>
                    <tr><td className="adm-info-label">Role</td><td>Administrator</td></tr>
                    <tr><td className="adm-info-label">Phone</td><td>{currentUser.phone || "—"}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== CHANGE PASSWORD ===== */}
          {activeView === "change-password" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Change Password</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 480 }}>
                <form onSubmit={handleChangePassword} className="adm-form">
                  <div className="adm-field"><label className="adm-label">Current Password</label><input type="password" className="adm-input" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required /></div>
                  <div className="adm-field"><label className="adm-label">New Password</label><input type="password" className="adm-input" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required /></div>
                  <div className="adm-field"><label className="adm-label">Confirm New Password</label><input type="password" className="adm-input" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required /></div>
                  <button type="submit" className="adm-btn-primary">Update Password</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== ADD ADMIN ===== */}
          {activeView === "add-admin" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Admin</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 480 }}>
                <form onSubmit={handleAddAdmin} className="adm-form">
                  <div className="adm-field"><label className="adm-label">Full Name</label><input type="text" className="adm-input" placeholder="Administrator Name" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required /></div>
                  <div className="adm-field"><label className="adm-label">Username / Email</label><input type="text" className="adm-input" placeholder="admin2" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} required /></div>
                  <div className="adm-field"><label className="adm-label">Password</label><input type="password" className="adm-input" placeholder="••••••••" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required /></div>
                  <button type="submit" className="adm-btn-primary">Create Admin Account</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW ADMIN ===== */}
          {activeView === "view-admin" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">View Admin</h2></div>
              <div className="adm-form-card">
                <table className="adm-table">
                  <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Role</th></tr></thead>
                  <tbody>
                    <tr><td>1</td><td>{currentUser.name}</td><td>{currentUser.email}</td><td><span className="adm-badge blue">Admin</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== NEW APPOINTMENT ===== */}
          {activeView === "new-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">New Appointment</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 560 }}>
                <p className="adm-hint-text">All appointments booked by patients appear here once submitted.</p>
                <div className="adm-quick-actions">
                  <button className="adm-btn-primary" onClick={() => setActiveView("pending-appointment")}>View Pending</button>
                  <button className="adm-btn-secondary" onClick={() => setActiveView("approved-appointment")}>View Approved</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== PENDING APPOINTMENTS ===== */}
          {activeView === "pending-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Pending Appointments</h2></div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  {pendingApts.length === 0 ? <div className="adm-empty">No pending appointments.</div> : (
                    <table className="adm-table">
                      <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {pendingApts.map((a, i) => (
                          <tr key={a.id}>
                            <td>{i + 1}</td><td>{a.patientName}</td><td>{a.doctorName}</td><td>{a.date}</td><td>{a.time}</td>
                            <td><span className="adm-badge orange">{a.status}</span></td>
                            <td>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button onClick={() => handleApproveAppointment(a)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "none", background: "#d1fae5", color: "#065f46", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                                  <CheckCircle size={13} /> Approve
                                </button>
                                <button onClick={() => handleRejectAppointment(a)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                                  <XCircle size={13} /> Reject
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
            </div>
          )}

          {/* ===== APPROVED APPOINTMENTS ===== */}
          {activeView === "approved-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Approved Appointments</h2></div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  {approvedApts.length === 0 ? <div className="adm-empty">No approved appointments.</div> : (
                    <table className="adm-table">
                      <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Notify</th></tr></thead>
                      <tbody>
                        {approvedApts.map((a, i) => (
                          <tr key={a.id}>
                            <td>{i + 1}</td><td>{a.patientName}</td><td>{a.doctorName}</td><td>{a.date}</td><td>{a.time}</td>
                            <td><span className="adm-badge green">{a.status}</span></td>
                            <td>
                              <button onClick={() => handleSendReminder(a)} disabled={remindingId === a.id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "none", background: remindingId === a.id ? "#e5e7eb" : "#dbeafe", color: remindingId === a.id ? "#9ca3af" : "#1e40af", cursor: remindingId === a.id ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600 }}>
                                <Bell size={13} />{remindingId === a.id ? "Sending…" : "Remind"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== ADD DOCTOR ===== */}
          {activeView === "add-doctor" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Doctor</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 560 }}>
                <form onSubmit={handleAddDoctor} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field"><label className="adm-label">Doctor Name</label><input type="text" className="adm-input" placeholder="Dr. John Doe" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Specialty</label><select className="adm-input" value={newDoc.specialty} onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })}>{specialties.map((s) => <option key={s}>{s}</option>)}</select></div>
                    <div className="adm-field"><label className="adm-label">Consultation Fee (₱)</label><input type="number" className="adm-input" value={newDoc.fee} onChange={(e) => setNewDoc({ ...newDoc, fee: e.target.value })} required /></div>
                  </div>
                  <div className="adm-field"><label className="adm-label">Bio / Experience</label><textarea className="adm-input adm-textarea" rows={3} placeholder="Brief clinical biography..." value={newDoc.bio} onChange={(e) => setNewDoc({ ...newDoc, bio: e.target.value })} required /></div>
                  <button type="submit" className="adm-btn-primary" disabled={docLoading}>{docLoading ? "Saving..." : "Add Doctor"}</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW DOCTOR ===== */}
          {activeView === "view-doctor" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Doctor</h2>
                <button className="adm-btn-primary" onClick={() => setActiveView("add-doctor")}>+ Add Doctor</button>
              </div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Photo</th><th>Name</th><th>Specialty</th><th>Fee</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>
                      {doctors.length === 0 ? <tr><td colSpan={6}><div className="adm-empty">No doctors found.</div></td></tr> : doctors.map((doc, i) => (
                        <tr key={doc.id}>
                          <td>{i + 1}</td>
                          <td><img src={doc.avatar} alt={doc.name} className="adm-table-avatar" /></td>
                          <td style={{ fontWeight: 600 }}>{doc.name}</td>
                          <td>{doc.specialty}</td>
                          <td>₱{doc.fee?.toLocaleString()}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button className="adm-btn-primary" style={{ padding: "5px 10px", fontSize: 12, background: "#0d6efd", display: "flex", alignItems: "center", gap: 4 }} onClick={() => { setEditDoc({ ...doc }); setActiveView("edit-doctor"); }}><Pencil size={13} /> Edit</button>
                              <button className="adm-btn-secondary" style={{ padding: "5px 10px", fontSize: 12, background: "#dc3545", display: "flex", alignItems: "center", gap: 4 }} onClick={() => handleDeleteDoctor(doc.id)}><Trash2 size={13} /> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== EDIT DOCTOR ===== */}
          {activeView === "edit-doctor" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">{editDoc ? `Editing: ${editDoc.name}` : "Select a Doctor to Edit"}</h2>
                <button className="adm-btn-secondary" onClick={() => setActiveView("view-doctor")} style={{ fontSize: 12, padding: "6px 14px" }}>← Back to List</button>
              </div>
              {editDoc ? (
                <div className="adm-form-card" style={{ maxWidth: 560 }}>
                  <form onSubmit={handleEditDoctor} className="adm-form">
                    <div className="adm-form-grid">
                      <div className="adm-field"><label className="adm-label">Doctor Name</label><input type="text" className="adm-input" value={editDoc.name} onChange={(e) => setEditDoc({ ...editDoc, name: e.target.value })} required /></div>
                      <div className="adm-field"><label className="adm-label">Specialty</label><select className="adm-input" value={editDoc.specialty} onChange={(e) => setEditDoc({ ...editDoc, specialty: e.target.value })}>{specialties.map((s) => <option key={s}>{s}</option>)}</select></div>
                      <div className="adm-field"><label className="adm-label">Consultation Fee (₱)</label><input type="number" className="adm-input" value={editDoc.fee} onChange={(e) => setEditDoc({ ...editDoc, fee: e.target.value })} required /></div>
                    </div>
                    <div className="adm-field"><label className="adm-label">Bio / Experience</label><textarea className="adm-input adm-textarea" rows={3} value={editDoc.bio || ""} onChange={(e) => setEditDoc({ ...editDoc, bio: e.target.value })} /></div>
                    <div className="adm-field"><label className="adm-label">Avatar URL</label><input type="text" className="adm-input" value={editDoc.avatar || ""} onChange={(e) => setEditDoc({ ...editDoc, avatar: e.target.value })} /></div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="adm-btn-primary" disabled={editDocLoading}>{editDocLoading ? "Saving..." : "Save Changes"}</button>
                      <button type="button" className="adm-btn-secondary" onClick={() => { setEditDoc(null); setActiveView("view-doctor"); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="adm-form-card">
                  <div className="adm-table-scroll">
                    <table className="adm-table">
                      <thead><tr><th>#</th><th>Photo</th><th>Name</th><th>Specialty</th><th>Actions</th></tr></thead>
                      <tbody>
                        {doctors.map((doc, i) => (
                          <tr key={doc.id}>
                            <td>{i + 1}</td><td><img src={doc.avatar} alt={doc.name} className="adm-table-avatar" /></td><td>{doc.name}</td><td>{doc.specialty}</td>
                            <td><button className="adm-btn-primary" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => setEditDoc({ ...doc })}>Select</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== ADD PATIENT ===== */}
          {activeView === "add-patient" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Patient</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 560 }}>
                <form onSubmit={handleAddPatient} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field"><label className="adm-label">Full Name</label><input type="text" className="adm-input" placeholder="Juan dela Cruz" value={newPat.name} onChange={(e) => setNewPat({ ...newPat, name: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Email</label><input type="email" className="adm-input" placeholder="patient@email.com" value={newPat.email} onChange={(e) => setNewPat({ ...newPat, email: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Phone</label><input type="tel" className="adm-input" placeholder="+63 9XX XXX XXXX" value={newPat.phone} onChange={(e) => setNewPat({ ...newPat, phone: e.target.value })} /></div>
                    <div className="adm-field"><label className="adm-label">Gender</label><select className="adm-input" value={newPat.gender} onChange={(e) => setNewPat({ ...newPat, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
                    <div className="adm-field"><label className="adm-label">Date of Birth</label><input type="date" className="adm-input" value={newPat.dob} onChange={(e) => setNewPat({ ...newPat, dob: e.target.value })} /></div>
                    <div className="adm-field"><label className="adm-label">Address</label><input type="text" className="adm-input" placeholder="Metro Manila" value={newPat.address} onChange={(e) => setNewPat({ ...newPat, address: e.target.value })} /></div>
                  </div>
                  <button type="submit" className="adm-btn-primary" disabled={patLoading}>{patLoading ? "Saving..." : "Add Patient"}</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW PATIENT ===== */}
          {activeView === "view-patient" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Patient Record</h2>
                <button className="adm-btn-primary" onClick={() => setActiveView("add-patient")}>+ Add Patient</button>
              </div>

          {/* ===== MANAGE SERVICES ===== */}
          {activeView === "view-services" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Manage Hospital Services</h2>
              </div>

              <div className="adm-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                {/* Departments */}
                <div className="adm-form-card">
                  <h3 className="adm-panel-sub" style={{ fontWeight: "bold", marginBottom: "10px" }}>Departments (Specialties)</h3>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Neurology"
                      id="new-dept"
                      onKeyPress={(e) => { if(e.key === "Enter") { const v = e.target.value; if(v) { setSettings(s => ({...s, departments: [...(s.departments||[]), v]})); e.target.value = ""; } } }}
                    />
                    <button
                      className="adm-btn-primary"
                      onClick={() => { const el = document.getElementById("new-dept"); if(el.value) { setSettings(s => ({...s, departments: [...(s.departments||[]), el.value]})); el.value = ""; } }}
                    >+</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(settings.departments || []).map((d, i) => (
                      <span key={i} style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "15px", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                        {d} <X size={12} style={{ cursor: "pointer" }} onClick={() => setSettings(s => ({...s, departments: s.departments.filter((_, idx) => idx !== i)}))} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Treatments */}
                <div className="adm-form-card">
                  <h3 className="adm-panel-sub" style={{ fontWeight: "bold", marginBottom: "10px" }}>Treatment Types</h3>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. X-Ray"
                      id="new-treat"
                      onKeyPress={(e) => { if(e.key === "Enter") { const v = e.target.value; if(v) { setSettings(s => ({...s, treatments: [...(s.treatments||[]), v]})); e.target.value = ""; } } }}
                    />
                    <button
                      className="adm-btn-primary"
                      onClick={() => { const el = document.getElementById("new-treat"); if(el.value) { setSettings(s => ({...s, treatments: [...(s.treatments||[]), el.value]})); el.value = ""; } }}
                    >+</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(settings.treatments || []).map((t, i) => (
                      <span key={i} style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "15px", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                        {t} <X size={12} style={{ cursor: "pointer" }} onClick={() => setSettings(s => ({...s, treatments: s.treatments.filter((_, idx) => idx !== i)}))} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medicines */}
                <div className="adm-form-card">
                  <h3 className="adm-panel-sub" style={{ fontWeight: "bold", marginBottom: "10px" }}>Pharmacy / Medicines</h3>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Paracetamol 500mg"
                      id="new-med"
                      onKeyPress={(e) => { if(e.key === "Enter") { const v = e.target.value; if(v) { setSettings(s => ({...s, medicines: [...(s.medicines||[]), v]})); e.target.value = ""; } } }}
                    />
                    <button
                      className="adm-btn-primary"
                      onClick={() => { const el = document.getElementById("new-med"); if(el.value) { setSettings(s => ({...s, medicines: [...(s.medicines||[]), el.value]})); el.value = ""; } }}
                    >+</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(settings.medicines || []).map((m, i) => (
                      <span key={i} style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "15px", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                        {m} <X size={12} style={{ cursor: "pointer" }} onClick={() => setSettings(s => ({...s, medicines: s.medicines.filter((_, idx) => idx !== i)}))} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <button
                  className="adm-btn-primary"
                  style={{ width: "100%", padding: "12px" }}
                  onClick={async () => {
                    try {
                      await dbService.updateSystemSettings(settings);
                      showNotification("Hospital services updated successfully!", "success");
                    } catch (e) {
                      showNotification("Update failed: " + e.message, "error");
                    }
                  }}
                >
                  Save All Changes
                </button>
              </div>
            </div>
          )}
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Gender</th><th>Phone</th><th>Blood Type</th></tr></thead>
                    <tbody>
                      {patients.map((p, i) => (
                        <tr key={p.uid || i}><td>{i + 1}</td><td>{p.name}</td><td>{p.email}</td><td>{p.gender || "—"}</td><td>{p.phone || "—"}</td><td>{p.bloodType || "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== ADD DEPARTMENT ===== */}
          {activeView === "add-department" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Department</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 480 }}>
                <form onSubmit={handleAddDepartment} className="adm-form">
                  <div className="adm-field"><label className="adm-label">Department Name</label><input type="text" className="adm-input" placeholder="e.g. Neurology" value={newDepartment.name} onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })} required /></div>
                  <div className="adm-field"><label className="adm-label">Description</label><textarea className="adm-input adm-textarea" rows={3} placeholder="Brief description of the department..." value={newDepartment.description} onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })} /></div>
                  <button type="submit" className="adm-btn-primary">Add Department</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW DEPARTMENT ===== */}
          {activeView === "view-department" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Department</h2>
                <button className="adm-btn-primary" onClick={() => setActiveView("add-department")}>+ Add Department</button>
              </div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Department Name</th><th>Description</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>
                      {departments.length === 0 ? <tr><td colSpan={4}><div className="adm-empty">No departments found.</div></td></tr> : departments.map((dep, i) => (
                        <tr key={dep.id}>
                          <td>{i + 1}</td><td style={{ fontWeight: 600 }}>{dep.name}</td><td>{dep.description || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button onClick={() => handleDeleteDepartment(dep.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== ADD TREATMENT TYPE ===== */}
          {activeView === "add-treatment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Treatment Type</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 520 }}>
                <form onSubmit={handleAddTreatment} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field"><label className="adm-label">Treatment Type</label><input type="text" className="adm-input" placeholder="e.g. X-Ray" value={newTreatment.name} onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Treatment Cost (₱)</label><input type="number" className="adm-input" placeholder="e.g. 1500" value={newTreatment.cost} onChange={(e) => setNewTreatment({ ...newTreatment, cost: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Status</label><select className="adm-input" value={newTreatment.status} onChange={(e) => setNewTreatment({ ...newTreatment, status: e.target.value })}><option>Active</option><option>Inactive</option></select></div>
                  </div>
                  <div className="adm-field"><label className="adm-label">Note</label><textarea className="adm-input adm-textarea" rows={3} placeholder="Additional notes about this treatment..." value={newTreatment.note} onChange={(e) => setNewTreatment({ ...newTreatment, note: e.target.value })} /></div>
                  <button type="submit" className="adm-btn-primary">Add Treatment Type</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW TREATMENT TYPES ===== */}
          {activeView === "view-treatment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Treatment Types</h2>
                <button className="adm-btn-primary" onClick={() => setActiveView("add-treatment")}>+ Add Treatment</button>
              </div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Treatment Type</th><th>Cost</th><th>Status</th><th>Note</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>
                      {treatmentTypes.length === 0 ? <tr><td colSpan={6}><div className="adm-empty">No treatment types found.</div></td></tr> : treatmentTypes.map((t, i) => (
                        <tr key={t.id}>
                          <td>{i + 1}</td><td style={{ fontWeight: 600 }}>{t.name}</td><td>₱{Number(t.cost).toLocaleString()}</td>
                          <td><span className={`adm-badge ${t.status === "Active" ? "green" : "orange"}`}>{t.status}</span></td>
                          <td>{t.note || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button onClick={() => handleDeleteTreatment(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== ADD MEDICINE ===== */}
          {activeView === "add-medicine" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header"><h2 className="adm-panel-title">Add Medicine</h2></div>
              <div className="adm-form-card" style={{ maxWidth: 520 }}>
                <form onSubmit={handleAddMedicine} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field"><label className="adm-label">Medicine Name</label><input type="text" className="adm-input" placeholder="e.g. Paracetamol" value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Type</label><select className="adm-input" value={newMedicine.type} onChange={(e) => setNewMedicine({ ...newMedicine, type: e.target.value })}><option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Ointment</option><option>Drops</option></select></div>
                    <div className="adm-field"><label className="adm-label">Stock Quantity</label><input type="number" className="adm-input" placeholder="e.g. 100" value={newMedicine.stock} onChange={(e) => setNewMedicine({ ...newMedicine, stock: e.target.value })} required /></div>
                    <div className="adm-field"><label className="adm-label">Status</label><select className="adm-input" value={newMedicine.status} onChange={(e) => setNewMedicine({ ...newMedicine, status: e.target.value })}><option>Available</option><option>Low Stock</option><option>Out of Stock</option></select></div>
                  </div>
                  <button type="submit" className="adm-btn-primary">Add Medicine</button>
                </form>
              </div>
            </div>
          )}

          {/* ===== VIEW MEDICINE ===== */}
          {activeView === "view-medicine" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Medicine</h2>
                <button className="adm-btn-primary" onClick={() => setActiveView("add-medicine")}>+ Add Medicine</button>
              </div>
              <div className="adm-form-card">
                <div className="adm-table-scroll">
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Medicine Name</th><th>Type</th><th>Stock</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>
                      {medicines.length === 0 ? <tr><td colSpan={6}><div className="adm-empty">No medicines found.</div></td></tr> : medicines.map((m, i) => (
                        <tr key={m.id}>
                          <td>{i + 1}</td><td style={{ fontWeight: 600 }}>{m.name}</td><td>{m.type}</td><td>{m.stock}</td>
                          <td><span className={`adm-badge ${m.status === "Available" ? "green" : m.status === "Low Stock" ? "orange" : "red"}`}>{m.status}</span></td>
                          <td style={{ textAlign: "right" }}>
                            <button onClick={() => handleDeleteMedicine(m.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
