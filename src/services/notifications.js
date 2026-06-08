// EverCare Real Notifications Service via FormSubmit.co

// FormSubmit.co blocks requests from localhost due to CORS policy.
// In development (localhost / 127.0.0.1), we skip the real fetch and
// log a simulated success so the rest of the app works normally.
const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "");

export const notificationService = {
  /**
   * Sends a real email notification using the free, open FormSubmit.co AJAX endpoint.
   * Note: The first email received at the target inbox will require a one-time activation click
   * from FormSubmit to confirm receipt permission.
   * 
   * @param {string} toEmail Recipient Email Address
   * @param {string} subject Email Subject line
   * @param {string} title Email Header title inside body
   * @param {string} message Email Content message body
   * @returns {Promise<boolean>} Success status
   */
  sendEmailNotification: async (toEmail, subject, title, message) => {
    console.log(`Notifications: Attempting real email dispatch to: ${toEmail}`);

    // Skip real HTTP call on localhost — FormSubmit.co blocks it with CORS
    if (IS_DEV) {
      console.info(
        `[DEV MODE] Email simulation (FormSubmit.co blocked on localhost).\n` +
        `  To: ${toEmail}\n  Subject: ${subject}\n  Title: ${title}\n  Message: ${message}`
      );
      return true;
    }

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${toEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: `EverCare: ${subject}`,
          _honey: "", // Honeypot field to prevent spam
          System: "EverCare Medical Center - Online Portal",
          Recipient: toEmail,
          Subject: subject,
          Title: title,
          Message: message,
          timestamp: new Date().toLocaleString()
        })
      });

      if (!response.ok) {
        throw new Error(`SMTP Dispatch Failed with HTTP status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Notifications: Email dispatched successfully via FormSubmit API.", result);
      return true;
    } catch (error) {
      console.error("Notifications: Email dispatch failure.", error);
      return false;
    }
  },

  /**
   * Dispatches a real 6-digit OTP code to the user's email for Two-Factor Verification.
   */
  sendOTPCode: async (toEmail, toName, otpCode) => {
    const subject = "Your 2-Factor Verification Code";
    const title = "Security Verification Request";
    const message = `Dear ${toName},\n\nYour one-time 2-Factor Authentication (MFA) passcode is [ ${otpCode} ].\n\nThis security code will expire in 10 minutes. If you did not initiate this sign-in request, please immediately reset your password and contact EverCare Security.`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  },

  /**
   * Dispatches a real appointment booking confirmation to the patient's email.
   */
  sendBookingConfirmation: async (toEmail, toName, doctorName, specialty, date, time, fee) => {
    const subject = `Appointment Requested: ${doctorName}`;
    const title = "Consultation Scheduled Successfully";
    const message = `Dear ${toName},\n\nWe have registered your consultation booking request with ${doctorName} (${specialty}).\n\nDetails:\n- Date: ${date}\n- Time: ${time}\n- consultation Fee: ₱${fee.toLocaleString()} PHP\n\nPlease ensure your consultation fee is cleared. Once payment is confirmed, the hospital desk will activate your private teleconsultation room.`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  },

  /**
   * Notifies patient that their appointment has been approved by admin.
   */
  sendAppointmentApproved: async (toEmail, toName, doctorName, specialty, date, time) => {
    const subject = `Appointment Confirmed: ${doctorName}`;
    const title = "Your Appointment Has Been Approved";
    const message = `Dear ${toName},\n\nGreat news! Your appointment with ${doctorName} (${specialty}) has been reviewed and officially confirmed by our admin team.\n\nAppointment Details:\n- Doctor: ${doctorName}\n- Specialty: ${specialty}\n- Date: ${date}\n- Time: ${time}\n\nPlease arrive 10-15 minutes early and bring a valid ID. If you need to reschedule or cancel, please do so at least 24 hours in advance via the EverCare Patient Portal.\n\nWe look forward to seeing you!`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  },

  /**
   * Notifies patient that their appointment has been rejected/cancelled by admin.
   */
  sendAppointmentRejected: async (toEmail, toName, doctorName, date, time, reason) => {
    const subject = `Appointment Update: ${doctorName}`;
    const title = "Appointment Could Not Be Confirmed";
    const message = `Dear ${toName},\n\nWe regret to inform you that your scheduled appointment with ${doctorName} on ${date} at ${time} could not be confirmed at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ""}We apologize for any inconvenience. Please log in to the EverCare Patient Portal to book a new appointment at your convenience, or contact our support team for further assistance.`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  },

  /**
   * Sends a reminder to the patient about their upcoming confirmed appointment.
   */
  sendAppointmentReminder: async (toEmail, toName, doctorName, specialty, date, time) => {
    const subject = `Reminder: Upcoming Appointment with ${doctorName}`;
    const title = "Appointment Reminder";
    const message = `Dear ${toName},\n\nThis is a friendly reminder that you have an upcoming appointment with ${doctorName} (${specialty}).\n\nAppointment Details:\n- Doctor: ${doctorName}\n- Specialty: ${specialty}\n- Date: ${date}\n- Time: ${time}\n\nPlease ensure you:\n- Arrive 10-15 minutes before your scheduled time\n- Bring a valid government-issued ID\n- Have your consultation fee ready\n\nIf you need to reschedule or cancel, please do so as soon as possible via the EverCare Patient Portal. We look forward to your visit!`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  },

  /**
   * Dispatches a completed consultation summary, diagnosis, and prescription details.
   */
  sendConsultationCompleted: async (toEmail, toName, doctorName, diagnosis, prescription) => {
    const subject = `Clinical Consultation Report: ${doctorName}`;
    const title = "Medical Consultation Summary & Digital Prescription";
    const message = `Dear ${toName},\n\nYour clinical teleconsultation session with ${doctorName} has been completed.\n\nDiagnostic Summary:\n"${diagnosis || "Patient monitored."}"\n\nDigital Prescription Record (Rx):\n${prescription || "No medicine prescription required."}\n\nAll details have been securely logged into your EverCare Medical Directory. Thank you for choosing EverCare Medical Center.`;

    return await notificationService.sendEmailNotification(toEmail, subject, title, message);
  }
};