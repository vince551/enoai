export const config = { runtime: 'nodejs' };

const MODEL = 'nvidia/nemotron-3.5-lightning-free';
const MAX_MESSAGES = 12;
const MAX_INPUT_CHARS = 12000;
const MAX_OUTPUT_TOKENS = 1200;

const studioGuidance = {
  'Write Studio': 'Act as a skilled writing partner. Help draft, revise, structure, and polish writing. Match the requested audience and tone.',
  'Business Assistant': 'Act as a practical small-business advisor. Give clear, realistic steps and state assumptions. Do not invent legal, tax, or financial facts.',
  'Developer Studio': 'Act as a senior software engineering assistant. Explain decisions, provide maintainable code, and flag security concerns.',
  'Research Assistant': 'Act as a careful research assistant. Separate established facts from uncertainty and never fabricate sources or citations.',
  'Learning Assistant': 'Act as a patient tutor. Explain concepts step by step, use examples, and check understanding where useful.',
  'Workflow Studio': 'Act as an operations designer. Turn goals into clear, sequenced workflows with owners, inputs, outputs, and checkpoints.'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Vercel Functions expose the short-lived OIDC token on the incoming request header.
  // The environment variable is available during builds/local development, not function runtime.
  const token = req.headers?.['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'The free AI connection is not available on this deployment yet. No paid model was used.'
    });
  }

  const body = req.body || {};
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (!incoming.length || incoming.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Send between 1 and 12 recent messages.' });
  }

  const messages = [];
  let totalChars = 0;
  for (const item of incoming) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.trim();
    if (!content) continue;
    totalChars += content.length;
    if (content.length > 6000 || totalChars > MAX_INPUT_CHARS) {
      return res.status(413).json({ error: 'This conversation is too long for the free request limit. Shorten the message and try again.' });
    }
    messages.push({ role: item.role, content });
  }

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'A user message is required to generate a response.' });
  }

  const studio = typeof body.studio === 'string' ? body.studio.slice(0, 60) : 'AI Workspace';
  const mode = body.mode === 'Deep think' ? 'Think carefully through the problem before answering, but provide only a useful concise explanation.' : 'Prioritize clear, direct, practical answers.';
  const system = [
    'You are Vexon, a helpful AI workspace assistant. Be accurate, useful, and transparent about uncertainty. Never claim to have browsed, executed code, or accessed files unless a tool actually did so.',
    studioGuidance[studio] || 'Help the user think clearly, create useful work, and execute practical next steps.',
    mode,
    'Do not invent citations, statistics, capabilities, or completed actions.'
  ].join('\n\n');

  try {
    const upstream = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.6,
        stream: false
      }),
      signal: AbortSignal.timeout(50000)
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Vexon free-model request failed:', upstream.status, result?.error?.code || result?.error?.type || 'gateway_error');
      if (upstream.status === 429) return res.status(429).json({ error: 'The free model is temporarily rate-limited. Wait a little and try again.' });
      if (upstream.status === 402 || upstream.status === 403) return res.status(503).json({ error: 'The free model is not currently available to this Vercel account. No paid model was used.' });
      return res.status(502).json({ error: 'The free AI service is temporarily unavailable. No paid fallback was attempted.' });
    }

    const text = result?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(502).json({ error: 'The free model returned an empty response. Please try again.' });
    }
    return res.status(200).json({ text: text.trim(), model: MODEL });
  } catch (error) {
    console.error('Vexon AI request error:', error?.name || 'request_error');
    return res.status(504).json({ error: 'The free AI request timed out or could not connect. Please try again.' });
  }
}
