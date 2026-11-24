export const config = { runtime: 'nodejs' };

const MODEL = 'agnes-video-2.5-flash';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Video generation is not connected yet. Add AGNES_API_KEY to the Vercel Production environment. No paid fallback was used.'
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const ratio = ['16:9', '9:16', '1:1'].includes(body.ratio) ? body.ratio : '16:9';
  const seconds = ['4', '5', '6', '7', '8', '9', '10', '11', '12'].includes(String(body.seconds)) ? String(body.seconds) : '5';

  if (!prompt) return res.status(400).json({ error: 'Describe the video you want to create.' });
  if (prompt.length > 1200) return res.status(413).json({ error: 'Video prompts must be 1,200 characters or fewer.' });

  try {
    const upstream = await fetch('https://apihub.agnes-ai.com/v1/videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        mode: 'text',
        seconds,
        size: '720P',
        aspect_ratio: ratio,
        n: 1
      }),
      signal: AbortSignal.timeout(60000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('VINCORA video provider error:', upstream.status, result?.error?.code || result?.error?.type || 'provider_error');
      const status = upstream.status === 429 ? 429 : (upstream.status === 401 || upstream.status === 403 ? 503 : 502);
      return res.status(status).json({
        error: upstream.status === 429
          ? 'The free video queue is busy or its rate limit has been reached. Wait before retrying. No paid fallback was used.'
          : upstream.status === 401 || upstream.status === 403
            ? 'The Agnes API key is invalid or does not have access to the free video model. Check your account and AGNES_API_KEY. No paid fallback was used.'
            : 'The free video provider rejected this request. No paid fallback was used.'
      });
    }

    const videoId = result?.video_id || result?.id || result?.data?.video_id || result?.task_id;
    if (!videoId || typeof videoId !== 'string') {
      return res.status(502).json({ error: 'The video provider did not return a video task ID. No paid fallback was used.' });
    }
    return res.status(202).json({ videoId, model: MODEL, provider: 'Agnes AI', status: result?.status || 'processing' });
  } catch (error) {
    console.error('VINCORA video request error:', error?.name || 'request_error');
    return res.status(504).json({ error: 'The video request timed out before a task was confirmed. Please try again.' });
  }
}
