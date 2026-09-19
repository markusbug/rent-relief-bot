import { siteConfig } from "../../site.config";
import { Button, CopyButton, SectionTitle } from "../ui";

export function Flywheel() {
  return (
    <section id="rrb" className="scroll-mt-20 py-14">
      <SectionTitle
        kicker="The flywheel"
        title="Every dollar buys back $RRB"
        sub="Rent Relief Bot is funded by its own token. Revenue does not sit in a treasury: an hourly, open-source job turns it into buys on Base."
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex gap-3"><span className="text-brand-400">1.</span> Tenants and AI agents pay USDC per call.</li>
            <li className="flex gap-3"><span className="text-brand-400">2.</span> USDC lands in the project wallet on Base.</li>
            <li className="flex gap-3"><span className="text-brand-400">3.</span> A public GitHub Action swaps it into $RRB every hour.</li>
            <li className="flex gap-3"><span className="text-brand-400">4.</span> Those swaps generate creator fees, which get claimed and swapped too.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-500">
            Buybacks are visible on-chain. The workflow file and the swap script live in the repository with no hidden logic.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-400/30 bg-brand-500/5 p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">Rent Relief Bot</div>
          <div className="mt-1 text-3xl font-black text-white">${siteConfig.rrbSymbol}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-slate-900/70 px-2 py-1 font-mono text-[11px] text-slate-300 break-all">{siteConfig.rrbAddress}</code>
            <CopyButton text={siteConfig.rrbAddress} label="Copy" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={siteConfig.buyRrbUrl} target="_blank" rel="noreferrer">
              <Button type="button">Buy $RRB</Button>
            </a>
            <a href={siteConfig.explorerToken(siteConfig.rrbAddress)} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline">Basescan</Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">Token on Base. Not an investment recommendation. Prices go down as well as up.</p>
        </div>
      </div>
    </section>
  );
}
