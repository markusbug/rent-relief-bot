/**
 * lease-scan — Rent Relief Bot x402 service (POST).
 *
 * Scans a whole residential lease and ranks the clauses a tenant should look at
 * before signing. No text generation: every clause is classified by Jev, TypeSafe's
 * System One model, which returns typed decisions with calibrated confidence and
 * cannot hallucinate. Explanations and negotiation asks are fixed text keyed by flag.
 *
 * Jev is reached through OpenRouter's Decisions API, which takes the same body as
 * TypeSafe's own endpoint (state + typed questions) and returns the same answers.
 *
 * Env: OPENROUTER_API_KEY (required), JEV_MODEL (optional, default ~typesafe/jev-latest),
 *      JEV_API_URL (optional, for local stubs).
 */

const JEV_URL = process.env.JEV_API_URL ?? "https://openrouter.ai/api/alpha/decisions";
const MODEL = process.env.JEV_MODEL ?? "~typesafe/jev-latest";
const SITE = "https://rentrelief.markushaas.com";

const MIN_CHARS = 200;
const MAX_CHARS = 60_000;
const MAX_CLAUSES = 120;
const CONCURRENCY = 8;
const FLAG_THRESHOLD = 0.6;
const MAX_FINDINGS = 25;

// ---------- what Jev is asked, per clause ----------

const TOPICS: Record<string, string> = {
  rent_and_fees: "Rent amount, due dates, late fees, other charges",
  deposit: "Security deposit, move-in fees, what is refundable",
  repairs_and_maintenance: "Who fixes what, habitability, condition of the unit",
  entry_and_privacy: "When and how the landlord may enter",
  term_renewal_termination: "Lease length, renewal, notice to leave, early termination, holdover",
  use_and_rules: "Occupants, guests, pets, smoking, noise, alterations, subletting",
  liability_and_legal: "Waivers, indemnity, attorney's fees, arbitration, jury waiver, remedies",
  utilities_and_services: "Utilities, parking, storage, amenities and who pays",
  other: "Anything else: signatures, definitions, boilerplate",
};

const RISK_LEVELS = [
  "Standard, balanced language a tenant would expect in any lease",
  "Slightly landlord-favourable but common and low impact",
  "Notably one-sided; shifts a real cost, obligation or risk onto the tenant",
  "Removes a protection tenants normally have, or exposes the tenant to a large or open-ended cost",
  "Lets the landlord punish, lock out, charge or remove the tenant without limit or legal process",
];
const RISK_LABELS = ["standard", "minor", "one-sided", "serious", "severe"] as const;

interface FlagDef {
  label: string;
  instructions: string; // a yes/no question; Jev answers questions far more reliably than statements
  yes: string;
  no: string;
  why: string;
  ask: string;
}

