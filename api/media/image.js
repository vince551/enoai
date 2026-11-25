export const config = { runtime: 'nodejs' };

const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

function getDimensions(ratio) {
  const dimensions = {
    '1:1': [1024, 1024],
    '3:4': [768, 1024],
    '4:3': [1024, 768],
    '16:9': [1280, 720],
    '9:16': [720, 1280],
    '2:3': [768, 1152],
    '3:2': [1152, 768],
    '21:9': [1344, 576]
  };
  return dimensions[ratio] || dimensions['4:3'];
}

function improvePrompt(prompt) {
  const realism = /\b(?:photorealistic|photo-realistic|hyperrealistic|realistic|lifelike|true[- ]to[- ]life|professional photography|editorial photography|architectural photography)\b/i.test(prompt);
  const qualityDirection = 'Create a polished, high-quality image with a clear focal subject, intentional composition, coherent perspective, accurate proportions, natural textures, clean edges, balanced lighting, realistic shadows, and refined colour grading. Avoid visual clutter, malformed details, distorted geometry, excessive sharpening, and artificial-looking surfaces. Do not add text, logos, or watermarks unless requested.';
  const photoDirection = realism
    ? ' Make it read as a genuine photograph rather than a 3D render or illustration, with physically plausible materials, natural light falloff, authentic surface detail, believable scale, and subtle camera characteristics.'
    : '';
  return prompt + '\n\n' + qualityDirection + photoDirection;
}

function getProviderError(result) {
  const errors = Array.isArray(result?.errors)
    ? result.errors.map(item => item?.message || item?.code || '').filter(Boolean)
    : [];
  const messages = Array.isArray(result?.messages)
    ? result.messages.map(item => item?.message || '').filter(Boolean)
    : [];
  return [
    ...errors,
    ...messages,
    result?.error?.message,
    result?.result?.error?.message
  ].filter(Boolean).join(' ').slice(0, 500);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return res.status(503).json({
      error: 'Free image generation is not connected yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to Vercel Production. No paid provider or fallback is used.'
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Describe the image you want to create.' });
  if (prompt.length > 1500) return res.status(413).json({ error: 'Image prompts must be 1,500 characters or fewer.' });

  const [width, height] = getDimensions(body.ratio);
  const form = new FormData();
  form.append('prompt', improvePrompt(prompt));
  form.append('width', String(width));
  form.append('height', String(height));
  form.append('guidance', '3.5');

  try {
    const upstream = await fetch(API_BASE + '/' + encodeURIComponent(accountId) + '/ai/run/' + MODEL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiToken },
      body: form,
      signal: AbortSignal.timeout(110000)
    });

    const contentType = upstream.headers.get('content-type') || '';
    let result = {};
    let encodedImage = '';

    if (contentType.includes('image/')) {
      encodedImage = Buffer.from(await upstream.arrayBuffer()).toString('base64');
    } else {
      result = await upstream.json().catch(() => ({}));
      encodedImage = result?.result?.image || result?.image || '';
    }

    if (!upstream.ok) {
      const detail = getProviderError(result);
      console.error('VINCORA Cloudflare image provider error:', upstream.status, detail.slice(0, 160) || 'provider_error');

      if (upstream.status === 429 || /daily.{0,30}(?:free|allocation)|free.{0,30}allocation|neurons|quota|rate limit|capacity/i.test(detail)) {
        return res.status(429).json({
          error: 'VINCORA has reached Cloudflare Workers AI’s free daily allowance, or the free service is temporarily busy. Try again after the allowance resets. No paid usage or fallback was triggered.'
        });
      }
      if (upstream.status === 401 || upstream.status === 403) {
        return res.status(503).json({
          error: 'Cloudflare rejected the Workers AI request. Check that the API token has Workers AI Read and Workers AI Edit permissions and that the account is using the Free plan. No paid provider or fallback is used.'
        });
      }
      return res.status(502).json({
        error: detail
          ? 'Cloudflare could not generate this image: ' + detail.slice(0, 220) + '. No paid fallback was used.'
          : 'The free image provider could not complete this generation. No paid fallback was used.'
      });
    }

    if (typeof encodedImage === 'string' && encodedImage.length > 100) {
      return res.status(200).json({
        imageData: 'data:image/png;base64,' + encodedImage,
        model: MODEL,
        provider: 'Cloudflare Workers AI'
      });
    }

    return res.status(502).json({
      error: 'Cloudflare returned an unsupported image response. No paid fallback was used.'
    });
  } catch (error) {
    const detail = String(error?.message || error?.cause?.message || 'unknown_request_error').slice(0, 240);
    const causeCode = String(error?.cause?.code || error?.code || '').slice(0, 80);
    console.error('VINCORA Cloudflare image request error:', error?.name || 'request_error', detail, causeCode);
    return res.status(504).json({
      error: 'Free image generation timed out or Cloudflare could not be reached. Try again later. No paid fallback was used.'
    });
  }
}
