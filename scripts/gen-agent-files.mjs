#!/usr/bin/env node
// Generates every agent-facing file from bankr.x402.json so the site, the skill and the
// API description never drift from the deployed prices and schemas.
//
// Outputs (all committed, also rebuilt by `npm run build`):
//   web/public/llms.txt                                   what the service is, for any LLM agent
//   web/public/openapi.json                               OpenAPI 3.1 for the three endpoints
//   web/public/skill.md                                   SKILL.md, fetchable by URL
//   web/public/.well-known/agent-skills/index.json        `npx skills add <domain>` discovery
//   web/public/.well-known/agent-skills/rent-relief-bot/SKILL.md
//   web/public/.well-known/agent-card.json                A2A-style agent card
//   skills/rent-relief-bot/SKILL.md                       repo copy for GitHub / Bankr installs
//
// Config: OWNER_ADDRESS / SITE_URL / GITHUB_URL env vars, else web/.env, else web/.env.example.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "bankr.x402.json"), "utf8"));

function readEnv(file) {
  const p = join(root, "web", file);
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).split("#")[0].trim()];
      }),
  );
}
const env = { ...readEnv(".env.example"), ...readEnv(".env"), ...process.env };
const OWNER = env.OWNER_ADDRESS || env.VITE_OWNER_ADDRESS;
const SITE = (env.SITE_URL || env.VITE_SITE_URL || "https://rentrelief.markushaas.com").replace(/\/$/, "");
const GITHUB = env.GITHUB_URL || env.VITE_GITHUB_URL || "https://github.com/markusbug/rent-relief-bot";
if (!OWNER) throw new Error("OWNER_ADDRESS not set (web/.env VITE_OWNER_ADDRESS)");
const API = `https://x402.bankr.bot/${OWNER}`;
const HOST = new URL(SITE).host;

const services = Object.entries(manifest.services).map(([id, s]) => ({
  id,
  method: s.methods?.[0] ?? "POST",
  price: s.price,
  description: s.description,
  input: s.schema?.input ?? { type: "object" },
  output: s.schema?.output ?? { type: "object" },
  url: `${API}/${id}`,
}));

const write = (rel, content) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log("wrote", rel);
};

function schemaLines(schema) {
  const req = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([k, v]) => {
    const en = v.enum ? ` one of: ${v.enum.join(", ")}.` : "";
    return `  - ${k} (${v.type}${req.has(k) ? ", required" : ""}): ${v.description ?? ""}${en}`;
  });
}

const examples = {
  "rent-letter": {
    letter_type: "rent_increase",
    tenant_name: "Sam Lee",
    landlord_name: "Acme Property Management",
    property_address: "12 Elm St Apt 4, Oakland CA",
    state: "CA",
    details: "Written notice on Sept 3 raising rent from 2100 to 2500 from Oct 1. Month-to-month, 3 years here, never late.",
    current_rent: 2100,
    proposed_rent: 2500,
  },
  "lease-clause": {
    clause: "Tenant shall be responsible for all repairs and maintenance of the premises, regardless of cause, and waives any claim against Landlord for habitability.",
    state: "NY",
  },
  "tenant-rights": { state: "TX", topic: "deposit" },
};

function curlFor(s) {
  if (s.method === "GET") {
    const qs = new URLSearchParams(examples[s.id]).toString();
    return `bankr x402 call "${s.url}?${qs}"`;
  }
  return `bankr x402 call ${s.url} -X POST --body '${JSON.stringify(examples[s.id])}'`;
}