const FLAGS: Record<string, FlagDef> = {
  waives_rights: {
    label: "Waives a legal right",
    instructions:
      "Does this clause contain explicit waiver language, where the tenant 'waives', 'releases', 'agrees not to sue', gives up a jury trial, or agrees to arbitration instead of court?",
    yes: "Yes, the tenant expressly waives or releases a right or claim, or gives up court or jury",
    no: "No explicit waiver or release language, even if the clause is otherwise unfavourable",
    why: "Many tenant protections cannot be waived by contract, so this language is often unenforceable, but it discourages tenants from asserting their rights.",
    ask: "Strike the waiver, or limit it to claims the tenant knowingly releases in writing at the time.",
  },
  tenant_repairs: {
    label: "Tenant pays for repairs",
    instructions:
      "Does this clause make the tenant responsible for repairs or maintenance beyond damage the tenant causes, for example structural, plumbing, electrical, appliance or HVAC repairs, or 'all repairs'?",
    yes: "Yes, the tenant must pay for or perform repairs beyond their own damage",
    no: "No, tenant duties are limited to their own damage or minor upkeep, or the clause is about something else",
    why: "Keeping the unit habitable is normally the landlord's duty. This shifts an open-ended cost onto the tenant.",
    ask: "Limit tenant responsibility to damage caused by the tenant or guests, and to minor upkeep like light bulbs and filters.",
  },
  nonrefundable: {
    label: "Non-refundable deposit or fee",
    instructions:
      "Does this clause describe a deposit or fee as non-refundable, or let the landlord keep the deposit for reasons other than unpaid rent or damage beyond normal wear and tear?",
    yes: "Yes, money is non-refundable or the landlord may keep the deposit for broad or discretionary reasons",
    no: "No, the deposit is refundable with normal deductions, or the clause is about something else",
    why: "Security deposits are refundable by default in most states, and normal wear and tear cannot be charged to the tenant.",
    ask: "Make the deposit refundable, list the exact deductions allowed, and set a return deadline.",
  },
  entry_no_notice: {
    label: "Entry without notice",
    instructions:
      "Does this clause let the landlord enter the unit without advance notice, at any time, or for any reason, outside genuine emergencies?",
    yes: "Yes, entry is allowed without notice or at any time for non-emergencies",
    no: "No, notice is required for non-emergencies, or the clause is about something else",
    why: "Most states require reasonable notice, typically 24 hours, and entry at reasonable times except in emergencies.",
    ask: "Require at least 24 hours written notice and entry only at reasonable hours, except emergencies.",
  },
  auto_renew: {
    label: "Automatic renewal or long notice",
    instructions:
      "Does this clause make the lease renew automatically for another full term, or require the tenant to give more than a month's notice to avoid renewal or leave at the end of the term?",
    yes: "Yes, it auto-renews for a full term or needs more than 30 days' notice",
    no: "No, it ends or goes month-to-month with normal notice, or the clause is about something else",
    why: "Missing a notice window can lock the tenant into another year or trigger penalties.",
    ask: "Convert to month-to-month at the end of the term, or shorten the notice period to 30 days.",
  },
  fees_penalties: {
    label: "Penalty-style fees",
    instructions:
      "Does this clause impose a late fee, penalty or charge that is a large flat amount, grows daily, stacks with other fees, or is described as a penalty rather than a reasonable estimate of the landlord's cost?",
    yes: "Yes, there is a penalty-style or daily-accruing fee",
    no: "No fee, or a modest fee with a grace period, or the clause is about something else",
    why: "Fees that punish rather than cover actual cost are capped or unenforceable in many states.",
    ask: "Cap late fees at a small percentage of rent with a grace period, and remove daily accrual.",
  },
  unilateral_change: {
    label: "Landlord can change terms",
    instructions:
      "Does this clause let the landlord change rules, rent, fees or other terms during the lease at their own discretion, or make documents that are referenced but not attached binding?",
    yes: "Yes, the landlord can change terms or costs unilaterally, or unseen documents bind the tenant",
    no: "No, terms are fixed for the lease term, or the clause is about something else",
    why: "A lease is supposed to fix the terms for its length. This lets the landlord move the goalposts.",
    ask: "Freeze rent and fees for the term, and require written mutual agreement for any rule change that affects cost or use.",
  },
  one_sided_legal: {
    label: "One-sided legal terms",
    instructions:
      "Does this clause make attorney's fees, indemnification or liability apply to the tenant only, or require the tenant to indemnify the landlord even for the landlord's own negligence?",
    yes: "Yes, legal costs or liability fall on the tenant only, or cover the landlord's own negligence",
    no: "No, the terms are mutual or limited, or the clause is about something else",
    why: "One-way fee shifting and broad indemnity make it expensive for the tenant to enforce the lease and cheap for the landlord to ignore it.",
    ask: "Make attorney's fees mutual (prevailing party) and exclude the landlord's own negligence from any indemnity.",
  },
  early_termination: {
    label: "Costly early exit",
    instructions:
      "Does this clause make leaving early cost the tenant more than rent until the unit is re-rented, for example the whole remaining term, a large fixed fee, forfeiting the deposit, or no duty for the landlord to re-rent?",
    yes: "Yes, early exit costs more than rent until re-rental, or the landlord need not re-rent",
    no: "No, or there is a reasonable fixed buyout, or the clause is about something else",
    why: "Most states require the landlord to try to re-rent and limit what a departing tenant owes.",
    ask: "Add a fixed early-termination option (for example two months' rent) and a duty to mitigate.",
  },
  self_help: {
    label: "Lockout or removal without court",
    instructions:
      "Does this clause let the landlord change the locks, remove belongings, shut off utilities, or otherwise remove the tenant or their property without a court order?",
    yes: "Yes, the clause allows at least one of these without a court order",
    no: "No, it does not, or it requires the legal eviction process first",
    why: "Self-help eviction is illegal in nearly every state; only a court can remove a tenant.",
    ask: "Strike the clause entirely. Removal must follow the legal eviction process.",
  },
};

const QUESTIONS = {
  topic: { type: "choice", instructions: "Which part of the lease does this clause mainly cover?", criteria: TOPICS },
  risk: { type: "score", instructions: "How tenant-unfavourable is this clause, judged only from its text?", criteria: RISK_LEVELS },
  ...Object.fromEntries(
    Object.entries(FLAGS).map(([id, f]) => [id, { type: "noul", instructions: f.instructions, criteria: { true: f.yes, false: f.no } }]),
  ),
};

// ---------- clause splitting ----------

