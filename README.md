# Vexon

**Understand → Create → Execute → Improve.**

Vexon is a practical AI workspace for individuals, students, developers, entrepreneurs and small businesses. It helps turn everyday needs into usable outcomes.

## Product modules

- AI Workspace
- Write Studio
- Business Assistant
- Developer Studio
- Research Assistant
- Learning Assistant
- Workflow Studio
- My Projects
- File Workspace

## Principles

- Free-first: use provider free tiers with explicit limits; no paid model fallback.
- Secure by design: AI credentials stay server-side and usage is metered by the backend.
- User control: consequential actions require clear user intent.
- Accessible: responsive, mobile-first experience.
- Modular and cost-conscious: providers and capabilities remain replaceable.

## Current status

The workspace uses Groq's free-tier API with the model `openai/gpt-oss-20b`. Set the `GROQ_API_KEY` environment variable in Vercel (Production) to enable chat. The API key is read only by the serverless function and is never exposed to browser code. The endpoint does not fall back to a paid provider. Groq free-tier rate limits apply and can change; when a limit is reached, VEXON reports that instead of making a paid request.

Each request is capped at 12 recent messages and 1,200 output tokens. Conversation history is stored locally in the browser. Authentication, cross-device persistence, file processing, billing and integrations are not connected yet.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
npm run build
```

For local AI requests, set `GROQ_API_KEY` in a local `.env` file. Never commit API keys or place them in frontend code.

## Roadmap

1. Secure server-side AI provider integration.
2. Authentication and persistent conversations.
3. Projects and file workspace.
4. Usage metering and free-tier limits.
5. Studio-specific workflows.
6. Billing only after validating usage economics.
