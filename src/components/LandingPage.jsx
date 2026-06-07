import React, { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Heart,
  Activity,
  ArrowRight,
  Check,
  Star,
  Building2,
  UserCheck,
  User,
  Navigation,
  LogIn,
  Lock,
  CalendarDays,
  Clock,
  Stethoscope,
  Contact,
  Hash,
  Menu,
  X,
} from "lucide-react";
import { dbService } from "../services/firebase";
import Captcha from "./Captcha";

const slides = [
  {
    badgeText: "Best Diagnostic Centre",
    title: "Care And Cure",
    subtitle:
      "Improved diagnostic performance and heightened satisfaction of patients and physicians delight.",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600",
    themeColor: "#10b981",
    buttonText: "CONTACT NOW",
  },
  {
    badgeText: "Emergency Services 24/7",
    title: "Compassionate Care",
    subtitle:
      "Our urgent care services are operational round the clock with expert staff ready to support you.",
    image:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600",
    themeColor: "#ef4444",
    buttonText: "BOOK NOW",
  },
  {
    badgeText: "Expert Board-Certified Specialists",
    title: "Professional Staff",
    subtitle:
      "Schedule private virtual telehealth sessions or clinic visits with leading practitioners.",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
    themeColor: "#0284c7",
    buttonText: "MEET SPECIALISTS",
  },
];

