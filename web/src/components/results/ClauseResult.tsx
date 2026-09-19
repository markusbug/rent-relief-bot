import type { ClauseOut } from "../../lib/services";
import { Badge, Card, List } from "../ui";
import { Footnote } from "./LetterResult";

const tone = { high: "red", medium: "amber", low: "gray" } as const;

export function ClauseResult({ data, txHash }: { data: ClauseOut; txHash?: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <h4 className="mb-2 text-sm font-semibold text-white">In plain English</h4>
        <p className="text-sm leading-relaxed text-slate-200">{data.plain_english}</p>
      </Card>
      <Card>
        <h4 className="mb-2 text-sm font-semibold text-white">What it means for you</h4>
        <List items={data.what_it_means_for_you} />
      </Card>
      <Card>
        <h4 className="mb-3 text-sm font-semibold text-white">Red flags</h4>
        {data.red_flags.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing unusual for {data.state}. Standard language.</p>
        ) : (
          <ul className="space-y-3">
            {data.red_flags.map((f, i) => (
              <li key={i} className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={tone[f.severity] ?? "gray"}>{f.severity}</Badge>
                  <span className="text-sm font-medium text-white">{f.issue}</span>
                </div>
                <p className="text-sm text-slate-400">{f.why}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {data.negotiation_asks.length > 0 && (
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Ask for these edits</h4>
          <List items={data.negotiation_asks} />
        </Card>
      )}
      <Footnote disclaimer={data.disclaimer} txHash={txHash} />
    </div>
  );
}
