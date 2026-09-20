import { useState } from "react";
import { SERVICES, US_STATES, type DecodeOut } from "../../lib/services";
import { usePaidCall } from "../../hooks/usePaidCall";
import { Field, Select, TextArea } from "../ui";
import { PayButton } from "../PayButton";
import { DecodeResult } from "../results/DecodeResult";
import { Placeholder } from "./RentLetterForm";

const svc = SERVICES["notice-decoder"];
const MIN = 40;
const MAX = 12000;

export function NoticeDecoderForm() {
  const [notice, setNotice] = useState("");
  const [state, setState] = useState("");
  const { state: call, run, reset, busy } = usePaidCall<DecodeOut>(svc);

  const len = notice.trim().length;
  const tooShort = len > 0 && len < MIN;
  const tooLong = notice.length > MAX;
  const valid = len >= MIN && !tooLong && !!state;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <fieldset disabled={busy} className="space-y-4">
        <Field
          label="Paste what they sent you"
          hint={`${notice.length.toLocaleString()}/${MAX.toLocaleString()} characters. A letter, an email, a text message, a court paper. Leave out account numbers.`}
          error={tooShort ? `At least ${MIN} characters.` : tooLong ? `Too long, max ${MAX.toLocaleString()} characters.` : undefined}
        >
          <TextArea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            className="min-h-48"
            placeholder="hey its mike the landlord. u still havent paid for this month. if i dont have it by friday im changing the locks…"
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
          One call to Jev, TypeSafe's System One model: what kind of notice, how urgent, and whether it threatens something a landlord can't
          do. Typed decisions with a confidence, not generated text.
        </p>
        <PayButton svc={svc} label="Decode it" runningLabel="Decoding…" state={call} formValid={valid} onRun={() => void run({ notice: notice.trim(), state })} onReset={reset} />
      </fieldset>
      <div>
        {call.status === "result" ? (
          <DecodeResult data={call.data} txHash={call.txHash} />
        ) : (
          <Placeholder
            title="The verdict appears here"
            lines={["What kind of notice this is and how urgent.", "Red flags: lockout threats, retaliation, missing basics.", "What it means, what to do next, which tool to use."]}
          />
        )}
      </div>
    </div>
  );
}
