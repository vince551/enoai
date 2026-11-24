import {
  AI_MODEL,
  AI_PROVIDER,
  GEMINI_MODEL,
  MAX_OUTPUT_TOKENS,
  buildSystemPrompt,
  normaliseProjectContext,
  normaliseConversation,
  providerErrorMessage,
  resolveMode,
  resolveStudio
} from '../lib/ai-engine.js';

export const config = { runtime: 'nodejs' };

function shouldFailOver(status) {
  return status === 429 || status >= 500;
}

async function callGroq(apiKey, system, messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: 'system', content: system }, ...messages],
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
      stream: false
    }),
    signal: AbortSignal.timeout(50000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('Groq request failed');
    error.status = response.status;
    throw error;
  }
  const text = result?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    const error = new Error('Groq returned an empty response');
    error.status = 502;
    throw error;
  }
  return { text: text.trim(), provider: 'Groq', model: AI_MODEL };
}

async function callGemini(apiKey, system, messages) {
  const contents = messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.6 }
    }),
    signal: AbortSignal.timeout(50000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('Gemini request failed');
    error.status = response.status;
    throw error;
  }
  const text = result?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
  if (typeof text !== 'string' || !text.trim()) {
    const error = new Error('Gemini returned an empty response');
    error.status = 502;
    throw error;
  }
  return { text: text.trim(), provider: 'Google Gemini', model: GEMINI_MODEL };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const normalised = normaliseConversation(body.messages);
  if (normalised.error) return res.status(normalised.status).json({ error: normalised.error });

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey && !geminiKey) {
    return res.status(503).json({
      error: 'VINCORA AI is not connected. Add GROQ_API_KEY and/or GEMINI_API_KEY in the Vercel Production environment. No paid provider was used.'
    });
  }

  const studio = resolveStudio(body.studio);
  const mode = resolveMode(body.mode);
  const system = buildSystemPrompt(studio, mode, normaliseProjectContext(body.projectContext));
  let output;

  if (groqKey) {
    try {
      output = await callGroq(groqKey, system, normalised.messages);
    } catch (error) {
      const status = error?.status || 502;
      console.error('VINCORA Groq request failed:', status);
      if (!geminiKey || !shouldFailOver(status)) {
        const responseStatus = status === 401 || status === 403 ? 503 : (status === 429 ? 429 : 502);
        return res.status(responseStatus).json({ error: providerErrorMessage('Groq', status) });
      }
      try {
        output = await callGemini(geminiKey, system, normalised.messages);
      } catch (fallbackError) {
        console.error('VINCORA Gemini fallback failed:', fallbackError?.status || fallbackError?.name || 'request_error');
        const fallbackStatus = fallbackError?.status || 502;
        return res.status(fallbackStatus === 401 || fallbackStatus === 403 ? 503 : 503).json({
          error: providerErrorMessage('Gemini', fallbackStatus)
        });
      }
    }
  } else {
    try {
      output = await callGemini(geminiKey, system, normalised.messages);
    } catch (error) {
      console.error('VINCORA Gemini request failed:', error?.status || error?.name || 'request_error');
      const status = error?.status || 502;
      return res.status(status === 401 || status === 403 ? 503 : 503).json({ error: providerErrorMessage('Gemini', status) });
    }
  }

  return res.status(200).json({ ...output, studio, route: AI_PROVIDER });
}
