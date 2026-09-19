import { SectionTitle } from "../ui";

const STEPS = [
  { t: "Connect a wallet on Base", d: "MetaMask, Rabby, Coinbase Wallet or any browser wallet. No account, no email, nothing to remember." },
  { t: "Sign one USDC authorization", d: "Your wallet shows the exact price. It is a signature, not a transaction, so you never pay gas." },
  { t: "Get the answer in seconds", d: "The endpoint verifies the payment, runs the tool, and returns a result you can copy and use today." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 py-14">
      <SectionTitle kicker="How it works" title="Pay per call, keep your data" sub="Built on x402, the open HTTP payments standard. The site is static and holds no keys. Your text goes to the tool, gets answered, and is not stored." />
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-300">{i + 1}</div>
            <div className="font-semibold text-white">{s.t}</div>
            <p className="mt-1 text-sm text-slate-400">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
