import axios from 'axios';

export async function moderateInput(text: string): Promise<{ok:boolean; reason?:string}> {
  // Optional: use OpenAI moderation if available. Fallback: simple length/empty checks.
  if (!text || text.trim().length === 0) return { ok: false, reason: 'empty' };
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: true };
    // Modern moderation endpoint (Responses API does not yet support moderation directly, so use dedicated route if present).
    const resp = await axios.post('https://api.openai.com/v1/moderations', 
      { model: 'omni-moderation-latest', input: text }, 
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const r = resp.data?.results?.[0];
    if (r?.flagged) return { ok: false, reason: 'flagged' };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
