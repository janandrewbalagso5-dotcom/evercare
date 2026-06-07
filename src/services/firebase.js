import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Web App's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if valid Firebase configuration is provided
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.projectId;

let app;
let firestore;
let storage;
let isMock = true;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firestore = getFirestore(app);
    storage = getStorage(app);
    isMock = false;
    console.log("EverCare: Firebase services initialized successfully.");
  } catch (error) {
    console.error("EverCare: Firebase initialization failed, falling back to mock localStorage db.", error);
    isMock = true;
  }
} else {
  console.log("EverCare: Missing Firebase configurations. Operating in Mock LocalStorage Mode.");
  isMock = true;
}

// ==========================================
// MOCK DATABASE & SEED DATA (LOCAL STORAGE)
// ==========================================

const DEFAULT_DOCTORS = [
  {
    id: "doc_vance",
    name: "Dr. Elizabeth Vance",
    specialty: "Cardiology",
    rating: 4.9,
    experience: 14,
    fee: 1500,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
    bio: "Dr. Vance is a board-certified Cardiologist with over 14 years of experience specializing in cardiovascular health, preventive cardiology, and non-invasive diagnostics.",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      hours: ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"]
    }
  },
  {
    id: "doc_sterling",
    name: "Dr. Marcus Sterling",
    specialty: "Pediatrics",
    rating: 4.8,
    experience: 10,
    fee: 1200,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    bio: "Dr. Sterling is dedicated to providing compassionate healthcare for infants, children, and adolescents, specializing in pediatric growth development and immunizations.",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday"],
      hours: ["10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"]
    }
  },
  {
    id: "doc_jenkins",
    name: "Dr. Sarah Jenkins",
    specialty: "Dermatology",
    rating: 4.7,
    experience: 8,
    fee: 1300,
    avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300",
    bio: "Dr. Jenkins specializes in medical, surgical, and cosmetic dermatology, helping patients manage acne, eczema, skin oncology, and aging skin concerns.",
    availability: {
      days: ["Monday", "Thursday"],
      hours: ["01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
    }
  },
  {
    id: "doc_cho",
    name: "Dr. David Cho",
    specialty: "General Medicine",
    rating: 4.6,
    experience: 12,
    fee: 1000,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300",
    bio: "Dr. Cho provides comprehensive healthcare for families, specializing in chronic disease management, general diagnostics, and overall health maintenance.",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      hours: ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"]
    }
  },
  {
    id: "doc_gallagher",
    name: "Dr. Fiona Gallagher",
    specialty: "Orthopedics",
    rating: 4.9,
    experience: 16,
    fee: 1800,
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
    bio: "Dr. Gallagher specializes in orthopedic surgery, joint replacements, sports medicine, and treating complex musculoskeletal injuries and disorders.",
    availability: {
      days: ["Wednesday", "Friday"],
      hours: ["02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"]
    }
  }
];

const DEFAULT_USERS = [
  {
    uid: "pat_sample",
    email: "patient@evercare.com",
    password: "patient123",
    name: "Andrew Miller",
    role: "patient",
    phone: "+63 917 123 4567",
    gender: "Male",
    dob: "1992-08-15",
    bloodType: "O+",
    address: "123 Healthcare Blvd, Manila",
    twoFactorEnabled: true,
    twoFactorSecret: "123456"
  },
  {
    uid: "doc_vance",
    email: "doctor",
    password: "doctor123",
    name: "Dr. Elizabeth Vance",
    role: "doctor",
    phone: "+63 917 987 6543",
    specialty: "Cardiology",
    twoFactorEnabled: false
  },
  {
    uid: "staff_sample",
    email: "staff",
    password: "staff123",
    name: "Sarah Conner",
    role: "staff",
    phone: "+63 918 222 3333",
    twoFactorEnabled: false
  },
  {
    uid: "admin_sample",
    email: "admin",
    password: "admin123",
    name: "Super Administrator",
    role: "admin",
    phone: "+63 919 777 8888",
    twoFactorEnabled: false
  }
];

