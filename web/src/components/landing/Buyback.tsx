import { siteConfig } from "../../site.config";
import { Button, CopyButton, SectionTitle } from "../ui";

export function Buyback() {
  return (
    <section id="rrb" className="scroll-mt-20 py-14">
      <SectionTitle
        kicker="Where the money goes"
        title="Tool revenue buys back $RRB"
        sub="What tenants and agents pay for these tools is swapped into $RRB on Base by an hourly, open-source job. Only the revenue from the tools: nothing else in the wallet is touched."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3"><span className="text-brand-400">1.</span> Tenants and AI agents pay USDC per call.</li>
              <li className="flex gap-3"><span className="text-brand-400">2.</span> Every hour, a public GitHub Action reads what the tools have earned so far.</li>
              <li className="flex gap-3"><span className="text-brand-400">3.</span> Whatever has not been recycled yet is swapped into $RRB, and the running total is committed to the repository.</li>
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              The swap script, the workflow and the ledger live in the repository with no hidden logic.{" "}
              <a href={siteConfig.buybackLedgerUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200">
                See the ledger
              </a>
              .
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
                <Button type="button">Open in Bankr</Button>
              </a>
              <a href={siteConfig.explorerToken(siteConfig.rrbAddress)} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline">Basescan</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">Token on Base. Not an investment recommendation. Prices go down as well as up.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <iframe
            src={siteConfig.buyRrbUrl}
            title="Buy $RRB on Bankr"
            loading="lazy"
            allow="clipboard-write; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[1120px] w-full"
          />
          <p className="border-t border-white/5 px-4 py-2 text-xs text-slate-500">
            Wallet not connecting inside the frame?{" "}
            <a href={siteConfig.buyRrbUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200">
              Open the trade page in a new tab
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
