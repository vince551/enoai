import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './image.js';

function mockResponse() {
  return {
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(payload) { this.payload = payload; return this; }
  };
}

test('Cloudflare FLUX image endpoint', async (t) => {
  const oldAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  const oldFetch = global.fetch;

  try {
    await t.test('requires Cloudflare credentials and never falls back to a paid provider', async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;
      let called = false;
      global.fetch = async () => { called = true; throw new Error('unexpected request'); };

      const res = mockResponse();
      await handler({ method: 'POST', body: { prompt: 'A mountain landscape' } }, res);

      assert.equal(res.statusCode, 503);
      assert.match(res.payload.error, /No paid provider or fallback/);
      assert.equal(called, false);
    });

    await t.test('sends FLUX.2 Klein multipart input and returns the generated image', async () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
      process.env.CLOUDFLARE_API_TOKEN = 'test-token';
      let requestUrl = '';
      let requestInit;

      global.fetch = async (url, init) => {
        requestUrl = String(url);
        requestInit = init;
        return Response.json({ success: true, result: { image: 'x'.repeat(256) } });
      };

      const res = mockResponse();
      await handler({ method: 'POST', body: { prompt: 'Photorealistic Nairobi skyline', ratio: '16:9' } }, res);

      assert.equal(res.statusCode, 200);
      assert.match(requestUrl, /@cf\/black-forest-labs\/flux-2-klein-4b$/);
      assert.equal(requestInit.headers.Authorization, 'Bearer test-token');
      assert.ok(requestInit.body instanceof FormData);
      assert.equal(requestInit.body.get('width'), '1280');
      assert.equal(requestInit.body.get('height'), '720');
      assert.match(requestInit.body.get('prompt'), /genuine photograph/);
      assert.equal(res.payload.provider, 'Cloudflare Workers AI');
      assert.match(res.payload.imageData, /^data:image\/png;base64,/);
    });

    await t.test('turns exhausted free Neurons into a clear no-charge limit response', async () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
      process.env.CLOUDFLARE_API_TOKEN = 'test-token';
      global.fetch = async () => Response.json({
        success: false,
        errors: [{ message: 'You have used up your daily free allocation of 10,000 Neurons.' }]
      }, { status: 400 });

      const res = mockResponse();
      await handler({ method: 'POST', body: { prompt: 'A clean product photograph' } }, res);

      assert.equal(res.statusCode, 429);
      assert.match(res.payload.error, /free daily allowance/);
      assert.match(res.payload.error, /No paid usage or fallback/);
    });
  } finally {
    if (oldAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = oldAccount;
    if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = oldToken;
    global.fetch = oldFetch;
  }
});
