import { siteConfig } from "../../site.config";
import { SERVICE_LIST } from "../../lib/services";
import { formatPrice } from "../../lib/format";

export function Hero() {
  return (
    <section id="top" className="pt-14 pb-10 sm:pt-20 sm:pb-14">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live on Base · pay per call · open source
      </div>
      <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
        Your landlord has a lawyer. <span className="text-brand-400">Now you have a bot.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-400">{siteConfig.tagline} Pay a few cents in USDC for exactly what you use.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {SERVICE_LIST.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-400/50 hover:bg-white/[0.05]"
          >
            <div className="flex items-baseline justify-between">
              <div className="font-semibold text-white">{s.title}</div>
              <div className="text-sm font-semibold text-brand-300">{formatPrice(s.price)}</div>
            </div>
            <div className="mt-1 text-sm text-slate-400">{s.short}</div>
            <div className="mt-3 text-xs text-brand-400 opacity-0 transition group-hover:opacity-100">Open →</div>
          </a>
        ))}
      </div>
    </section>
  );
}
