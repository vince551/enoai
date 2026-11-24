import {
  AI_MODEL,
  AI_PROVIDER,
  MAX_OUTPUT_TOKENS,
  buildSystemPrompt,
  normaliseProjectContext,
  normaliseConversation,
  providerErrorMessage,
  resolveMode,
  resolveStudio
} from '../lib/ai-engine.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'VINCORA AI is not connected yet. Add the Groq API key as GROQ_API_KEY in the Vercel Production environment. No paid provider was used.'
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const normalised = normaliseConversation(body.messages);
  if (normalised.error) {
    return res.status(normalised.status).json({ error: normalised.error });
  }

  const studio = resolveStudio(body.studio);
  const mode = resolveMode(body.mode);
  const projectContext = normaliseProjectContext(body.projectContext);
  const system = buildSystemPrompt(studio, mode, projectContext);

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'system', content: system }, ...normalised.messages],
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.6,
        stream: false
      }),
      signal: AbortSignal.timeout(50000)
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const code = result?.error?.code || result?.error?.type || 'provider_error';
      console.error('VINCORA AI provider request failed:', upstream.status, code);
      const status = upstream.status === 429 ? 429 : (upstream.status === 401 || upstream.status === 403 ? 503 : 502);
      return res.status(status).json({
        error: providerErrorMessage(upstream.status)
      });
    }

    const text = result?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(502).json({ error: 'The free model returned an empty response. Please try again.' });
    }

    return res.status(200).json({
      text: text.trim(),
      model: AI_MODEL,
      provider: AI_PROVIDER,
      studio
    });
  } catch (error) {
    console.error('VINCORA AI provider request error:', error?.name || 'request_error');
    return res.status(504).json({
      error: 'The free AI request timed out or could not connect. Please try again.'
    });
  }
}
