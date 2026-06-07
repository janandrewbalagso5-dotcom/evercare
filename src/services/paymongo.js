// PayMongo Payment Service Integration

const PAYMONGO_PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY;
const PAYMONGO_SECRET_KEY = import.meta.env.VITE_PAYMONGO_SECRET_KEY;

const isConfigured = PAYMONGO_PUBLIC_KEY && PAYMONGO_SECRET_KEY;

export const paymongoService = {
  isMock: !isConfigured,

  /**
   * Creates a PayMongo Checkout Session
   * @param {number} amount Amount in PHP pesos (e.g. 1500)
   * @param {string} description Description of payment
   * @param {object} customerInfo Customer metadata { name, email, phone }
   * @param {string} appointmentId Appointment Reference ID
   * @returns {Promise<object>} Contains session details or redirect URL
   */
  createCheckoutSession: async (amount, description, customerInfo, appointmentId) => {
    // PayMongo expects amount in centavos (PHP 1.00 = 100 centavos)
    const amountInCentavos = amount * 100;

    if (!isConfigured) {
      console.log("PayMongo: API keys not configured. Simulating Checkout Session.");
      // Return a simulated session structure
      const sessionId = "cs_mock_" + Math.random().toString(36).substring(2, 15);
      return {
        id: sessionId,
        checkout_url: `#/paymongo-checkout/${sessionId}?amount=${amount}&aptId=${appointmentId}&desc=${encodeURIComponent(description)}&name=${encodeURIComponent(customerInfo.name)}&email=${encodeURIComponent(customerInfo.email)}`,
        status: "active",
        amount: amount
      };
    }

    try {
      const authHeader = btoa(PAYMONGO_SECRET_KEY + ":");
      const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              billing: {
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone
              },
              line_items: [
                {
                  amount: amountInCentavos,
                  currency: "PHP",
                  name: "EverCare Medical Consultation",
                  description: description,
                  quantity: 1
                }
              ],
              payment_method_types: ["card", "gcash", "paymaya", "grab_pay"],
              reference_number: appointmentId,
              success_url: `${window.location.origin}/#/payment-success?apt=${appointmentId}`,
              cancel_url: `${window.location.origin}/#/payment-cancel?apt=${appointmentId}`
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.detail || "Failed to create checkout session");
      }

      const resData = await response.json();
      return {
        id: resData.data.id,
        checkout_url: resData.data.attributes.checkout_url,
        status: resData.data.attributes.status,
        amount: amount
      };
    } catch (error) {
      console.error("PayMongo SDK Error:", error);
      throw error;
    }
  },

  /**
   * Retrieves status of a PayMongo Checkout Session
   * @param {string} sessionId PayMongo Session ID
   */
  retrieveCheckoutSession: async (sessionId) => {
    if (!isConfigured || sessionId.startsWith("cs_mock_")) {
      return {
        id: sessionId,
        status: "paid", // Simulated payment status
      };
    }

    try {
      const authHeader = btoa(PAYMONGO_SECRET_KEY + ":");
      const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authHeader}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve checkout session");
      }

      const resData = await response.json();
      return {
        id: resData.data.id,
        status: resData.data.attributes.status, // e.g. "active", "paid"
        payment_intent: resData.data.attributes.payment_intent
      };
    } catch (error) {
      console.error("PayMongo SDK Error:", error);
      throw error;
    }
  }
};