// ---------- SKILL.md ----------
const skillMd = `---
name: rent-relief-bot
description: Help a tenant deal with a landlord using Rent Relief Bot's paid x402 tools (rent-increase, repair and deposit letters; lease-clause red flags; state tenant rights). Use when the user mentions rent, a landlord, a lease, a security deposit, eviction, repairs, or tenant rights in the US.
version: 1
visibility: public
tags: [tenants, housing, rent, lease, x402, base, legal-info]
metadata:
  clawdbot:
    emoji: "🏠"
    homepage: ${SITE}
    requires:
      bins: [bankr]
---

# Rent Relief Bot

Three pay-per-call tools for US tenants, served as x402 endpoints on Base. Each call costs a
few cents in USDC and returns structured JSON. No account or API key is needed to call them:
payment is the authentication.

| Tool | Method | Price | Use it when the user wants |
|---|---|---|---|
${services.map((s) => `| ${s.id} | ${s.method} | $${s.price} USDC | ${s.description.replace(/^Rent Relief Bot: /, "")} |`).join("\n")}

Base URL: \`${API}\`

## When to use which tool

- "My rent is going up", "my landlord won't fix", "I want my deposit back" → **rent-letter**.
  Collect: letter_type, tenant name, landlord name, property address, state, and a plain
  description of what happened with dates. Ask for current and proposed rent when relevant.
- "What does this clause mean", "is this lease normal", "can they do this" with lease text →
  **lease-clause**. Needs the clause verbatim (20 to 6000 chars) and the state.
- "What are my rights about X in <state>" → **tenant-rights**. Needs state and one topic.
- Start with tenant-rights ($0.05) when the user is unsure; escalate to a letter when they
  want to act.

## How to call and pay

Preferred: the Bankr CLI, which pays from the user's Bankr wallet automatically.

\`\`\`
${services.map(curlFor).join("\n")}
\`\`\`

Any x402 v2 client works too (for example \`@x402/fetch\` with \`@x402/evm\` in TypeScript):
request the URL, receive HTTP 402 with a \`payment-required\` header, sign the USDC
\`TransferWithAuthorization\` for the exact amount on chain 8453, retry with the
\`payment-signature\` header. Payment is gasless for the payer.

If you cannot pay on the user's behalf, send them to the site with the tool preselected:
${services.map((s) => `- ${SITE}/#${s.id}`).join("\n")}

## Inputs

${services
  .map(
    (s) => `### ${s.id} (${s.method})
${schemaLines(s.input).join("\n")}`,
  )
  .join("\n\n")}

## Outputs

All responses are JSON and include \`disclaimer\` (informational, not legal advice),
\`generated_at\` and \`powered_by\`.

- rent-letter: \`subject\`, \`letter\` (ready to send, [BRACKETS] mark blanks the tenant must fill),
  \`key_points[]\`, \`next_steps[]\`.
- lease-clause: \`plain_english\`, \`what_it_means_for_you[]\`, \`red_flags[] {severity, issue, why}\`,
  \`negotiation_asks[]\`.
- tenant-rights: \`summary\`, \`key_rules[]\`, \`common_landlord_violations[]\`,
  \`where_to_get_help[]\`, \`confidence\`.

## Rules

- Present results as general information, never as legal advice. Keep the disclaimer.
- Do not send social security numbers, bank details or other secrets in \`details\` or \`clause\`.
- Validate inputs before paying: enums must match, \`details\` ≤ 4000 chars, \`clause\` 20 to
  6000 chars. The endpoint returns 400 (unpaid) on bad input.
- Tell the user the price before calling. Calls are settled per request; there are no refunds
  for a valid response.
- A 502 means the writing model failed and the user was not charged. Retry once.

## Links

- Site: ${SITE}
- Machine-readable: ${SITE}/llms.txt, ${SITE}/openapi.json
- Source (MIT): ${GITHUB}
`;

write("skills/rent-relief-bot/SKILL.md", skillMd);
write("web/public/skill.md", skillMd);
write("web/public/.well-known/agent-skills/rent-relief-bot/SKILL.md", skillMd);
write(
  "web/public/.well-known/agent-skills/index.json",
  JSON.stringify(
    {
      skills: [
        {
          name: "rent-relief-bot",
          description:
            "Help a tenant deal with a landlord: rent-increase, repair and deposit letters, lease-clause red flags, and state tenant rights, paid per call in USDC on Base via x402.",
          files: ["SKILL.md"],
        },
      ],
    },
    null,
    2,
  ) + "\n",
);

