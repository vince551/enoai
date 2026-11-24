import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chat.js';

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

const request = {
  method: 'POST',
  body: { messages: [{ role: 'user', content: 'Hello' }] }
};

test('uses Groq first when both free providers are configured', async () => {
  const oldGroq = process.env.GROQ_API_KEY;
  const oldGemini = process.env.GEMINI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = 'test-groq';
  process.env.GEMINI_API_KEY = 'test-gemini';
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Groq answer' } }] }) };
  };
  try {
    const res = responseRecorder();
    await handler(request, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.text, 'Groq answer');
    assert.equal(res.body.provider, 'Groq');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldGroq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldGroq;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
  }
});

test('uses Gemini when Groq is rate limited', async () => {
  const oldGroq = process.env.GROQ_API_KEY;
  const oldGemini = process.env.GEMINI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = 'test-groq';
  process.env.GEMINI_API_KEY = 'test-gemini';
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gemini backup answer' }] } }] }) };
  };
  try {
    const res = responseRecorder();
    await handler(request, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.text, 'Gemini backup answer');
    assert.equal(res.body.provider, 'Google Gemini');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldGroq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldGroq;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
  }
});

test('returns a clear setup error when neither provider is configured', async () => {
  const oldGroq = process.env.GROQ_API_KEY;
  const oldGemini = process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const res = responseRecorder();
    await handler(request, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /GROQ_API_KEY and\/or GEMINI_API_KEY/);
  } finally {
    if (oldGroq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldGroq;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
  }
});
