export const config = { runtime: 'nodejs' };

const MODEL = 'agnes-video-2.5-flash';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Video generation is not connected. Add AGNES_API_KEY in Vercel.' });

  const videoId = typeof req.query?.videoId === 'string' ? req.query.videoId.trim() : '';
  if (!videoId || videoId.length > 180 || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    return res.status(400).json({ error: 'A valid video task ID is required.' });
  }

  try {
    const url = new URL('https://apihub.agnes-ai.com/agnesapi');
    url.searchParams.set('video_id', videoId);
    url.searchParams.set('model_name', MODEL);
    const upstream = await fetch(url, {
      headers: { Authorization: 'Bearer ' + apiKey },
      signal: AbortSignal.timeout(30000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : (upstream.status === 401 || upstream.status === 403 ? 503 : 502);
      return res.status(status).json({ error: status === 429 ? 'The video status service is busy. Try checking again shortly.' : 'Could not check the video task status.' });
    }

    const status = String(result?.status || result?.data?.status || 'processing').toLowerCase();
    const videoUrl = result?.url || result?.video_url || result?.data?.url || result?.data?.video_url;
    if (status === 'failed' || status === 'error') {
      return res.status(200).json({ status: 'failed', error: result?.error?.message || result?.message || 'The provider could not generate this video.' });
    }
    if ((status === 'completed' || status === 'success' || status === 'succeeded') && typeof videoUrl === 'string' && /^https:\/\//i.test(videoUrl)) {
      return res.status(200).json({ status: 'completed', videoUrl, provider: 'Agnes AI' });
    }
    return res.status(200).json({ status: 'processing' });
  } catch (error) {
    console.error('VINCORA video status error:', error?.name || 'request_error');
    return res.status(504).json({ error: 'Could not reach the video status service. Try again shortly.' });
  }
}
