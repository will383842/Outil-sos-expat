import { getTwilioClient, getTwilioPhoneNumber } from "../../../lib/twilio";

export async function sendSms(to: string, text: string): Promise<string> {
  const client = getTwilioClient();
  const from = getTwilioPhoneNumber();
  console.log(`📱 [SMS] Sending SMS to ${to.slice(0, 5)}*** from ${from}`);
  const res = await client.messages.create({ to, from, body: text });
  console.log(`✅ [SMS] Message sent with SID: ${res.sid}`);
  return res.sid;
}
