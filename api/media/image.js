export const config = { runtime: 'nodejs' };

const MODEL = 'agnes-image-2.5-flash';

function getRatio(body) {
  if (['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'].includes(body.ratio)) return body.ratio;
  if (body.size === '768x1024') return '3:4';
  if (body.size === '1024x1024') return '1:1';
  return '4:3';
}

function improvePhotorealism(prompt) {
  const asksForRealism = /\b(?:photorealistic|photo-realistic|hyperrealistic|realistic|lifelike|true[- ]to[- ]life|professional photography|editorial photography|architectural photography)\b/i.test(prompt);
  if (!asksForRealism) return prompt;
  return prompt + '\n\nPhotographic direction: produce a convincing real-world photograph, not a 3D render or illustration. Use physically accurate materials and lighting, natural skin and surface texture where applicable, realistic atmospheric perspective, nuanced shadows and highlights, balanced exposure, authentic color science, fine natural detail, believable scale and proportions, and a coherent camera perspective. Avoid plastic-looking surfaces, artificial CGI gloss, oversmoothing, excessive sharpening, distorted geometry, and synthetic-looking details. Preserve the requested subject and composition.';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Image generation is not connected yet. Add AGNES_API_KEY to the Vercel Production environment. No paid fallback was used.'
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const ratio = getRatio(body);
  const size = body.quality === 'fast' ? '1K' : '2K';

  if (!prompt) return res.status(400).json({ error: 'Describe the image you want to create.' });
  if (prompt.length > 1600) return res.status(413).json({ error: 'Image prompts must be 1,600 characters or fewer.' });

  try {
    const upstream = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: improvePhotorealism(prompt), size, ratio }),
      signal: AbortSignal.timeout(110000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('VINCORA image provider error:', upstream.status, result?.error?.code || result?.error?.type || 'provider_error');
      const status = upstream.status === 429 ? 429 : (upstream.status === 401 || upstream.status === 403 ? 503 : 502);
      return res.status(status).json({
        error: upstream.status === 429
          ? 'The free image provider is busy or its request limit has been reached. Wait before trying again. No paid fallback was used.'
          : upstream.status === 401 || upstream.status === 403
            ? 'The Agnes API key is invalid or does not have image access. Check AGNES_API_KEY. No paid fallback was used.'
            : 'The image provider could not complete this generation. No paid fallback was used.'
      });
    }

    const item = result?.data?.[0] || result?.image || result;
    const url = item?.url || item?.image_url || result?.url;
    const encoded = item?.b64_json || item?.base64 || result?.b64_json;
    if (typeof url === 'string' && /^https:\/\//i.test(url)) {
      return res.status(200).json({ imageUrl: url, model: MODEL, provider: 'Agnes AI' });
    }
    if (typeof encoded === 'string' && encoded.length > 100) {
      return res.status(200).json({ imageData: 'data:image/png;base64,' + encoded, model: MODEL, provider: 'Agnes AI' });
    }
    return res.status(502).json({ error: 'The image provider returned an unsupported response format. No paid fallback was used.' });
  } catch (error) {
    console.error('VINCORA image request error:', error?.name || 'request_error');
    return res.status(504).json({ error: 'Image generation timed out or the provider could not be reached. Try again later.' });
  }
}
