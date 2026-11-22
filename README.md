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

- Freemium: essential capabilities first; advanced capabilities and higher usage limits can become paid tiers.
- Secure by design: AI credentials stay server-side and usage is metered by the backend.
- User control: consequential actions require clear user intent.
- Accessible: responsive, mobile-first experience.
- Modular and cost-conscious: providers and capabilities remain replaceable.

## Current status

The first implementation is a React + Vite workspace shell. AI generation, authentication, persistence, file processing, billing and integrations are not connected yet. The UI clearly communicates this rather than simulating working AI functionality.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
npm run build
```

No API keys are required for the current UI foundation. Future model credentials must be stored only in server-side environment variables.

## Roadmap

1. Secure server-side AI gateway and provider abstraction.
2. Authentication and persistent conversations.
3. Projects and file workspace.
4. Usage metering and free-tier limits.
5. Studio-specific workflows.
6. Billing after validating usage economics.