// ---------- llms.txt ----------
write(
  "web/public/llms.txt",
  `# Rent Relief Bot

> Pay-per-call tools for US tenants: a ready-to-send landlord letter, a lease-clause check with
> red flags, and a summary of state tenant rights. Each call costs $0.05 to $0.25 in USDC on
> Base, paid through the x402 protocol. No account, no API key; payment is the authentication.
> Open source (MIT).

If you are an agent helping a user with a landlord, rent, lease, deposit, eviction or repair
problem: install the skill or read the OpenAPI description, ask the user for the inputs the
tool needs, tell them the price, then call the endpoint and pay with the Bankr CLI
(\`bankr x402 call <url>\`) or any x402 v2 client. If you cannot pay, send the user to the site
with the tool preselected (links below).

## Tools (base URL ${API})

${services.map((s) => `- [${s.id}](${s.url}): ${s.method}, $${s.price} USDC. ${s.description.replace(/^Rent Relief Bot: /, "")}`).join("\n")}

## Machine-readable

- [Agent skill (SKILL.md)](${SITE}/skill.md): when to use which tool, inputs, outputs, rules.
  Install with \`npx skills add ${HOST}\` or tell a Bankr agent "install the skill at ${GITHUB}/tree/main/skills/rent-relief-bot".
- [OpenAPI 3.1](${SITE}/openapi.json): request and response schemas for all three endpoints.
- [Agent card](${SITE}/.well-known/agent-card.json)
- [x402 service manifest](${GITHUB}/blob/main/bankr.x402.json)

## For humans

${services.map((s) => `- [${s.id} on the site](${SITE}/#${s.id})`).join("\n")}
- [Source code](${GITHUB})

## Rules for agents

- Results are general information, not legal advice. Always pass the disclaimer on.
- Never send social security numbers, bank details or other secrets.
- Validate inputs before paying; a 400 is unpaid, a 502 is unpaid, a 200 is final.
`,
);

// ---------- openapi.json ----------
const paths = {};
for (const s of services) {
  const op = {
    operationId: s.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    summary: s.description.replace(/^Rent Relief Bot: /, ""),
    description: `Costs $${s.price} USDC per call via x402 (HTTP 402 challenge, USDC TransferWithAuthorization on Base, chain 8453). Pay with \`bankr x402 call\` or any x402 v2 client.`,
    "x-x402": { price: s.price, currency: "USDC", network: "eip155:8453", scheme: "exact" },
    responses: {
      200: { description: "Result", content: { "application/json": { schema: s.output } } },
      400: { description: "Invalid input (not charged)", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      402: { description: "Payment required. The `payment-required` header carries the x402 v2 requirements." },
      502: { description: "Upstream model failure (not charged). Retry once." },
    },
  };
  if (s.method === "GET") {
    op.parameters = Object.entries(s.input.properties ?? {}).map(([name, sch]) => ({
      name,
      in: "query",
      required: (s.input.required ?? []).includes(name),
      schema: { type: sch.type, enum: sch.enum },
      description: sch.description,
    }));
    paths[`/${s.id}`] = { get: op };
  } else {
    op.requestBody = { required: true, content: { "application/json": { schema: s.input, example: examples[s.id] } } };
    paths[`/${s.id}`] = { post: op };
  }
}
write(
  "web/public/openapi.json",
  JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "Rent Relief Bot",
        version: "1.0.0",
        summary: "Pay-per-call tenant tools on Base via x402.",
        description: "Rent-increase, repair and deposit letters; lease-clause red flags; state tenant rights. Each call is paid in USDC through the x402 protocol; there is no API key. Informational only, not legal advice.",
        license: { name: "MIT", url: `${GITHUB}/blob/main/LICENSE` },
        contact: { url: SITE },
      },
      externalDocs: { url: `${SITE}/skill.md`, description: "Agent skill with usage guidance" },
      servers: [{ url: API, description: "Bankr x402 endpoints (Base mainnet)" }],
      paths,
    },
    null,
    2,
  ) + "\n",
);

// ---------- agent card ----------
write(
  "web/public/.well-known/agent-card.json",
  JSON.stringify(
    {
      name: "Rent Relief Bot",
      description: "Pay-per-call tenant tools: landlord letters, lease-clause red flags, state tenant rights. USDC on Base via x402.",
      url: SITE,
      version: "1.0.0",
      documentationUrl: `${SITE}/skill.md`,
      provider: { organization: "Rent Relief Bot (open source)", url: GITHUB },
      capabilities: { streaming: false, pushNotifications: false },
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      skills: services.map((s) => ({
        id: s.id,
        name: s.id,
        description: s.description.replace(/^Rent Relief Bot: /, ""),
        tags: ["tenant", "housing", "x402"],
        examples: [curlFor(s)],
      })),
      "x-x402": { baseUrl: API, network: "eip155:8453", currency: "USDC", openapi: `${SITE}/openapi.json` },
    },
    null,
    2,
  ) + "\n",
);
