import { useState } from "react";
import { LETTER_TYPES, LETTER_TYPE_LABELS, SERVICES, US_STATES, type LetterOut } from "../../lib/services";
import { usePaidCall } from "../../hooks/usePaidCall";
import { Field, Input, Select, TextArea } from "../ui";
import { PayButton } from "../PayButton";
import { LetterResult } from "../results/LetterResult";

const svc = SERVICES["rent-letter"];

export function RentLetterForm() {
  const [f, setF] = useState({
    letter_type: "rent_increase",
    tenant_name: "",
    landlord_name: "",
    property_address: "",
    state: "",
    details: "",
    current_rent: "",
    proposed_rent: "",
    lease_start: "",
    tone: "firm",
  });
  const { state, run, reset, busy } = usePaidCall<LetterOut>(svc);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const detailsTooLong = f.details.length > 4000;
  const valid =
    !!f.tenant_name.trim() && !!f.landlord_name.trim() && !!f.property_address.trim() && !!f.state && f.details.trim().length >= 20 && !detailsTooLong;

  const submit = () => {
    const input: Record<string, unknown> = {
      letter_type: f.letter_type,
      tenant_name: f.tenant_name.trim(),
      landlord_name: f.landlord_name.trim(),
      property_address: f.property_address.trim(),
      state: f.state,
      details: f.details.trim(),
      tone: f.tone,
    };
    if (f.current_rent) input.current_rent = Number(f.current_rent);
    if (f.proposed_rent) input.proposed_rent = Number(f.proposed_rent);
    if (f.lease_start) input.lease_start = f.lease_start;
    void run(input);
  };

  const isIncrease = f.letter_type === "rent_increase";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <fieldset disabled={busy} className="space-y-4">
        <Field label="What do you need?">
          <Select value={f.letter_type} onChange={set("letter_type")}>
            {LETTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {LETTER_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input value={f.tenant_name} onChange={set("tenant_name")} placeholder="Sam Lee" autoComplete="name" />
          </Field>
          <Field label="Landlord or property manager">
            <Input value={f.landlord_name} onChange={set("landlord_name")} placeholder="Acme Property Management" />
          </Field>
        </div>
        <Field label="Rental address">
          <Input value={f.property_address} onChange={set("property_address")} placeholder="12 Elm St, Apt 4, Oakland" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="State">
            <Select value={f.state} onChange={set("state")}>
              <option value="">Select</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Current rent ($/mo)" hint="Optional">
            <Input type="number" min={0} inputMode="numeric" value={f.current_rent} onChange={set("current_rent")} placeholder="2100" />
          </Field>
          {isIncrease ? (
            <Field label="Proposed rent ($/mo)" hint="Optional">
              <Input type="number" min={0} inputMode="numeric" value={f.proposed_rent} onChange={set("proposed_rent")} placeholder="2500" />
            </Field>
          ) : (
            <Field label="Lease start" hint="Optional">
              <Input type="date" value={f.lease_start} onChange={set("lease_start")} />
            </Field>
          )}
        </div>
        <Field
          label="What happened?"
          hint={`${f.details.length}/4000. Dates, what was said, what you want. Skip SSNs and account numbers.`}
          error={detailsTooLong ? "Too long, max 4000 characters." : undefined}
        >
          <TextArea
            value={f.details}
            onChange={set("details")}
            placeholder="Got a notice on Sept 3 raising rent from $2,100 to $2,500 starting Oct 1. Month-to-month, lived here 3 years, never late…"
          />
        </Field>
        <Field label="Tone">
          <Select value={f.tone} onChange={set("tone")}>
            <option value="firm">Firm</option>
            <option value="cooperative">Cooperative</option>
          </Select>
        </Field>
        <PayButton svc={svc} label="Write my letter" state={state} formValid={valid} onRun={submit} onReset={reset} />
      </fieldset>
      <div>
        {state.status === "result" ? (
          <LetterResult data={state.data} txHash={state.txHash} />
        ) : (
          <Placeholder
            title="Your letter appears here"
            lines={["A subject line and a full letter you can paste into an email.", "Your leverage in bullets.", "What to do after you send it."]}
          />
        )}
      </div>
    </div>
  );
}

export function Placeholder({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex h-full min-h-48 flex-col justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
      <div className="mb-2 text-sm font-semibold text-slate-300">{title}</div>
      <ul className="space-y-1 text-xs text-slate-500">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