export default function LandingPage({
  authTab,
  setAuthTab,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  registerRole,
  setRegisterRole,
  setCaptchaVerified,
  handleLogin,
  handleRegister,
  showNotification,
  landingTab,
  setLandingTab,
}) {
  const [doctors, setDoctors] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aptSubmitted, setAptSubmitted] = useState(false);
  const [aptLoading, setAptLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginRole, setLoginRole] = useState("admin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [guestAptForm, setGuestAptForm] = useState({
    patientName: "",
    address: "",
    city: "",
    contactNumber: "",
    loginId: "",
    password: "",
    gender: "",
    dob: "",
    date: "",
    time: "",
    department: "",
    doctorId: "",
    complaint: "",
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const docList = await dbService.getDoctors();
        setDoctors(docList);
        if (docList.length > 0) {
          setGuestAptForm((prev) => ({ ...prev, doctorId: docList[0].id }));
        }
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (landingTab !== "home") return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [landingTab]);

  const handleNextSlide = () =>
    setCurrentSlide((currentSlide + 1) % slides.length);
  const handlePrevSlide = () =>
    setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    showNotification(
      "Thank you for reaching out! Our staff will contact you shortly.",
      "success",
    );
    setContactForm({ name: "", email: "", subject: "", message: "" });
  };

  /* ── GUEST APPOINTMENT: create account + book appointment ── */
  const handleGuestAptSubmit = async (e) => {
    e.preventDefault();
    setAptLoading(true);

    try {
      // 1. Check if account already exists
      const existingUser = await dbService.getUser(guestAptForm.loginId);

      let patientUser;

      if (existingUser) {
        // Account exists — verify password
        if (existingUser.password !== guestAptForm.password) {
          showNotification(
            "An account with this email already exists but the password is incorrect.",
            "error",
          );
          setAptLoading(false);
          return;
        }
        patientUser = existingUser;
      } else {
        // 2. Create new patient account with all form data
        const uid = "pat_" + Date.now();
        patientUser = await dbService.createUser({
          uid,
          email: guestAptForm.loginId,
          password: guestAptForm.password,
          name: guestAptForm.patientName,
          role: "patient",
          phone: guestAptForm.contactNumber,
          gender: guestAptForm.gender,
          dob: guestAptForm.dob,
          address: `${guestAptForm.address}, ${guestAptForm.city}`,
          bloodType: "O+",
        });
      }

      // 3. Find selected doctor details
      const selectedDoc = doctors.find((d) => d.id === guestAptForm.doctorId);
      if (!selectedDoc) {
        showNotification("Selected doctor not found.", "error");
        setAptLoading(false);
        return;
      }

      // 4. Book the appointment linked to this patient
      await dbService.bookAppointment({
        patientId: patientUser.uid,
        patientName: patientUser.name,
        doctorId: selectedDoc.id,
        doctorName: selectedDoc.name,
        specialty: guestAptForm.department || selectedDoc.specialty,
        date: guestAptForm.date,
        time: guestAptForm.time,
        fee: selectedDoc.fee,
        complaint: guestAptForm.complaint,
      });

      // 5. Log the action
      await dbService.logAction(
        guestAptForm.loginId,
        "Guest Appointment Submitted",
        `Appointment booked with ${selectedDoc.name} for ${guestAptForm.date} at ${guestAptForm.time}`,
      );

      setAptSubmitted(true);
    } catch (err) {
      showNotification("Failed to submit appointment: " + err.message, "error");
    } finally {
      setAptLoading(false);
    }
  };

  /* After success, pre-fill login form and redirect to login tab */
  const handleGoToLogin = () => {
    setAptSubmitted(false);
    setEmail(guestAptForm.loginId);
    setPassword(guestAptForm.password);
    setLandingTab("login");
    setAuthTab("login");
  };

  return (
    <div className="landing-page-container">
      {/* 1. TOP HEADER */}
      <header className="landing-top-header flex justify-between items-center flex-wrap gap-4">
        <div
          className="landing-logo-container cursor-pointer"
          onClick={() => setLandingTab("home")}
        >
          <div className="landing-logo-circle">
            <Building2 size={24} className="text-white" />
          </div>
          <div className="landing-logo-text">
            <span className="main">HOSPITAL</span>
            <span className="sub">APPOINTMENT SYSTEM</span>
          </div>
        </div>

        <div className="landing-contacts-group flex-wrap">
          <div className="landing-contact-item">
            <div className="landing-contact-icon">
              <Phone size={16} />
            </div>
            <div className="landing-contact-text">
              <div className="line1">095 6631 4216</div>
            </div>
          </div>
          <div className="landing-contact-item">
            <div className="landing-contact-icon">
              <Mail size={16} />
            </div>
            <div className="landing-contact-text">
              <div className="line1">druehtml@gmail.com</div>
              <div className="line2">druehtml@gmail.com</div>
            </div>
          </div>
          <div className="landing-contact-item">
            <div className="landing-contact-icon">
              <MapPin size={16} />
            </div>
            <div className="landing-contact-text">
              <div className="line1">000 000 000</div>
              <div className="line2">San Manuel, Isabela</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. NAVIGATION BAR */}
      <nav className="landing-nav-bar">
        {/* Hamburger: visible only on mobile via CSS */}
        <button
          className="landing-nav-hamburger"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <ul className={`landing-nav-links ${mobileNavOpen ? "mobile-open" : ""}`}>
          <li
            className={`landing-nav-link ${landingTab === "home" ? "active" : ""}`}
            onClick={() => { setLandingTab("home"); setMobileNavOpen(false); }}
          >
            Home
          </li>
          <li
            className={`landing-nav-link ${landingTab === "about" ? "active" : ""}`}
            onClick={() => { setLandingTab("about"); setMobileNavOpen(false); }}
          >
            About
          </li>
          <li
            className={`landing-nav-link ${landingTab === "appointment" ? "active" : ""}`}
            onClick={() => { setLandingTab("appointment"); setMobileNavOpen(false); }}
          >
            Appointment
          </li>
          <li
            className={`landing-nav-link ${landingTab === "contact" ? "active" : ""}`}
            onClick={() => { setLandingTab("contact"); setMobileNavOpen(false); }}
          >
            Contact
          </li>
          <li
            className={`landing-nav-link ${landingTab === "login" ? "active" : ""}`}
            onClick={() => {
              setLandingTab("login");
              setAuthTab("login");
              setMobileNavOpen(false);
            }}
          >
            Log In
          </li>
        </ul>
      </nav>

      {/* 3. MAIN PUBLIC SECTIONS */}
      <main className="flex-grow">
        {/* ================= HOME ================= */}
        {landingTab === "home" && (
          <div className="animate-fade-in">
            <section className="landing-hero">
              <div className="landing-hero-slider">
                {slides.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`landing-hero-slide ${idx === currentSlide ? "active" : ""}`}
                  >
                    <div className="landing-hero-content">
                      <div className="landing-hero-badge-container">
                        <div
                          className="landing-hero-badge-bar"
                          style={{ backgroundColor: slide.themeColor }}
                        />
                        <span className="landing-hero-badge">
                          {slide.badgeText}
                        </span>
                      </div>
                      <h2 className="landing-hero-title">{slide.title}</h2>
                      <p className="landing-hero-subtitle">{slide.subtitle}</p>
                      <button
                        onClick={() => {
                          if (idx === 0) setLandingTab("contact");
                          else if (idx === 1) setLandingTab("appointment");
                          else setLandingTab("about");
                        }}
                        className="landing-hero-btn"
                        style={{ backgroundColor: slide.themeColor }}
                      >
                        {slide.buttonText} <ArrowRight size={14} />
                      </button>
                    </div>
                    <div
                      className="landing-hero-image-overlay"
                      style={{ backgroundImage: `url(${slide.image})` }}
                    />
                  </div>
                ))}
                <button
                  className="landing-hero-arrow prev"
                  onClick={handlePrevSlide}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="landing-hero-arrow next"
                  onClick={handleNextSlide}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>

            <section className="landing-section">
              <h3 className="landing-section-title">
                Our Specialized Departments
              </h3>
              <p className="landing-section-subtitle">
                Providing standard healthcare facilities managed by certified
                medical specialists.
              </p>
              <div className="landing-services-grid">
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrapper">
                    <Heart size={24} />
                  </div>
                  <h4 className="landing-service-title">Cardiology Care</h4>
                  <p className="landing-service-desc">
                    Comprehensive heart care including preventative checks,
                    vascular evaluations, and personalized cardiac therapy
                    plans.
                  </p>
                </div>
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrapper">
                    <UserCheck size={24} />
                  </div>
                  <h4 className="landing-service-title">Pediatric Treatment</h4>
                  <p className="landing-service-desc">
                    Compassionate medical support for children and adolescents,
                    focusing on development, growth monitoring, and
                    immunizations.
                  </p>
                </div>
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrapper">
                    <Activity size={24} />
                  </div>
                  <h4 className="landing-service-title">General Medicine</h4>
                  <p className="landing-service-desc">
                    Broad scope health diagnostic checks, chronic disease
                    treatment management, and regular wellness counseling.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= ABOUT ================= */}
        {landingTab === "about" && (
          <div className="landing-section animate-fade-in">
            <h3 className="landing-section-title">About Our Hospital</h3>
            <p className="landing-section-subtitle">
              Learn more about our team, medical facilities, and commitment to
              healthcare.
            </p>

            <div className="landing-about-container mb-8">
              <div className="landing-about-content">
                <span className="landing-about-tag">Empowering Health</span>
                <h4 className="landing-about-heading">
                  Providing World Class Diagnostics and Treatment Planning
                </h4>
                <p className="landing-about-text">
                  At EverCare, we prioritize patient outcomes. With modern labs
                  and telemetry equipment, our doctors deliver swift and precise
                  health diagnostics.
                </p>
                <div className="landing-about-features">
                  {[
                    "Online Appointment Booking",
                    "Board-Certified Specialists",
                    "Secure Digital Health Records",
                    "24/7 Support Desk Channels",
                  ].map((f) => (
                    <div key={f} className="landing-about-feature-item">
                      <Check size={16} className="landing-about-feature-icon" />{" "}
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600"
                  alt="Hospital Room"
                  className="landing-about-img"
                />
              </div>
            </div>

            <div className="pt-6">
              <h3 className="landing-section-title">Our Medical Specialists</h3>
              <p className="landing-section-subtitle">
                Consult with our certified healthcare specialists across
                clinical practices.
              </p>
              <div className="landing-doctors-grid">
                {doctors.map((doc) => (
                  <div key={doc.id} className="landing-doctor-card">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="landing-doctor-img"
                    />
                    <div className="landing-doctor-info">
                      <span className="landing-doctor-spec">
                        {doc.specialty}
                      </span>
                      <h4 className="landing-doctor-name">{doc.name}</h4>
                      <p className="landing-doctor-bio">{doc.bio}</p>
                      <div className="landing-doctor-meta">
                        <span className="landing-doctor-fee">
                          ₱{doc.fee} / consult
                        </span>
                        <div className="landing-doctor-rating">
                          <Star
                            size={14}
                            className="fill-yellow-500 text-yellow-500"
                          />{" "}
                          {doc.rating}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= APPOINTMENT ================= */}
        {landingTab === "appointment" && (
          <div className="landing-section animate-fade-in">
            {/* SUCCESS SCREEN */}
            {aptSubmitted ? (
              <div className="apt-success-screen">
                <h2 className="apt-success-title">
                  Appointment taken successfully..
                </h2>
                <p className="apt-success-sub">
                  Your patient account has been created and your appointment is
                  pending confirmation. Use your Login ID and password to access
                  your Patient Dashboard.
                </p>
                <button
                  className="apt-success-login-link"
                  onClick={handleGoToLogin}
                >
                  Click here to Login.
                </button>
              </div>
            ) : (
              <>
                <h2 className="apt-form-heading">Make an Appointment</h2>

                <form
                  onSubmit={handleGuestAptSubmit}
                  className="apt-form-wrapper"
                >
                  {/* Row 1: Patient's Name | Address */}
                  <div className="apt-form-grid">
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <User size={16} />
                      </span>
                      <input
                        type="text"
                        className="apt-field-input"
                        placeholder="Patient's Name"
                        value={guestAptForm.patientName}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            patientName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Navigation size={16} />
                      </span>
                      <input
                        type="text"
                        className="apt-field-input"
                        placeholder="Address"
                        value={guestAptForm.address}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            address: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2: City | Contact Number */}
                  <div className="apt-form-grid">
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <MapPin size={16} />
                      </span>
                      <input
                        type="text"
                        className="apt-field-input"
                        placeholder="City"
                        value={guestAptForm.city}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            city: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Phone size={16} />
                      </span>
                      <input
                        type="tel"
                        className="apt-field-input"
                        placeholder="Contact Number"
                        value={guestAptForm.contactNumber}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            contactNumber: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Row 3: Login ID | Password */}
                  <div className="apt-form-grid">
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <LogIn size={16} />
                      </span>
                      <input
                        type="email"
                        className="apt-field-input"
                        placeholder="Login ID (Email) — used to log in later"
                        value={guestAptForm.loginId}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            loginId: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        type="password"
                        className="apt-field-input"
                        placeholder="Password — used to log in later"
                        value={guestAptForm.password}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            password: e.target.value,
                          })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Row 4: Select Gender | Date of Birth */}
                  <div className="apt-form-grid">
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Contact size={16} />
                      </span>
                      <select
                        className="apt-field-input apt-field-select"
                        value={guestAptForm.gender}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            gender: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="" disabled>
                          Select Gender
                        </option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="apt-date-labeled">
                      <span className="apt-date-label">Date of Birth</span>
                      <div className="apt-field-group">
                        <span className="apt-field-icon">
                          <CalendarDays size={16} />
                        </span>
                        <input
                          type="date"
                          className="apt-field-input"
                          value={guestAptForm.dob}
                          onChange={(e) =>
                            setGuestAptForm({
                              ...guestAptForm,
                              dob: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Appointment Date | Appointment Time */}
                  <div className="apt-form-grid">
                    <div className="apt-date-labeled">
                      <span className="apt-date-label">Appointment Date</span>
                      <div className="apt-field-group">
                        <span className="apt-field-icon">
                          <CalendarDays size={16} />
                        </span>
                        <input
                          type="date"
                          className="apt-field-input"
                          min={new Date().toISOString().split("T")[0]}
                          value={guestAptForm.date}
                          onChange={(e) =>
                            setGuestAptForm({
                              ...guestAptForm,
                              date: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Clock size={16} />
                      </span>
                      <select
                        className="apt-field-input apt-field-select"
                        value={guestAptForm.time}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            time: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="" disabled>
                          Appointment Time
                        </option>
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="03:00 PM">03:00 PM</option>
                        <option value="04:00 PM">04:00 PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Select Department | Select Doctor */}
                  <div className="apt-form-grid">
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Building2 size={16} />
                      </span>
                      <select
                        className="apt-field-input apt-field-select"
                        value={guestAptForm.department}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            department: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="" disabled>
                          Select Department
                        </option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="General Medicine">
                          General Medicine
                        </option>
                        <option value="Orthopedics">Orthopedics</option>
                      </select>
                    </div>
                    <div className="apt-field-group">
                      <span className="apt-field-icon">
                        <Stethoscope size={16} />
                      </span>
                      <select
                        className="apt-field-input apt-field-select"
                        value={guestAptForm.doctorId}
                        onChange={(e) =>
                          setGuestAptForm({
                            ...guestAptForm,
                            doctorId: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="" disabled>
                          Select Doctor
                        </option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Full-width: Appointment Reason */}
                  <div className="apt-field-group apt-field-full">
                    <textarea
                      className="apt-field-input apt-field-textarea"
                      placeholder="Appointment reason / chief complaint"
                      rows={4}
                      value={guestAptForm.complaint}
                      onChange={(e) =>
                        setGuestAptForm({
                          ...guestAptForm,
                          complaint: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Info note */}
                  <div
                    style={{
                      background: "#f0fafe",
                      border: "1px solid #b2e3ed",
                      borderRadius: 6,
                      padding: "10px 14px",
                      fontSize: 12,
                      color: "#555",
                      marginBottom: 4,
                    }}
                  >
                    <strong>Note:</strong> Your Login ID (email) and password
                    will be used to create your Patient account. After clicking{" "}
                    <em>Make Appointment</em>, you can log in to view your
                    appointment status and records.
                  </div>

                  {/* Submit Button */}
                  <div className="apt-submit-row">
                    <button
                      type="submit"
                      className="apt-submit-btn"
                      disabled={aptLoading}
                    >
                      {aptLoading ? "Submitting..." : "Make Appointment"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ================= CONTACT ================= */}
        {landingTab === "contact" && (
          <div className="landing-section animate-fade-in">
            <h3 className="landing-section-title">Get In Touch</h3>
            <p className="landing-section-subtitle">
              Have a question about clinical billing or medical records? Send us
              a direct message.
            </p>

            <div className="landing-contact-grid">
              <div className="landing-contact-info-list">
                <div className="landing-info-card">
                  <div className="landing-info-icon-wrapper">
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="landing-info-title">Calling Center</h4>
                    <div className="landing-info-val">
                      095 6631 4216
                    </div>
                  </div>
                </div>
                <div className="landing-info-card">
                  <div className="landing-info-icon-wrapper">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="landing-info-title">Email Inboxes</h4>
                    <div className="landing-info-val">
                      druehtml@gmail.com
                      <br />
                      druehtml@gmail.com
                    </div>
                  </div>
                </div>
                <div className="landing-info-card">
                  <div className="landing-info-icon-wrapper">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h4 className="landing-info-title">Clinic Address</h4>
                    <div className="landing-info-val">
                      095 6631 4216,
                      <br />
                      San Manuel, Isabela
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleContactSubmit}
                className="landing-form-container"
                style={{ margin: "0" }}
              >
                <div className="landing-input-group">
                  <label className="landing-input-label">Your Full Name</label>
                  <input
                    type="text"
                    className="landing-input"
                    placeholder="John Doe"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="landing-input-group">
                  <label className="landing-input-label">Email Address</label>
                  <input
                    type="email"
                    className="landing-input"
                    placeholder="john@example.com"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="landing-input-group">
                  <label className="landing-input-label">Subject</label>
                  <input
                    type="text"
                    className="landing-input"
                    placeholder="Query regarding teleconsultation"
                    value={contactForm.subject}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        subject: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="landing-input-group">
                  <label className="landing-input-label">Message Content</label>
                  <textarea
                    className="landing-input"
                    rows="4"
                    placeholder="Type your message details here..."
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        message: e.target.value,
                      })
                    }
                    style={{ resize: "none" }}
                    required
                  />
                </div>
                <button type="submit" className="landing-form-btn">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= LOG IN / REGISTER ================= */}
        {landingTab === "login" && (
          <div className="plain-login-page animate-fade-in">
            <div className="plain-login-card">
              <div className="plain-login-header">
                <p className="plain-login-system">HOSPITAL APPOINTMENT SYSTEM</p>
                <h2 className="plain-login-title">LOGIN</h2>
                <p className="plain-login-greeting">
                  Hello,{" "}
                  {loginRole === "admin"
                    ? "Admin!"
                    : loginRole === "doctor"
                      ? "Doctor!"
                      : loginRole === "staff"
                        ? "Staff!"
                        : "Patient!"}
                </p>
              </div>

              {authTab === "login" ? (
                <form onSubmit={handleLogin} className="plain-login-form">
                  <div className="plain-field-group">
                    <span className="plain-field-icon">
                      <UserCheck size={15} />
                    </span>
                    <select
                      className="plain-field-input plain-field-select"
                      value={loginRole}
                      onChange={(e) => {
                        setLoginRole(e.target.value);
                        setEmail("");
                        setCaptchaVerified(false);
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="staff">Staff</option>
                      <option value="patient">Patient</option>
                    </select>
                  </div>

                  <div className="plain-field-group">
                    <span className="plain-field-icon">
                      <User size={15} />
                    </span>
                    <input
                      type={loginRole === "patient" ? "email" : "text"}
                      required
                      placeholder={
                        loginRole === "patient" ? "Email Address" : "Username"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="plain-field-input"
                    />
                  </div>

                  <div className="plain-field-group">
                    <span className="plain-field-icon">
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="plain-field-input"
                    />
                  </div>

                  <label className="plain-remember-row">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="plain-checkbox"
                    />
                    <span className="plain-remember-text">Remember Me</span>
                  </label>

                  {loginRole === "patient" && (
                    <Captcha onVerify={setCaptchaVerified} />
                  )}

                  <button type="submit" className="plain-login-btn">
                    LOGIN
                  </button>

                  <button
                    type="button"
                    className="plain-forgot-link"
                    onClick={() =>
                      showNotification(
                        "Please contact the administrator to reset your password.",
                        "info",
                      )
                    }
                  >
                    Forgot Password?
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="plain-login-form">
                  <div className="plain-field-group">
                    <span className="plain-field-icon">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="plain-field-input"
                    />
                  </div>
                  <div className="plain-field-group">
                    <span className="plain-field-icon">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="plain-field-input"
                    />
                  </div>
                  <Captcha onVerify={setCaptchaVerified} />
                  <button type="submit" className="plain-login-btn">
                    REGISTER
                  </button>
                </form>
              )}

              <div className="plain-toggle-row">
                <button
                  className={`plain-toggle-btn ${authTab === "login" ? "active" : ""}`}
                  onClick={() => {
                    setAuthTab("login");
                    setCaptchaVerified(false);
                  }}
                >
                  Sign In
                </button>
                <span className="plain-toggle-divider">|</span>
                <button
                  className={`plain-toggle-btn ${authTab === "register" ? "active" : ""}`}
                  onClick={() => {
                    setAuthTab("register");
                    setCaptchaVerified(false);
                  }}
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">EverCare Medical Clinic</div>
        <p>
          Your Health is Our Top Priority. Providing Compassionate, Secure
          Clinical Services.
        </p>
        <div className="landing-footer-copyright">
          © {new Date().getFullYear()} EverCare Medical System. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