const DEFAULT_APPOINTMENTS = [
  {
    id: "apt_1",
    patientId: "pat_sample",
    patientName: "Andrew Miller",
    doctorId: "doc_vance",
    doctorName: "Dr. Elizabeth Vance",
    specialty: "Cardiology",
    date: "2026-06-08",
    time: "10:00 AM",
    status: "Confirmed",
    paymentStatus: "Paid",
    fee: 1500,
    complaint: "Routine cardiac checkup, experiencing mild chest tightness during intensive exercise.",
    notes: "Patient advised to monitor heart rate. Prescribed mild beta-blocker as preventative measure.",
    prescription: "Metoprolol 25mg - Once daily in the morning (30 days)",
    updatedAt: "2026-06-04T10:00:00Z"
  },
  {
    id: "apt_2",
    patientId: "pat_sample",
    patientName: "Andrew Miller",
    doctorId: "doc_sterling",
    doctorName: "Dr. Marcus Sterling",
    specialty: "Pediatrics",
    date: "2026-06-10",
    time: "02:00 PM",
    status: "Pending",
    paymentStatus: "Unpaid",
    fee: 1200,
    complaint: "Consultation regarding vaccine schedule for toddler.",
    notes: "",
    prescription: "",
    updatedAt: "2026-06-04T14:30:00Z"
  }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: "txn_1",
    appointmentId: "apt_1",
    patientId: "pat_sample",
    patientName: "Andrew Miller",
    amount: 1500,
    paymentMethod: "PayMongo - Card",
    status: "Successful",
    referenceId: "pm_link_ref_987654321",
    timestamp: "2026-06-04T10:05:00Z"
  }
];

const DEFAULT_LOGS = [
  {
    id: "log_1",
    timestamp: "2026-06-04T10:00:00Z",
    userEmail: "janandrewbalagso5@gmail.com",
    action: "System Initialization",
    details: "EverCare Medical System initialized successfully."
  },
  {
    id: "log_2",
    timestamp: "2026-06-04T10:05:00Z",
    userEmail: "patient@evercare.com",
    action: "Payment Completed",
    details: "Consultation fee of ₱1500 paid via PayMongo for appointment apt_1."
  }
];

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  twoFactorRequired: false,
  allowedDomains: "*",
  backupInterval: "Daily"
};

