import { SERVICES, type DecodeOut } from "../../lib/services";
import { Badge, Card } from "../ui";
import { Footnote } from "./LetterResult";

const urgencyTone = { urgent: "red", high: "red", medium: "amber", low: "gray" } as const;

export function DecodeResult({ data, txHash }: { data: DecodeOut; txHash?: string }) {
  const next = SERVICES[data.next_tool.id];
  const { dates, amounts, day_counts } = data.mentions;
  const hasMentions = dates.length + amounts.length + day_counts.length > 0;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={urgencyTone[data.urgency_label]}>{data.urgency_label} urgency</Badge>
          <span className="text-xs text-slate-500">{Math.round(data.kind_confidence * 100)}% sure</span>
        </div>
        <h4 className="mt-2 text-xl font-bold text-white">{data.kind_label}</h4>
        {data.alternatives.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Could also be: {data.alternatives.map((a) => `${a.label} (${Math.round(a.probability * 100)}%)`).join(", ")}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{data.what_it_means}</p>
      </Card>
      {data.get_help_now && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <strong className="font-semibold">Get help today.</strong> {data.get_help_now}
        </div>
      )}
      {data.flags.length > 0 && (
        <Card>
          <h4 className="mb-3 text-sm font-semibold text-white">Red flags</h4>
          <ul className="space-y-2">
            {data.flags.map((f) => (
              <li key={f.id} className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
                <div className="text-sm font-medium text-white">
                  {f.label} <span className="font-normal text-slate-500">({Math.round(f.probability * 100)}%)</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{f.why}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {hasMentions && (
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Mentioned in the text</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {dates.map((d) => (
              <span key={`d${d}`} className="rounded-lg bg-slate-900/70 px-2 py-1 text-slate-300">📅 {d}</span>
            ))}
            {day_counts.map((d) => (
              <span key={`c${d}`} className="rounded-lg bg-slate-900/70 px-2 py-1 text-slate-300">⏳ {d}</span>
            ))}
            {amounts.map((a) => (
              <span key={`a${a}`} className="rounded-lg bg-slate-900/70 px-2 py-1 text-slate-300">💵 {a}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Pulled straight from the text, not interpreted. Check the dates against your state's notice rules.</p>
        </Card>
      )}
      <Card>
        <h4 className="mb-1 text-sm font-semibold text-white">Do next</h4>
        <p className="text-sm text-slate-300">{data.do_next}</p>
        <a href={`#${next.id}`} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brand-400">
          Open {next.title} →
        </a>
      </Card>
      <Footnote disclaimer={data.disclaimer} txHash={txHash} />
    </div>
  );
}
