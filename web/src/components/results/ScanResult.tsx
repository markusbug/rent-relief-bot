import { SCAN_TOPIC_LABELS, type ScanOut } from "../../lib/services";
import { Badge, Card } from "../ui";
import { Footnote } from "./LetterResult";

const tone = { severe: "red", serious: "red", "one-sided": "amber", minor: "gray", standard: "gray" } as const;

export function ScanResult({ data, txHash }: { data: ScanOut; txHash?: string }) {
  const { summary, findings } = data;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Clauses" value={summary.clauses_scanned} />
          <Stat label="Need a look" value={summary.flagged} tone={summary.flagged ? "amber" : "gray"} />
          <Stat label="Serious" value={summary.serious} tone={summary.serious ? "red" : "gray"} />
        </div>
        <p className="mt-4 text-sm text-slate-200">{summary.overall}</p>
      </Card>
      {findings.length > 0 && (
        <Card>
          <h4 className="mb-3 text-sm font-semibold text-white">Worst first</h4>
          <ol className="space-y-3">
            {findings.map((f) => (
              <li key={f.clause_number} className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone={tone[f.risk_label]}>{f.risk_label}</Badge>
                  <span className="text-xs text-slate-400">
                    Clause {f.clause_number} · {SCAN_TOPIC_LABELS[f.topic] ?? f.topic} · {Math.round(f.confidence * 100)}% sure
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{f.excerpt}</p>
                {f.flags.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {f.flags.map((fl) => (
                      <li key={fl.id} className="rounded-lg border border-white/5 bg-slate-950/60 p-2.5 text-xs">
                        <div className="font-medium text-white">
                          {fl.label} <span className="font-normal text-slate-500">({Math.round(fl.probability * 100)}%)</span>
                        </div>
                        <p className="mt-1 text-slate-400">{fl.why}</p>
                        <p className="mt-1 text-brand-300">Ask: {fl.ask}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card>
        <h4 className="mb-1 text-sm font-semibold text-white">Next step</h4>
        <p className="text-sm text-slate-300">{data.next_step}</p>
      </Card>
      <Footnote disclaimer={data.disclaimer} txHash={txHash} />
    </div>
  );
}

function Stat({ label, value, tone = "gray" }: { label: string; value: number; tone?: "gray" | "amber" | "red" }) {
  const color = tone === "red" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
