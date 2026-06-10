import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  UserCircle,
  CalendarPlus,
  CalendarCheck,
  FileText,
  Pill,
  Stethoscope,
  Activity,
  ChevronDown,
  ChevronUp,
  DollarSign,
  LogOut,
  Search,
  Heart,
  AlertCircle,
  User,
} from "lucide-react";
import { dbService } from "../services/firebase";
import { notificationService } from "../services/notifications";

/* ── collapsible nav group (controlled) ─────────────────────────── */
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

/* ── stat card (same as admin) ──────────────────────────────── */
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

/* ── main component ─────────────────────────────────────────── */
export default function PatientPortal({
  currentUser,
  refreshKey,
  onInitiatePayment,
  showNotification,
  onLogout,
}) {
  const [activeView, setActiveView] = useState("dashboard");
  const [dashTab, setDashTab] = useState("registration"); // 'registration' | 'appointment'
  const [openNavGroup, setOpenNavGroup] = useState(null);
  const toggleNavGroup = (key) =>
    setOpenNavGroup((prev) => (prev === key ? null : key));

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  /* Booking form */
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [complaint, setComplaint] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  /* Profile form */
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    gender: currentUser?.gender || "Male",
    dob: currentUser?.dob || "",
    bloodType: currentUser?.bloodType || "O+",
    address: currentUser?.address || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser, refreshKey]);

  const loadData = async () => {
    try {
      const allApts = await dbService.getAppointments();
      const patientApts = allApts.filter(
        (a) => a.patientId === currentUser.uid,
      );
      setAppointments(patientApts);
      const allDocs = await dbService.getDoctors();
      setDoctors(allDocs);
      setFilteredDoctors(allDocs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let result = doctors;
    if (searchTerm)
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.specialty.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    if (selectedSpecialty !== "All")
      result = result.filter((d) => d.specialty === selectedSpecialty);
    setFilteredDoctors(result);
  }, [searchTerm, selectedSpecialty, doctors]);

  /* Book appointment */
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingDate || !bookingTime || !complaint) {
      showNotification("Please fill out all booking fields.", "error");
      return;
    }
    setBookingLoading(true);
    try {
      const aptData = {
        patientId: currentUser.uid,
        patientName: currentUser.name,
        doctorId: selectedDoctor.uid || selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        department: selectedDoctor.specialty, // pre-populate department
        date: bookingDate,
        time: bookingTime,
        fee: selectedDoctor.fee,
        complaint,
      };

      // Check for slot conflicts before booking
      const isAvailable = await dbService.checkSlotAvailability(
        aptData.doctorId,
        bookingDate,
        bookingTime
      );
      if (!isAvailable) {
        showNotification(
          `This time slot (${bookingTime} on ${bookingDate}) is already booked for ${selectedDoctor.name}. Please choose another slot.`,
          "error"
        );
        setBookingLoading(false);
        return;
      }
      const newApt = await dbService.bookAppointment(aptData);
      await dbService.logAction(
        currentUser.email,
        "Appointment Booking Requested",
        `Booked with ${selectedDoctor.name} for ${bookingDate} at ${bookingTime}`,
      );
      notificationService.sendBookingConfirmation(
        currentUser.email,
        currentUser.name,
        selectedDoctor.name,
        selectedDoctor.specialty,
        bookingDate,
        bookingTime,
        selectedDoctor.fee,
      );
      showNotification(
        "Appointment requested! Proceed to checkout.",
        "success",
      );
      loadData();
      onInitiatePayment(newApt);
      setSelectedDoctor(null);
      setBookingDate("");
      setBookingTime("");
      setComplaint("");
      setActiveView("view-appointments");
    } catch (err) {
      showNotification("Booking failed: " + err.message, "error");
    } finally {
      setBookingLoading(false);
    }
  };

  /* Cancel appointment */
  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await dbService.updateAppointmentStatus(aptId, { status: "Cancelled" });
      await dbService.logAction(
        currentUser.email,
        "Appointment Cancelled",
        `Patient cancelled appointment: ${aptId}`,
      );
      showNotification("Appointment cancelled.", "info");
      loadData();
    } catch (e) {
      showNotification("Failed to cancel: " + e.message, "error");
    }
  };

  /* Update profile */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await dbService.updateUser(currentUser.uid, profileData);
      showNotification("Profile updated successfully!", "success");
    } catch (e) {
      showNotification("Update failed: " + e.message, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const specialties = [
    "All",
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "General Medicine",
    "Orthopedics",
  ];

  const pendingApts = appointments.filter((a) => a.status === "Pending");
  const completedApts = appointments.filter((a) => a.status === "Completed");
  // Appointments that may have prescription/treatment records (Confirmed or Completed)
  const activeApts = appointments.filter(
    (a) => a.status === "Completed" || a.status === "Confirmed"
  );

  const getStatusBadge = (status) => {
    const map = {
      Confirmed: "adm-badge green",
      Pending: "adm-badge orange",
      Cancelled: "adm-badge red",
      Completed: "adm-badge blue",
    };
    return map[status] || "adm-badge";
  };

  return (
    <div className="adm-layout">
      {/* ── TOP BAR ── */}
      <header className="adm-topbar">
        <h1 className="adm-system-title">Hospital Appointment System</h1>
        {onLogout && (
          <button
            className="adm-topbar-logout"
            onClick={onLogout}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        )}
      </header>

      <div className="adm-body">
        {/* ── SIDEBAR ── */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-label">MAIN NAVIGATION</div>

          {/* Dashboard */}
          <button
            className={`adm-nav-dashboard ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          {/* Profile */}
          <NavGroup
            icon={<UserCircle size={16} />}
            label="Profile"
            isOpen={openNavGroup === "profile"}
            onToggle={() => toggleNavGroup("profile")}
          >
            <NavItem
              label="My Profile"
              active={activeView === "my-profile"}
              onClick={() => setActiveView("my-profile")}
            />
          </NavGroup>

          {/* Appointment */}
          <NavGroup
            icon={<CalendarPlus size={16} />}
            label="Appointment"
            isOpen={openNavGroup === "appointment"}
            onToggle={() => toggleNavGroup("appointment")}
          >
            <NavItem
              label="Add Appointment"
              active={activeView === "add-appointment"}
              onClick={() => setActiveView("add-appointment")}
            />
            <NavItem
              label="View Appointments"
              active={activeView === "view-appointments"}
              onClick={() => setActiveView("view-appointments")}
            />
          </NavGroup>

          {/* Prescription */}
          <NavGroup
            icon={<Pill size={16} />}
            label="Prescription"
            isOpen={openNavGroup === "prescription"}
            onToggle={() => toggleNavGroup("prescription")}
          >
            <NavItem
              label="View Prescription"
              active={activeView === "view-prescription"}
              onClick={() => setActiveView("view-prescription")}
            />
          </NavGroup>

          {/* Treatment */}
          <NavGroup
            icon={<Activity size={16} />}
            label="Treatment"
            isOpen={openNavGroup === "treatment"}
            onToggle={() => toggleNavGroup("treatment")}
          >
            <NavItem
              label="View Treatment"
              active={activeView === "view-treatment"}
              onClick={() => setActiveView("view-treatment")}
            />
          </NavGroup>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="adm-main">
          {/* ===== DASHBOARD ===== */}
          {activeView === "dashboard" && (
            <div className="adm-content-panel">
              <div className="adm-white-card">
                {/* Welcome banner */}
                <div
                  className="adm-welcome-banner"
                  style={{
                    background: "#17a2b8",
                    borderRadius: 6,
                    padding: "20px 28px",
                    marginBottom: 24,
                  }}
                >
                  <h2
                    style={{
                      color: "#fff",
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    Welcome , {currentUser.name}!
                  </h2>
                </div>

                {/* Dashboard tabs */}
                <div
                  className="adm-dash-tabs"
                  style={{
                    borderBottom: "2px solid #e5e7eb",
                    marginBottom: 20,
                  }}
                >
                  <button
                    className={`adm-dash-tab-btn ${dashTab === "registration" ? "active" : ""}`}
                    onClick={() => setDashTab("registration")}
                    style={{
                      padding: "8px 20px",
                      fontWeight: dashTab === "registration" ? 700 : 400,
                      borderBottom:
                        dashTab === "registration"
                          ? "3px solid #17a2b8"
                          : "3px solid transparent",
                      background: "none",
                      border: "none",
                      borderBottom:
                        dashTab === "registration"
                          ? "3px solid #17a2b8"
                          : "3px solid transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      color: dashTab === "registration" ? "#17a2b8" : "#555",
                      marginBottom: -2,
                    }}
                  >
                    Registration History
                  </button>
                  <button
                    className={`adm-dash-tab-btn ${dashTab === "appointment" ? "active" : ""}`}
                    onClick={() => setDashTab("appointment")}
                    style={{
                      padding: "8px 20px",
                      fontWeight: dashTab === "appointment" ? 700 : 400,
                      background: "none",
                      border: "none",
                      borderBottom:
                        dashTab === "appointment"
                          ? "3px solid #17a2b8"
                          : "3px solid transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      color: dashTab === "appointment" ? "#17a2b8" : "#555",
                      marginBottom: -2,
                    }}
                  >
                    Appointment
                  </button>
                </div>

                {/* Registration History tab */}
                {dashTab === "registration" && (
                  <div style={{ padding: "8px 4px" }}>
                    <div
                      className="adm-panel-title"
                      style={{ marginBottom: 12 }}
                    >
                      Registration History
                    </div>
                    <p style={{ fontSize: 22, color: "#222", fontWeight: 400 }}>
                      You are with us from{" "}
                      {currentUser.createdAt
                        ? new Date(currentUser.createdAt).toLocaleString()
                        : "2021-06-24 15:26:32"}
                    </p>
                  </div>
                )}

                {/* Appointment tab */}
                {dashTab === "appointment" && (
                  <div>
                    {/* Quick stats */}
                    <div className="adm-stats-row" style={{ marginBottom: 20 }}>
                      <StatCard
                        label="Total Appointments"
                        value={appointments.length}
                        icon={<CalendarPlus size={36} />}
                        iconColor="#17a2b8"
                      />
                      <StatCard
                        label="Pending"
                        value={pendingApts.length}
                        icon={<CalendarCheck size={36} />}
                        iconColor="#e67e22"
                      />
                      <StatCard
                        label="Completed"
                        value={completedApts.length}
                        icon={<Activity size={36} />}
                        iconColor="#28a745"
                      />
                    </div>

                    {/* Appointment table */}
                    {appointments.length === 0 ? (
                      <div className="adm-empty">
                        No appointments found.{" "}
                        <button
                          className="adm-btn-primary"
                          style={{ marginLeft: 12 }}
                          onClick={() => setActiveView("add-appointment")}
                        >
                          Book Now
                        </button>
                      </div>
                    ) : (
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Doctor</th>
                            <th>Department</th>
                            <th>Date &amp; Time</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((a, i) => (
                            <tr key={a.id}>
                              <td>{i + 1}</td>
                              <td>{a.doctorName}</td>
                              <td>{a.specialty}</td>
                              <td>
                                {a.date}
                                <br />
                                <span style={{ fontSize: 11, color: "#888" }}>
                                  {a.time}
                                </span>
                              </td>
                              <td>{a.complaint || "—"}</td>
                              <td>
                                <span className={getStatusBadge(a.status)}>
                                  {a.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {a.paymentStatus === "Unpaid" &&
                                    a.status === "Pending" && (
                                      <button
                                        className="adm-btn-primary"
                                        style={{
                                          padding: "4px 10px",
                                          fontSize: 12,
                                        }}
                                        onClick={() => onInitiatePayment(a)}
                                      >
                                        Pay
                                      </button>
                                    )}
                                  {a.status === "Pending" && (
                                    <button
                                      className="adm-btn-secondary"
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        color: "#e74c3c",
                                      }}
                                      onClick={() =>
                                        handleCancelAppointment(a.id)
                                      }
                                    >
                                      Cancel
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
                )}
              </div>
            </div>
          )}

          {/* ===== MY PROFILE ===== */}
          {activeView === "my-profile" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">My Profile</h2>
              </div>
              <div className="adm-form-card" style={{ maxWidth: 560 }}>
                <form onSubmit={handleUpdateProfile} className="adm-form">
                  <div className="adm-form-grid">
                    <div className="adm-field">
                      <label className="adm-label">Full Name</label>
                      <input
                        type="text"
                        className="adm-input"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Phone</label>
                      <input
                        type="text"
                        className="adm-input"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Date of Birth</label>
                      <input
                        type="date"
                        className="adm-input"
                        value={profileData.dob}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            dob: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Gender</label>
                      <select
                        className="adm-input"
                        value={profileData.gender}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
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
                        value={profileData.bloodType}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
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
                    <div className="adm-field">
                      <label className="adm-label">Address</label>
                      <input
                        type="text"
                        className="adm-input"
                        value={profileData.address}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="adm-btn-primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Update Profile"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===== ADD APPOINTMENT ===== */}
          {activeView === "add-appointment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">Add Appointment</h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 340px",
                  gap: 20,
                }}
              >
                {/* Doctor selection */}
                <div className="adm-form-card">
                  <div
                    style={{
                      marginBottom: 16,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ position: "relative", flex: 1 }}>
                      <Search
                        size={15}
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#aaa",
                        }}
                      />
                      <input
                        type="text"
                        className="adm-input"
                        placeholder="Search doctor or specialty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: 32 }}
                      />
                    </div>
                    <select
                      className="adm-input"
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      style={{ width: "auto" }}
                    >
                      {specialties.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      maxHeight: 460,
                      overflowY: "auto",
                    }}
                  >
                    {filteredDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setBookingTime("");
                        }}
                        style={{
                          display: "flex",
                          gap: 14,
                          padding: "12px 14px",
                          borderRadius: 8,
                          border:
                            selectedDoctor?.id === doc.id
                              ? "2px solid #17a2b8"
                              : "1px solid #e5e7eb",
                          background:
                            selectedDoctor?.id === doc.id
                              ? "#e8f8fb"
                              : "#fafafa",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={doc.avatar}
                          alt={doc.name}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            objectFit: "cover",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#17a2b8" }}>
                            {doc.specialty}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#666",
                              marginTop: 2,
                            }}
                          >
                            {doc.bio}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#888",
                              marginTop: 4,
                            }}
                          >
                            ⭐ {doc.rating} · {doc.experience} yrs exp · ₱
                            {doc.fee?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredDoctors.length === 0 && (
                      <div className="adm-empty">
                        No doctors match your search.
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking details */}
                <div className="adm-form-card">
                  <h3 className="adm-panel-title" style={{ marginBottom: 16 }}>
                    Appointment Details
                  </h3>
                  {selectedDoctor ? (
                    <form onSubmit={handleBookAppointment} className="adm-form">
                      <div
                        style={{
                          padding: "10px 12px",
                          background: "#f0fafe",
                          border: "1px solid #b2e3ed",
                          borderRadius: 6,
                          marginBottom: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <img
                          src={selectedDoctor.avatar}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {selectedDoctor.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {selectedDoctor.specialty}
                          </div>
                        </div>
                      </div>

                      <div className="adm-field">
                        <label className="adm-label">Select Date</label>
                        <input
                          type="date"
                          className="adm-input"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                        />
                      </div>

                      <div className="adm-field">
                        <label className="adm-label">Time Slot</label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 6,
                          }}
                        >
                          {selectedDoctor.availability.hours.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setBookingTime(t)}
                              style={{
                                padding: "7px 4px",
                                borderRadius: 6,
                                border:
                                  bookingTime === t
                                    ? "2px solid #17a2b8"
                                    : "1px solid #ddd",
                                background:
                                  bookingTime === t ? "#17a2b8" : "#fff",
                                color: bookingTime === t ? "#fff" : "#333",
                                fontSize: 12,
                                fontWeight: bookingTime === t ? 700 : 400,
                                cursor: "pointer",
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="adm-field">
                        <label className="adm-label">Chief Complaint</label>
                        <textarea
                          className="adm-input adm-textarea"
                          rows={3}
                          required
                          placeholder="Describe your symptoms..."
                          value={complaint}
                          onChange={(e) => setComplaint(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="adm-btn-primary"
                        disabled={bookingLoading}
                      >
                        {bookingLoading
                          ? "Booking..."
                          : `Book & Pay ₱${selectedDoctor.fee?.toLocaleString()}`}
                      </button>
                    </form>
                  ) : (
                    <div className="adm-empty" style={{ padding: "40px 0" }}>
                      <User
                        size={40}
                        style={{ opacity: 0.15, margin: "0 auto 10px" }}
                      />
                      <p>Select a doctor on the left to continue.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== VIEW APPOINTMENTS ===== */}
          {activeView === "view-appointments" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Appointment Records</h2>
                <button
                  className="adm-btn-primary"
                  onClick={() => setActiveView("add-appointment")}
                >
                  + Add Appointment
                </button>
              </div>
              <div className="adm-form-card">
                {appointments.length === 0 ? (
                  <div className="adm-empty">No appointment records found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient Detail</th>
                        <th>Date &amp; Time</th>
                        <th>Department</th>
                        <th>Doctor</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td>{a.patientName}</td>
                          <td>
                            {a.date}
                            <br />
                            <span style={{ fontSize: 11, color: "#888" }}>
                              {a.time}
                            </span>
                          </td>
                          <td>{a.specialty}</td>
                          <td>{a.doctorName}</td>
                          <td>{a.complaint || "—"}</td>
                          <td>
                            <span className={getStatusBadge(a.status)}>
                              {a.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {a.paymentStatus === "Unpaid" &&
                                a.status === "Pending" && (
                                  <button
                                    className="adm-btn-primary"
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: 12,
                                    }}
                                    onClick={() => onInitiatePayment(a)}
                                  >
                                    Pay
                                  </button>
                                )}
                              {a.status === "Pending" && (
                                <button
                                  className="adm-btn-secondary"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    color: "#e74c3c",
                                  }}
                                  onClick={() => handleCancelAppointment(a.id)}
                                >
                                  Cancel
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

          {/* ===== VIEW PRESCRIPTION ===== */}
          {activeView === "view-prescription" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Prescription</h2>
              </div>
              <div className="adm-form-card">
                {activeApts.filter((a) => a.prescription || (a.prescriptions && a.prescriptions.length > 0)).length === 0 ? (
                  <div className="adm-empty">
                    No prescriptions available yet.
                  </div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Medicine / Prescription (Rx)</th>
                        <th>Dosage / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeApts
                        .filter((a) => a.prescription || (a.prescriptions && a.prescriptions.length > 0))
                        .flatMap((a, i) => {
                          // If full prescriptions[] array exists, render each entry
                          if (a.prescriptions && a.prescriptions.length > 0) {
                            return a.prescriptions.map((rx, j) => (
                              <tr key={`${a.id}-rx-${j}`}>
                                <td>{i + j + 1}</td>
                                <td>{rx.doctor || a.doctorName}</td>
                                <td>{rx.date || a.date}</td>
                                <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                                  {rx.medicine} {rx.unit && `— ${rx.unit}`}
                                </td>
                                <td style={{ fontStyle: "italic", fontSize: 12 }}>
                                  {rx.dosage || "—"}{rx.totalCost ? ` · ₱${rx.totalCost}` : ""}
                                </td>
                              </tr>
                            ));
                          }
                          // Fallback: simple string prescription
                          return [
                            <tr key={a.id}>
                              <td>{i + 1}</td>
                              <td>{a.doctorName}</td>
                              <td>{a.date}</td>
                              <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                                {a.prescription}
                              </td>
                              <td style={{ fontStyle: "italic", fontSize: 12 }}>
                                {a.notes || "—"}
                              </td>
                            </tr>
                          ];
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== VIEW TREATMENT ===== */}
          {activeView === "view-treatment" && (
            <div className="adm-content-panel">
              <div className="adm-panel-header">
                <h2 className="adm-panel-title">View Treatment History</h2>
              </div>
              <div className="adm-form-card">
                {activeApts.filter((a) => a.treatmentRecords && a.treatmentRecords.length > 0).length === 0 ? (
                  <div className="adm-empty">
                    No treatment records available.
                  </div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Doctor</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th>Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeApts
                        .filter((a) => a.treatmentRecords && a.treatmentRecords.length > 0)
                        .flatMap((a, i) =>
                          a.treatmentRecords.map((t, j) => (
                            <tr key={`${a.id}-tr-${j}`}>
                              <td>{i + j + 1}</td>
                              <td>{t.doctor || a.doctorName}</td>
                              <td>{t.type}</td>
                              <td style={{ fontStyle: "italic", fontSize: 12 }}>{t.description || "—"}</td>
                              <td>{t.date || a.date}</td>
                              <td>₱{t.cost || "0"}</td>
                              <td>
                                <span className="adm-badge green">{a.status}</span>
                              </td>
                            </tr>
                          ))
                        )}
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