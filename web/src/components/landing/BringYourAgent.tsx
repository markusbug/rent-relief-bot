import { useState } from "react";
import { siteConfig } from "../../site.config";
import { SERVICE_LIST } from "../../lib/services";
import { formatPrice } from "../../lib/format";
import { Card, CopyButton, SectionTitle } from "../ui";

const host = new URL(siteConfig.siteUrl).host;

const ROUTES = [
  {
    id: "any",
    label: "Any agent",
    blurb: "Claude, ChatGPT, Gemini, a custom agent: anything that can read a URL.",
    prompt: `Read ${siteConfig.siteUrl}/llms.txt and help me with my landlord problem.`,
  },
  {
    id: "claude",
    label: "Claude Code / Cursor / OpenClaw",
    blurb: "Installs the skill from this domain. The agent then knows when and how to call the tools.",
    prompt: `npx skills add ${host}`,
  },
  {
    id: "bankr",
    label: "Bankr agent",
    blurb: "Bankr agents pay from the user's Bankr wallet, so the whole flow stays in chat.",
    prompt: `install the skill at ${siteConfig.githubUrl}/tree/main/skills/rent-relief-bot`,
  },
  {
    id: "x402",
    label: "x402 client",
    blurb: "Call the endpoints directly. Pay the 402, get JSON back.",
    prompt: `bankr x402 call "${SERVICE_LIST[2].url}?state=CA&topic=deposit"`,
  },
];

export function BringYourAgent() {
  const [active, setActive] = useState(ROUTES[0]);
  return (
    <section id="agents" className="scroll-mt-20 py-14">
      <SectionTitle
        kicker="Bring your own agent"
        title={`Point any AI agent at ${host}`}
        sub="Most tools make you come to them. Rent Relief Bot goes where your agent already is: the domain publishes a skill, an OpenAPI description and llms.txt, and every tool is a plain x402 endpoint your agent can pay for itself."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-2">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActive(r)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                active.id === r.id ? "border-brand-400 bg-brand-500/10" : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="text-sm font-semibold text-white">{r.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{r.blurb}</div>
            </button>
          ))}
        </div>
        <Card className="flex flex-col justify-between">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Paste this</div>
            <pre className="whitespace-pre-wrap break-all rounded-xl bg-slate-900/70 p-4 font-mono text-sm text-brand-200">{active.prompt}</pre>
            <div className="mt-3 flex items-center gap-2">
              <CopyButton text={active.prompt} label="Copy" />
              <span className="text-xs text-slate-500">Your agent asks you the questions, quotes the price, and pays per call.</span>
            </div>
          </div>
          <div className="mt-6 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
            <a className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/25" href="/llms.txt" target="_blank" rel="noreferrer">
              <span className="font-mono text-slate-200">/llms.txt</span> · plain-language guide
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/25" href="/skill.md" target="_blank" rel="noreferrer">
              <span className="font-mono text-slate-200">/skill.md</span> · agent skill
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/25" href="/openapi.json" target="_blank" rel="noreferrer">
              <span className="font-mono text-slate-200">/openapi.json</span> · schemas
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/25" href="/.well-known/agent-card.json" target="_blank" rel="noreferrer">
              <span className="font-mono text-slate-200">/.well-known/agent-card.json</span>
            </a>
          </div>
        </Card>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Price</th>
              <th className="hidden px-4 py-3 md:table-cell">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {SERVICE_LIST.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-white">{s.id}</td>
                <td className="px-4 py-3 text-slate-300">{s.method}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(s.price)} USDC</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <code className="break-all font-mono text-[11px] text-slate-400">{s.url}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        No API keys. Payment is the authentication. Schemas and prices come from{" "}
        <a className="underline" href={`${siteConfig.githubUrl}/blob/main/bankr.x402.json`} target="_blank" rel="noreferrer">
          bankr.x402.json
        </a>
        .
      </p>
    </section>
  );
}
