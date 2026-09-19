import { useState } from "react";
import { SERVICES, US_STATES, type ClauseOut } from "../../lib/services";
import { usePaidCall } from "../../hooks/usePaidCall";
import { Field, Input, Select, TextArea } from "../ui";
import { PayButton } from "../PayButton";
import { ClauseResult } from "../results/ClauseResult";
import { Placeholder } from "./RentLetterForm";

const svc = SERVICES["lease-clause"];

export function LeaseClauseForm() {
  const [clause, setClause] = useState("");
  const [state, setState] = useState("");
  const [context, setContext] = useState("");
  const { state: call, run, reset, busy } = usePaidCall<ClauseOut>(svc);

  const len = clause.trim().length;
  const tooShort = len > 0 && len < 20;
  const tooLong = clause.length > 6000;
  const valid = len >= 20 && !tooLong && !!state;

  const submit = () => {
    const input: Record<string, unknown> = { clause: clause.trim(), state };
    if (context.trim()) input.context = context.trim();
    void run(input);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <fieldset disabled={busy} className="space-y-4">
        <Field
          label="Paste the clause"
          hint={`${clause.length}/6000 characters. One clause or section at a time works best.`}
          error={tooShort ? "At least 20 characters." : tooLong ? "Too long, max 6000 characters." : undefined}
        >
          <TextArea
            value={clause}
            onChange={(e) => setClause(e.target.value)}
            className="min-h-40"
            placeholder="Tenant shall be responsible for all repairs and maintenance of the premises, including but not limited to plumbing, electrical, and appliances, regardless of cause…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State">
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Context" hint="Optional">
            <Input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Signing next week, 12-month lease" />
          </Field>
        </div>
        <PayButton svc={svc} label="Check this clause" state={call} formValid={valid} onRun={submit} onReset={reset} />
      </fieldset>
      <div>
        {call.status === "result" ? (
          <ClauseResult data={call.data} txHash={call.txHash} />
        ) : (
          <Placeholder
            title="The breakdown appears here"
            lines={["What the clause actually lets the landlord do.", "Red flags ranked by severity.", "Specific edits you can ask for before signing."]}
          />
        )}
      </div>
    </div>
  );
}
