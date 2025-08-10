import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

async function getAISettings() {
  const snap = await admin.firestore().collection("ops").doc("settings_ai").get();
  const data = (snap.exists ? (snap.data() as any) : {}) || {};
  return {
    enabled: data.enabled !== false,
    replyOnBookingCreated: data.replyOnBookingCreated !== false,
    replyOnUserMessage: data.replyOnUserMessage !== false,
    model: data.model || "gpt-4o-mini",
    temperature: typeof data.temperature === "number" ? data.temperature : 0.2,
    maxOutputTokens: typeof data.maxOutputTokens === "number" ? data.maxOutputTokens : 700,
    systemPrompt: data.systemPrompt || "Tu es un assistant interne pour SOS Expat. Rédige des réponses professionnelles, concises et actionnables en fr-FR."
  };
}

async function callOpenAI(prompt: string, model: string, temperature: number, maxTokens: number): Promise<string> {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature,
      max_output_tokens: maxTokens
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const out = (data.output_text ?? "").toString().trim();
  return out || "Je n'ai pas réussi à générer de réponse utile sur cette demande.";
}

export const aiOnBookingCreated = onDocumentCreated(
  { document: "bookings/{bookingId}", secrets: [OPENAI_API_KEY] },
  async (event) => {
    const cfg = await getAISettings();
    if (!cfg.enabled || !cfg.replyOnBookingCreated) return;

    const db = admin.firestore();
    const snap = event.data;
    if (!snap) return;
    const booking = snap.data() as any;
    if (!booking) return;

    if (!booking.providerId) { logger.debug("AI skipped: no providerId"); return; }
    if (booking.aiProcessed) { logger.debug("AI skipped: already processed"); return; }

    const convSnap = await db.collection("conversations").where("bookingId", "==", event.params.bookingId).limit(1).get();
    if (convSnap.empty) { logger.warn("No conversation for booking", event.params.bookingId); return; }
    const convRef = convSnap.docs[0].ref;

    const firstName = booking.firstName || "client";
    const country = booking.country || "—";
    const title = booking.title || "Demande";
    const description = booking.description || "";

    const system = cfg.systemPrompt || `Tu es un assistant interne pour SOS Expat.`;
    const user = `Demande initiale pour ${firstName} — Pays: ${country} — Titre: ${title}
Description:
${description}
`;
    const prompt = `${system}
---
${user}`;

    try {
      const aiText = await callOpenAI(prompt, cfg.model, cfg.temperature, cfg.maxOutputTokens);
      await convRef.collection("messages").add({
        role: "assistant",
        source: "gpt",
        content: aiText,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await snap.ref.set({ aiProcessed: true, aiAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await convRef.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e:any) {
      logger.error("AI generation failed", e);
      await snap.ref.set({ aiError: (e.message || e).toString().slice(0, 2000) }, { merge: true });
    }
  }
);

export const aiOnUserMessage = onDocumentCreated(
  { document: "conversations/{convId}/messages/{msgId}", secrets: [OPENAI_API_KEY] },
  async (event) => {
    const cfg = await getAISettings();
    if (!cfg.enabled || !cfg.replyOnUserMessage) return;

    const db = admin.firestore();
    const snap = event.data;
    if (!snap) return;
    const message = snap.data() as any;
    if (!message) return;

    if ((message.role || "user") !== "user") return;
    if (message.source === "gpt") return;

    const convId = event.params.convId;
    const convRef = db.collection("conversations").doc(convId);
    const conv = (await convRef.get()).data() as any || {};
    const bookingId = conv.bookingId;

    let context = "";
    if (bookingId) {
      const booking = (await db.collection("bookings").doc(bookingId).get()).data() as any || {};
      context = `Contexte dossier — Pays: ${booking.country || "—"}; Titre: ${booking.title || "—"}; Description: ${(booking.description || "").slice(0, 1500)}`;
    }

    const system = cfg.systemPrompt || `Tu es un assistant interne SOS Expat. Réponds de façon professionnelle et concise.`;
    const user = `Message utilisateur:
${message.content}

${context}`;
    const prompt = `${system}
---
${user}`;

    try {
      const aiText = await callOpenAI(prompt, cfg.model, cfg.temperature, cfg.maxOutputTokens);
      await convRef.collection("messages").add({
        role: "assistant",
        source: "gpt",
        replyTo: snap.ref.id,
        content: aiText,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await convRef.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e:any) {
      await convRef.collection("messages").add({
        role: "system",
        source: "gpt-error",
        content: `Erreur IA: ${(e.message || e).toString().slice(0, 500)}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);
