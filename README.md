# VINCORA AI

**Intelligence. Without limits.**

A practical AI workspace for writing, business, development, research, learning and getting work done.

## Workspace capabilities

- Six specialist studios plus the general AI Workspace.
- Groq-powered chat using the free-tier model `openai/gpt-oss-20b`.
- Projects, project briefs and project-linked conversations.
- Creation Centre for editable documents, importing assistant responses and Markdown/text export.
- Guided workflows with saved step progress and working notes.
- Image and video generation through the Agnes AI multimodal API. Video uses the `agnes-video-2.5-flash` model; free access is subject to provider availability and may change.
- Optional personal context with inspect, edit, opt-in sharing and delete controls.

## Cost and privacy principles

- Free-first: Groq is the configured AI provider. There is no paid model fallback.
- AI credentials remain server-side in Vercel functions (`GROQ_API_KEY` for chat and `AGNES_API_KEY` for media).
- Chat history, projects, documents, workflow progress and personal context are stored in browser localStorage. They are device/browser-specific and are not cloud-synced.
- Personal context is not sent with chat requests unless the user enables its sharing control.
- Project briefs remain separate and are included only for conversations associated with that project.
- Do not store passwords, API keys or highly sensitive information in workspace context.

## Current limitations

- No account authentication or cross-device sync.
- No server-side document storage or file attachment processing.
- Documents export as Markdown or plain text; PDF/DOCX export is not included.
- Workflows are guided checklists and notes, not unattended automation or third-party integrations.
- Groq free-tier rate limits apply. When the limit is reached, VINCORA reports it and does not switch to a paid provider.
- Media generation requires an Agnes API key. Its free/default access, rate limits, queue capacity and model availability are controlled by Agnes and may change. Video generation is asynchronous and can take several minutes. VINCORA uses the free `agnes-video-2.5-flash` model only and does not fall back to paid models.

## AI request limits

Each request is capped at 12 recent messages and 1,200 output tokens. Project/personal context is bounded by the engine's 3,000-character context limit.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
npm test
npm run build
```

For local AI requests, set `GROQ_API_KEY` and `AGNES_API_KEY` in a local `.env` file. Never commit API keys or place them in frontend code.