// Initialize localStorage DB if empty or reset requested
const initMockDB = (force = false) => {
  if (!localStorage.getItem("evercare_doctors") || force) {
    localStorage.setItem("evercare_doctors", JSON.stringify(DEFAULT_DOCTORS));
  }
  if (!localStorage.getItem("evercare_users") || force) {
    localStorage.setItem("evercare_users", JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem("evercare_appointments") || force) {
    localStorage.setItem("evercare_appointments", JSON.stringify(DEFAULT_APPOINTMENTS));
  }
  if (!localStorage.getItem("evercare_transactions") || force) {
    localStorage.setItem("evercare_transactions", JSON.stringify(DEFAULT_TRANSACTIONS));
  }
  if (!localStorage.getItem("evercare_logs") || force) {
    localStorage.setItem("evercare_logs", JSON.stringify(DEFAULT_LOGS));
  }
  if (!localStorage.getItem("evercare_settings") || force) {
    localStorage.setItem("evercare_settings", JSON.stringify(DEFAULT_SETTINGS));
  }
};

initMockDB();

// Migration: reset users to new credentials on first load with new schema
try {
  const localUsers = JSON.parse(localStorage.getItem("evercare_users") || "[]");
  const needsMigration = localUsers.some(u =>
    u.email === "janandrewbalagso5@gmail.com" ||
    u.email === "vance@evercare.com" ||
    u.email === "staff@evercare.com" ||
    !u.password
  );
  if (needsMigration) {
    localStorage.setItem("evercare_users", JSON.stringify(DEFAULT_USERS));
  }
} catch (e) {
  console.warn("Could not migrate user credentials", e);
}

// Helper to write audit log
const writeMockLog = (email, action, details) => {
  const logs = JSON.parse(localStorage.getItem("evercare_logs") || "[]");
  logs.unshift({
    id: "log_" + Date.now(),
    timestamp: new Date().toISOString(),
    userEmail: email,
    action,
    details
  });
  localStorage.setItem("evercare_logs", JSON.stringify(logs.slice(0, 100))); // Keep last 100 logs
};

// ==========================================
// UNIFIED DATABASE SERVICE
// ==========================================

export const dbService = {
  isMockMode: () => isMock,

  // Reset Mock Database (Disaster Recovery Simulation)
  resetMockDatabase: () => {
    if (!isMock) return false;
    initMockDB(true);
    writeMockLog("system@evercare.com", "Database Reset", "System database restored from clean cloud backup.");
    return true;
  },

  // Export Backups (JSON string representing entire DB state)
  getDatabaseBackup: () => {
    if (isMock) {
      return JSON.stringify({
        doctors: JSON.parse(localStorage.getItem("evercare_doctors")),
        users: JSON.parse(localStorage.getItem("evercare_users")),
        appointments: JSON.parse(localStorage.getItem("evercare_appointments")),
        transactions: JSON.parse(localStorage.getItem("evercare_transactions")),
        logs: JSON.parse(localStorage.getItem("evercare_logs")),
        settings: JSON.parse(localStorage.getItem("evercare_settings")),
        timestamp: new Date().toISOString()
      }, null, 2);
    }
    return JSON.stringify({ message: "Firebase backups should be accessed via Firebase Console." });
  },

  // ------------------------------------------
  // USER ACTIONS
  // ------------------------------------------
  getUser: async (email) => {
    if (isMock) {
      const users = JSON.parse(localStorage.getItem("evercare_users") || "[]");
      return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
    
    const q = query(collection(firestore, "users"), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { uid: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  },

  createUser: async (userData) => {
    if (isMock) {
      const users = JSON.parse(localStorage.getItem("evercare_users") || "[]");
      if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("Email already exists");
      }
      const newUser = {
        uid: userData.uid || "usr_" + Date.now(),
        twoFactorEnabled: false,
        twoFactorSecret: Math.floor(100000 + Math.random() * 900000).toString(), // Auto-generate 2FA secret
        ...userData
      };
      users.push(newUser);
      localStorage.setItem("evercare_users", JSON.stringify(users));
      writeMockLog(userData.email, "User Registration", `New ${userData.role} registered: ${userData.name}`);
      return newUser;
    }

    const userDocRef = doc(firestore, "users", userData.uid);
    const data = {
      twoFactorEnabled: false,
      twoFactorSecret: Math.floor(100000 + Math.random() * 900000).toString(),
      createdAt: Timestamp.now(),
      ...userData
    };
    await setDoc(userDocRef, data);
    return data;
  },

  updateUser: async (uid, data) => {
    if (isMock) {
      const users = JSON.parse(localStorage.getItem("evercare_users") || "[]");
      const index = users.findIndex(u => u.uid === uid);
      if (index === -1) throw new Error("User not found");
      users[index] = { ...users[index], ...data };
      localStorage.setItem("evercare_users", JSON.stringify(users));
      writeMockLog(users[index].email, "Profile Updated", "User information updated.");
      return users[index];
    }

    const userDocRef = doc(firestore, "users", uid);
    await updateDoc(userDocRef, data);
    return data;
  },

  getPatients: async () => {
    if (isMock) {
      const users = JSON.parse(localStorage.getItem("evercare_users") || "[]");
      return users.filter(u => u.role === "patient");
    }
    const q = query(collection(firestore, "users"), where("role", "==", "patient"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  },

  // ------------------------------------------
  // DOCTOR ACTIONS
  // ------------------------------------------
  getDoctors: async () => {
    if (isMock) {
      return JSON.parse(localStorage.getItem("evercare_doctors") || "[]");
    }
    const querySnapshot = await getDocs(collection(firestore, "doctors"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  updateDoctorAvailability: async (doctorId, availability) => {
    if (isMock) {
      const doctors = JSON.parse(localStorage.getItem("evercare_doctors") || "[]");
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index === -1) throw new Error("Doctor not found");
      doctors[index].availability = availability;
      localStorage.setItem("evercare_doctors", JSON.stringify(doctors));
      writeMockLog(doctorId, "Schedule Update", "Doctor updated operational availability.");
      return doctors[index];
    }

    const docRef = doc(firestore, "doctors", doctorId);
    await updateDoc(docRef, { availability });
    return availability;
  },

  // ------------------------------------------
  // APPOINTMENT ACTIONS
  // ------------------------------------------
  getAppointments: async () => {
    if (isMock) {
      return JSON.parse(localStorage.getItem("evercare_appointments") || "[]");
    }
    const q = query(collection(firestore, "appointments"), orderBy("date", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  bookAppointment: async (appointmentData) => {
    const newApt = {
      id: "apt_" + Date.now(),
      status: "Pending",
      paymentStatus: "Unpaid",
      prescription: "",
      notes: "",
      updatedAt: new Date().toISOString(),
      ...appointmentData
    };

    if (isMock) {
      const appointments = JSON.parse(localStorage.getItem("evercare_appointments") || "[]");
      appointments.unshift(newApt);
      localStorage.setItem("evercare_appointments", JSON.stringify(appointments));
      writeMockLog(appointmentData.patientName, "Appointment Booked", `Booked with ${appointmentData.doctorName} for ${appointmentData.date}`);
      return newApt;
    }

    await setDoc(doc(firestore, "appointments", newApt.id), {
      ...newApt,
      createdAt: Timestamp.now()
    });
    return newApt;
  },

  updateAppointmentStatus: async (appointmentId, updates) => {
    if (isMock) {
      const appointments = JSON.parse(localStorage.getItem("evercare_appointments") || "[]");
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index === -1) throw new Error("Appointment not found");
      appointments[index] = { 
        ...appointments[index], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem("evercare_appointments", JSON.stringify(appointments));
      writeMockLog("system@evercare.com", "Appointment Modified", `Apt ${appointmentId} updated to: ${updates.status || appointments[index].status}`);
      return appointments[index];
    }

    const docRef = doc(firestore, "appointments", appointmentId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    return updates;
  },

  // ------------------------------------------
  // TRANSACTION ACTIONS
  // ------------------------------------------
  getTransactions: async () => {
    if (isMock) {
      return JSON.parse(localStorage.getItem("evercare_transactions") || "[]");
    }
    const q = query(collection(firestore, "transactions"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  addTransaction: async (txnData) => {
    const newTxn = {
      id: txnData.id || "txn_" + Date.now(),
      timestamp: new Date().toISOString(),
      ...txnData
    };

    if (isMock) {
      const txns = JSON.parse(localStorage.getItem("evercare_transactions") || "[]");
      txns.unshift(newTxn);
      localStorage.setItem("evercare_transactions", JSON.stringify(txns));
      writeMockLog(txnData.patientName, "Payment Recorded", `Paid ₱${txnData.amount} via ${txnData.paymentMethod}`);
      return newTxn;
    }

    await setDoc(doc(firestore, "transactions", newTxn.id), {
      ...newTxn,
      timestamp: Timestamp.now()
    });
    return newTxn;
  },

  // ------------------------------------------
  // LOGS & SYSTEM ACTIONS
  // ------------------------------------------
  getSystemLogs: async () => {
    if (isMock) {
      return JSON.parse(localStorage.getItem("evercare_logs") || "[]");
    }
    const q = query(collection(firestore, "logs"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  logAction: async (email, action, details) => {
    if (isMock) {
      writeMockLog(email, action, details);
      return;
    }

    try {
      await addDoc(collection(firestore, "logs"), {
        timestamp: Timestamp.now(),
        userEmail: email,
        action,
        details
      });
    } catch (e) {
      console.warn("Could not log action to firebase", e);
    }
  },

  getSystemSettings: async () => {
    if (isMock) {
      return JSON.parse(localStorage.getItem("evercare_settings") || "{}");
    }
    const docRef = doc(firestore, "settings", "global");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return DEFAULT_SETTINGS;
    return docSnap.data();
  },

  updateSystemSettings: async (settings) => {
    if (isMock) {
      localStorage.setItem("evercare_settings", JSON.stringify(settings));
      writeMockLog("janandrewbalagso5@gmail.com", "Settings Changed", "System-wide settings updated.");
      return settings;
    }
    const docRef = doc(firestore, "settings", "global");
    await setDoc(docRef, settings);
    return settings;
  },

  // ------------------------------------------
  // FILE UPLOAD (SIMULATED / FIREBASE STORAGE)
  // ------------------------------------------
  uploadFile: async (filePath, fileObject) => {
    if (isMock) {
      // Return a simulated URL
      console.log(`Mock Upload: Uploading ${fileObject.name} to ${filePath}`);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`https://evercare-medical.web.app/mock-storage/${filePath}/${fileObject.name}`);
        }, 1000);
      });
    }

    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, fileObject);
    return await getDownloadURL(storageRef);
  }
};
