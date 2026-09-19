import { useState } from "react";
import { SERVICES, TOPICS, TOPIC_LABELS, US_STATES, type RightsOut } from "../../lib/services";
import { usePaidCall } from "../../hooks/usePaidCall";
import { Field, Select } from "../ui";
import { PayButton } from "../PayButton";
import { RightsResult } from "../results/RightsResult";
import { Placeholder } from "./RentLetterForm";

const svc = SERVICES["tenant-rights"];

export function TenantRightsForm() {
  const [state, setState] = useState("");
  const [topic, setTopic] = useState("deposit");
  const { state: call, run, reset, busy } = usePaidCall<RightsOut>(svc);
  const valid = !!state && !!topic;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <fieldset disabled={busy} className="space-y-4">
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
          <Field label="Topic">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {TOPIC_LABELS[t] ?? t}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-slate-500">
          Cities often add stronger rules on top of state law. The answer says where that is common.
        </p>
        <PayButton svc={svc} label="Show my rights" state={call} formValid={valid} onRun={() => void run({ state, topic })} onReset={reset} />
      </fieldset>
      <div>
        {call.status === "result" ? (
          <RightsResult data={call.data} txHash={call.txHash} />
        ) : (
          <Placeholder
            title="The summary appears here"
            lines={["Key rules: notice periods, deadlines, caps, remedies.", "What landlords most often get wrong.", "Who to call for help."]}
          />
        )}
      </div>
    </div>
  );
}
