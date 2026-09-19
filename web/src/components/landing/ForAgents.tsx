import { siteConfig } from "../../site.config";
import { SERVICE_LIST } from "../../lib/services";
import { formatPrice } from "../../lib/format";
import { CopyButton, SectionTitle } from "../ui";

export function ForAgents() {
  const example = `bankr x402 call ${SERVICES_URL("tenant-rights")}?state=CA&topic=deposit`;
  return (
    <section id="agents" className="scroll-mt-20 py-14">
      <SectionTitle
        kicker="For agents"
        title="Same tools, same prices, no UI needed"
        sub="Every tool is a plain x402 endpoint on the Bankr marketplace. Any x402 client can call it: pay the 402, get JSON back."
      />
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {SERVICE_LIST.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-white">{s.id}</td>
                <td className="px-4 py-3 text-slate-300">{s.method}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(s.price)} USDC</td>
                <td className="px-4 py-3">
                  <code className="break-all font-mono text-[11px] text-slate-400">{s.url}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <code className="break-all font-mono text-xs text-brand-200">{example}</code>
        <CopyButton text={example} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Input and output schemas are published with each endpoint. See{" "}
        <a className="underline" href={`${siteConfig.githubUrl}/blob/main/bankr.x402.json`} target="_blank" rel="noreferrer">
          bankr.x402.json
        </a>{" "}
        in the repo.
      </p>
    </section>
  );
}

function SERVICES_URL(id: string) {
  return SERVICE_LIST.find((s) => s.id === id)?.url ?? "";
}