const HEADING = /^\s*(?:\d{1,3}(?:\.\d{1,2})*[.)]?\s+|[A-Z][A-Z\s'&/-]{3,}:|(?:ARTICLE|SECTION|Section|Clause)\s+\w+)/;

function splitClauses(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];
  const flush = () => {
    const t = cur.join(" ").replace(/\s+/g, " ").trim();
    if (t) blocks.push(t);
    cur = [];
  };
  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (HEADING.test(line) && cur.length) flush();
    cur.push(line.trim());
  }
  flush();

  // Merge fragments too short to judge on their own into the next block.
  const merged: string[] = [];
  let carry = "";
  for (const b of blocks) {
    const t = carry ? `${carry} ${b}` : b;
    if (t.length < 80) {
      carry = t;
      continue;
    }
    merged.push(t);
    carry = "";
  }
  if (carry) {
    if (merged.length) merged[merged.length - 1] += ` ${carry}`;
    else merged.push(carry);
  }

  // Split anything very long at sentence boundaries so each call stays focused.
  const out: string[] = [];
  for (const m of merged) {
    if (m.length <= 1800) {
      out.push(m);
      continue;
    }
    let chunk = "";
    for (const s of m.split(/(?<=[.;:])\s+/)) {
      if ((chunk + " " + s).length > 1500 && chunk) {
        out.push(chunk.trim());
        chunk = s;
      } else chunk += " " + s;
    }
    if (chunk.trim()) out.push(chunk.trim());
  }

  // Cap the count by merging neighbours, so cost and latency stay bounded.
  while (out.length > MAX_CLAUSES) {
    const next: string[] = [];
    for (let i = 0; i < out.length; i += 2) next.push(out[i + 1] ? `${out[i]} ${out[i + 1]}` : out[i]);
    out.splice(0, out.length, ...next);
  }
  return out;
}

// ---------- Jev ----------

interface JevAnswers {
  topic?: { choice: string; confidence: number };
  risk?: { score: number; confidence: number };
  [flag: string]: { noul?: number; score?: number; choice?: string; confidence?: number } | undefined;
}

async function askJev(apiKey: string, state: unknown, attempt = 0): Promise<JevAnswers> {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": SITE,
      "x-title": "Rent Relief Bot",
    },
    body: JSON.stringify({ model: MODEL, state, questions: QUESTIONS }),
    signal: AbortSignal.timeout(15_000),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    return askJev(apiKey, state, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { answers?: JevAnswers };
  if (!data.answers) throw new Error("Jev returned no answers");
  return data.answers;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ---------- handler ----------

function bad(msg: string, status = 400): Response {
  return Response.json({ error: msg }, { status });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("POST required", 405);

  let body: { lease?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Body must be JSON");
  }
  if (typeof body.lease !== "string" || body.lease.trim().length < MIN_CHARS) {
    return bad(`lease must be the lease text, at least ${MIN_CHARS} characters`);
  }
  if (body.lease.length > MAX_CHARS) return bad(`lease too long (max ${MAX_CHARS} chars)`);
  if (typeof body.state !== "string" || !body.state.trim()) return bad("state is required");
  const state = body.state.trim().toUpperCase().slice(0, 20);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return bad("Service misconfigured: OPENROUTER_API_KEY not set", 500);

  const clauses = splitClauses(body.lease);
  if (clauses.length === 0) return bad("could not find any clauses in the text");

  let answers: JevAnswers[];
  try {
    answers = await mapLimit(clauses, CONCURRENCY, (clause, i) =>
      askJev(apiKey, { us_state: state, clause_number: i + 1, of: clauses.length, clause }),
    );
  } catch (e) {
    return bad(`Scan failed: ${(e as Error).message}`, 502);
  }

  const topics: Record<string, number> = {};
  const findings = clauses
    .map((clause, i) => {
      const a = answers[i];
      const topic = a.topic?.choice ?? "other";
      topics[topic] = (topics[topic] ?? 0) + 1;
      const risk = Math.max(0, Math.min(4, Math.round(a.risk?.score ?? 0)));
      const flags = Object.entries(FLAGS)
        .map(([id, f]) => ({ id, label: f.label, probability: Number((a[id]?.noul ?? 0).toFixed(2)), why: f.why, ask: f.ask }))
        .filter((f) => f.probability >= FLAG_THRESHOLD)
        .sort((x, y) => y.probability - x.probability);
      return {
        clause_number: i + 1,
        topic,
        risk,
        risk_label: RISK_LABELS[risk],
        confidence: Number((a.risk?.confidence ?? 0).toFixed(2)),
        flags,
        excerpt: clause.length > 600 ? clause.slice(0, 597).trimEnd() + "…" : clause,
      };
    })
    .filter((f) => f.risk >= 2 || f.flags.length > 0)
    .sort((x, y) => y.risk - x.risk || y.flags.length - x.flags.length || y.confidence - x.confidence)
    .slice(0, MAX_FINDINGS);

  const serious = findings.filter((f) => f.risk >= 3).length;
  const overall =
    findings.length === 0
      ? `Scanned ${clauses.length} clauses and found nothing unusual. Standard lease language throughout.`
      : `Scanned ${clauses.length} clauses. ${findings.length} need a closer look${serious ? `, ${serious} of them serious` : ""}.`;

  return Response.json({
    summary: { clauses_scanned: clauses.length, flagged: findings.length, serious, topics, overall },
    findings,
    next_step:
      findings.length > 0
        ? "Paste the worst clauses into Lease clause check for a state-specific plain-English breakdown, and ask for the edits listed before you sign."
        : "Nothing to negotiate from the text alone. Check your state's rules on deposits and notice with Tenant rights.",
    disclaimer: "Automated scan of the lease text for general information. Not legal advice; laws vary by state and city.",
    state,
    model: MODEL,
    generated_at: new Date().toISOString(),
    powered_by: "Rent Relief Bot",
  });
}
