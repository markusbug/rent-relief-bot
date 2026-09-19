# Contributing

Thanks for helping tenants. A few ground rules keep this project safe to run in public.

## Running locally

```
npm install
npm run dev            # handlers on http://localhost:8787, no payment layer
npm run web            # site on http://localhost:5173
```

Point the site at the local handlers by setting `VITE_API_BASE=http://localhost:8787` in `web/.env`.
Without `LLM_GATEWAY_KEY` in your shell the handlers return a 500 after validation, which is enough
to work on input handling and the UI. See the README for getting a gateway key.

## Rules

- **No secrets in the repo.** API keys go in Bankr's encrypted env (`bankr x402 env set`),
  GitHub secrets, or an untracked `.env`. `.env.example` files only document names.
- **Prompts must never invent statute numbers.** The handlers describe the category of
  protection and tell users to verify. Keep that property in any prompt change.
- **Every result keeps its disclaimer.** These tools are informational, not legal advice.
- **Validate before charging.** Client-side checks in `web/src/components/tools/` must mirror
  the handler rules so nobody pays for a 400.
- **No new dependencies without a reason** in the PR description. The site bundle ships to
  every visitor.
- **Keep handlers self-contained.** Bankr deploys each `x402/<name>/index.ts` on its own, so
  shared helpers have to be inlined.

## Pull requests

Describe what changed and how you tested it (`npm run build`, `npx tsc --noEmit -p web`, and a
local run). Small, focused PRs are easiest to review.
