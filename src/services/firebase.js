// EverCare - API Service Layer
// Replaces direct Firebase calls with Express backend API calls

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
};

export const dbService = {
  isMockMode: async () => {
    const data = await apiFetch("/");
    return data.mode === "mock";
  },

  // ------------------------------------------
  // USER ACTIONS
  // ------------------------------------------
  getUser: (email) =>
    apiFetch(`/api/users?email=${encodeURIComponent(email)}`),

  createUser: (userData) =>
    apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  updateUser: (uid, data) =>
    apiFetch(`/api/users/${uid}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getPatients: () => apiFetch("/api/users/patients"),

  // ------------------------------------------
  // DOCTOR ACTIONS
  // ------------------------------------------
  getDoctors: () => apiFetch("/api/doctors"),

  updateDoctorAvailability: (doctorId, availability) =>
    apiFetch(`/api/doctors/${doctorId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ availability }),
    }),

  // ------------------------------------------
  // APPOINTMENT ACTIONS
  // ------------------------------------------
  getAppointments: () => apiFetch("/api/appointments"),

  bookAppointment: (appointmentData) =>
    apiFetch("/api/appointments", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    }),

  updateAppointmentStatus: (appointmentId, updates) =>
    apiFetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  // ------------------------------------------
  // SLOT CONFLICT CHECK
  // ------------------------------------------
  checkSlotAvailability: async (doctorId, date, time, excludeAptId = null) => {
    const allApts = await apiFetch("/api/appointments");
    const conflict = allApts.find(
      (a) =>
        a.doctorId === doctorId &&
        a.date === date &&
        a.time === time &&
        a.status !== "Cancelled" &&
        a.id !== excludeAptId
    );
    return !conflict; // true = slot is available
  },

  // ------------------------------------------
  // TRANSACTION ACTIONS
  // ------------------------------------------
  getTransactions: () => apiFetch("/api/transactions"),

  addTransaction: (txnData) =>
    apiFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(txnData),
    }),

  // ------------------------------------------
  // LOGS & SYSTEM ACTIONS
  // ------------------------------------------
  getSystemLogs: () => apiFetch("/api/system/logs"),

  logAction: (email, action, details) =>
    apiFetch("/api/system/logs", {
      method: "POST",
      body: JSON.stringify({ email, action, details }),
    }),

  getSystemSettings: () => apiFetch("/api/system/settings"),

  updateSystemSettings: (settings) =>
    apiFetch("/api/system/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  resetMockDatabase: () =>
    apiFetch("/api/system/reset", { method: "POST" }),

  getDatabaseBackup: async () => {
    const data = await apiFetch("/api/system/backup");
    return JSON.stringify(data, null, 2);
  },

  // ------------------------------------------
  // FILE UPLOAD (still simulated)
  // ------------------------------------------
  uploadFile: async (filePath, fileObject) => {
    console.log(`Upload: ${fileObject.name} to ${filePath}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://evercare-medical.web.app/mock-storage/${filePath}/${fileObject.name}`);
      }, 1000);
    });
  },
};
