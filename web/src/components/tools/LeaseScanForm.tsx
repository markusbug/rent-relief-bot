import { useState } from "react";
import { SERVICES, US_STATES, type ScanOut } from "../../lib/services";
import { usePaidCall } from "../../hooks/usePaidCall";
import { Field, Select, TextArea } from "../ui";
import { PayButton } from "../PayButton";
import { ScanResult } from "../results/ScanResult";
import { Placeholder } from "./RentLetterForm";

const svc = SERVICES["lease-scan"];
const MIN = 200;
const MAX = 60000;

export function LeaseScanForm() {
  const [lease, setLease] = useState("");
  const [state, setState] = useState("");
  const { state: call, run, reset, busy } = usePaidCall<ScanOut>(svc);

  const len = lease.trim().length;
  const tooShort = len > 0 && len < MIN;
  const tooLong = lease.length > MAX;
  const valid = len >= MIN && !tooLong && !!state;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <fieldset disabled={busy} className="space-y-4">
        <Field
          label="Paste the whole lease"
          hint={`${lease.length.toLocaleString()}/${MAX.toLocaleString()} characters. Plain text is fine; the scan splits it into clauses itself.`}
          error={tooShort ? `At least ${MIN} characters.` : tooLong ? `Too long, max ${MAX.toLocaleString()} characters.` : undefined}
        >
          <TextArea
            value={lease}
            onChange={(e) => setLease(e.target.value)}
            className="min-h-72 font-mono text-xs"
            placeholder={"RESIDENTIAL LEASE AGREEMENT\n\n1. PARTIES. This Lease is between…\n2. TERM. …\n3. RENT. …"}
          />
        </Field>
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
        <p className="text-xs text-slate-500">
          Every clause is classified by Jev, TypeSafe's System One model. It returns typed decisions with a confidence, not text, so it
          cannot invent a law or a statute number. Explanations are fixed per flag.
        </p>
        <PayButton
          svc={svc}
          label="Scan my lease"
          runningLabel="Scanning…"
          state={call}
          formValid={valid}
          onRun={() => void run({ lease: lease.trim(), state })}
          onReset={reset}
        />
      </fieldset>
      <div>
        {call.status === "result" ? (
          <ScanResult data={call.data} txHash={call.txHash} />
        ) : (
          <Placeholder
            title="The ranked list appears here"
            lines={[
              "Every clause scored from standard to severe.",
              "Flags like lockout without court, waived rights, penalty fees.",
              "What to ask for on each one before you sign.",
            ]}
          />
        )}
      </div>
    </div>
  );
}
