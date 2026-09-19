import type { LetterOut } from "../../lib/services";
import { siteConfig } from "../../site.config";
import { Card, CopyButton, List } from "../ui";

export function LetterResult({ data, txHash }: { data: LetterOut; txHash?: string }) {
  const full = `Subject: ${data.subject}\n\n${data.letter}`;
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Subject</div>
            <div className="font-semibold text-white">{data.subject}</div>
          </div>
          <CopyButton text={full} label="Copy letter" />
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-slate-900/70 p-4 font-sans text-sm leading-relaxed text-slate-200">{data.letter}</pre>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Your leverage</h4>
          <List items={data.key_points} />
        </Card>
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Next steps</h4>
          <List items={data.next_steps} />
        </Card>
      </div>
      <Footnote disclaimer={data.disclaimer} txHash={txHash} />
    </div>
  );
}

export function Footnote({ disclaimer, txHash }: { disclaimer: string; txHash?: string }) {
  return (
    <p className="text-xs text-slate-500">
      {disclaimer}
      {txHash && (
        <>
          {" "}
          <a className="underline" href={siteConfig.explorerTx(txHash)} target="_blank" rel="noreferrer">
            View payment
          </a>
        </>
      )}
    </p>
  );
}
