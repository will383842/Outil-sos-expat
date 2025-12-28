import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import twilio from "twilio";

// Define secrets for Twilio credentials
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// Initialize Twilio client only when needed (not during deployment)
let client: twilio.Twilio | null = null;

function getTwilioClient() {
  if (!client) {
    const accountSid = TWILIO_ACCOUNT_SID.value();
    const authToken = TWILIO_AUTH_TOKEN.value();
    
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }
    
    client = twilio(accountSid, authToken);
  }
  return client;
}

export const testTwilioCall = onRequest(
  { 
    region: "europe-west1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const to = "+9111111111"; // Destination number
    const message = "Ceci est un appel test depuis SOS Expat.";
    const twilioNumber = TWILIO_PHONE_NUMBER.value();

    try {
      const twilioClient = getTwilioClient();
      const call = await twilioClient.calls.create({
        twiml: `<Response><Say>${message}</Say></Response>`,
        to,
        from: twilioNumber,
      });

      res.status(200).json({ ok: true, sid: call.sid });
    } catch (err) {
      console.error("Error in testTwilioCall:", err);
      if (err instanceof Error) {
        res.status(500).json({ ok: false, error: err.message || err.toString() });
      } else {
        res.status(500).json({ ok: false, error: "An unknown error occurred" });
      }
    }
  }
);
