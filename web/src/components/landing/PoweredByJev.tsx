import { siteConfig } from "../../site.config";
import { SectionTitle } from "../ui";

const POINTS = [
  {
    t: "It can't make up a law",
    d: "Jev doesn't generate text. It answers typed questions about each clause with a probability and a confidence. There is no sentence for a statute number to appear in.",
  },
  {
    t: "Whole lease in about a second",
    d: "Every clause is a 70 to 500 ms decision, run in parallel. A 40-clause lease comes back ranked before a chat model would finish its first paragraph.",
  },
  {
    t: "Ten flags, one score, per clause",
    d: "Lockout without court, waived rights, penalty fees, tenant pays repairs, auto-renewal, entry without notice, and more, plus a 0 to 4 risk score. Your code, not a prompt, decides what to show.",
  },
  {
    t: "Cents, not dollars",
    d: "Input is $0.042 per million tokens and output is free. A whole lease costs about two cents to scan, so the $0.50 price is honest margin, not a subsidy.",
  },
];

export function PoweredByJev() {
  return (
    <section id="jev" className="scroll-mt-20 py-14">
      <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-transparent to-brand-500/5 p-6 sm:p-8">
        <SectionTitle
          kicker="Powered by Jev"
          title="The lease scan runs on a model that doesn't talk"
          sub="Jev is TypeSafe's System One model: state in, typed decisions out. We were early to put it in front of tenants. The letter tools still write with Claude; the scan asks Jev."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div key={p.t} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="font-semibold text-white">{p.t}</div>
              <p className="mt-1 text-sm text-slate-400">{p.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <a href="#lease-scan" className="rounded-xl bg-violet-500 px-4 py-2.5 font-semibold text-white hover:bg-violet-400">
            Scan a lease with Jev
          </a>
          <a href={siteConfig.jevUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white">
            ~typesafe/jev-latest on OpenRouter →
          </a>
          <a href={siteConfig.typesafeUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white">
            typesafe.ai →
          </a>
          <a href={`${siteConfig.githubUrl}/blob/main/x402/lease-scan/index.ts`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white">
            The questions we ask it →
          </a>
        </div>
      </div>
    </section>
  );
}
