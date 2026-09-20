/**
 * notice-decoder — Rent Relief Bot x402 service (POST).
 *
 * Paste anything a landlord sent you. One Jev call classifies what it is, how urgent
 * it is, and whether it threatens something landlords generally cannot do, then the
 * handler maps that to fixed guidance and the Rent Relief Bot tool to use next.
 * No text generation: Jev (TypeSafe's System One model, via OpenRouter's Decisions
 * API) returns typed decisions with calibrated confidence.
 *
 * Env: OPENROUTER_API_KEY (required), JEV_MODEL (optional, default ~typesafe/jev-latest),
 *      JEV_API_URL (optional, for local stubs).
 */

const JEV_URL = process.env.JEV_API_URL ?? "https://openrouter.ai/api/alpha/decisions";
const MODEL = process.env.JEV_MODEL ?? "~typesafe/jev-latest";
const SITE = "https://rentrelief.markushaas.com";

const MIN_CHARS = 40;
const MAX_CHARS = 12_000;
const FLAG_THRESHOLD = 0.6;

// ---------- what Jev is asked ----------

interface KindDef {
  criteria: string;
  label: string;
  means: string;
  next: string;
  tool: { id: "rent-letter" | "tenant-rights" | "lease-clause" | "lease-scan"; input: Record<string, string> };
}

const KINDS: Record<string, KindDef> = {
  rent_increase: {
    criteria: "Announces a higher rent from a future date",
    label: "Rent increase notice",
    means: "The landlord wants more rent from the date stated. Whether they can depends on your lease term, how much notice they gave, and local rent rules.",
    next: "Check the notice period and any local cap, then answer in writing before the effective date. A counter-offer often works.",
    tool: { id: "rent-letter", input: { letter_type: "rent_increase" } },
  },
  pay_or_quit: {
    criteria: "Demands unpaid rent or money by a deadline, or the tenant must leave",
    label: "Pay-or-quit notice",
    means: "This is usually the first formal step before an eviction filing. The deadline matters.",
    next: "Do not ignore it. If you can pay, pay and keep proof. If the amount is wrong or you have a defense, write back before the deadline and contact legal aid today.",
    tool: { id: "tenant-rights", input: { topic: "eviction" } },
  },
  cure_or_quit: {
    criteria: "Says the tenant broke a lease rule and must fix it by a deadline or leave",
    label: "Cure-or-quit notice",
    means: "The landlord claims a lease violation and gives you a window to fix it. Fixing it in time usually ends the matter.",
    next: "Fix the issue if you can and confirm in writing with photos or receipts. If you disagree, say so in writing before the deadline.",
    tool: { id: "tenant-rights", input: { topic: "eviction" } },
  },
  termination_or_nonrenewal: {
    criteria: "Ends the tenancy on a date without alleging non-payment or a violation, or declines to renew",
    label: "Termination or non-renewal notice",
    means: "The landlord wants the unit back at the end of a period. Many states and cities require a minimum notice period and, in some places, a stated reason.",
    next: "Count the days of notice against your state's minimum. If it falls short or you suspect retaliation, push back in writing.",
    tool: { id: "tenant-rights", input: { topic: "lease_break" } },
  },
  court_filing: {
    criteria: "A court summons, complaint, unlawful detainer, or hearing date",
    label: "Court filing",
    means: "An eviction case has been filed. There is a short, hard deadline to respond or you can lose by default.",
    next: "Contact legal aid or a tenant union today and file a response before the deadline on the document. This is beyond what a letter can fix.",
    tool: { id: "tenant-rights", input: { topic: "eviction" } },
  },
  entry_notice: {
    criteria: "Says the landlord or a contractor will enter the unit at a given time",
    label: "Entry notice",
    means: "The landlord wants access. Most states require reasonable notice, a reasonable time, and a legitimate purpose.",
    next: "If the notice or timing is unreasonable, propose another time in writing. You do not have to be present for a proper entry.",
    tool: { id: "tenant-rights", input: { topic: "entry" } },
  },
  fee_or_charge: {
    criteria: "Bills the tenant for a late fee, damage, utilities, or another charge (not a rent increase)",
    label: "Fee or charge",
    means: "The landlord is asking for money beyond rent. Late fees are capped in many states, and damage charges must be for more than normal wear and tear.",
    next: "Ask for an itemised breakdown in writing before paying anything you dispute.",
    tool: { id: "tenant-rights", input: { topic: "late_fees" } },
  },
  deposit_statement: {
    criteria: "A move-out statement listing deductions from the security deposit",
    label: "Deposit deduction statement",
    means: "The landlord is keeping some or all of your deposit. Deductions must be itemised, sent within a deadline, and cannot cover normal wear and tear.",
    next: "Compare each deduction with your move-in and move-out photos, then demand the disputed amount in writing.",
    tool: { id: "rent-letter", input: { letter_type: "deposit_return" } },
  },
  repair_or_maintenance: {
    criteria: "About repairs, inspections, pests, or the condition of the unit, from either side",
    label: "Repair or maintenance notice",
    means: "Habitability is the landlord's responsibility. Repair requests should be answered within a reasonable time.",
    next: "Keep everything in writing with dates and photos. If a request has been ignored, send a formal repair demand.",
    tool: { id: "rent-letter", input: { letter_type: "repair_request" } },
  },
  renewal_offer: {
    criteria: "Offers a new lease or renewal terms for the tenant to sign",
    label: "Renewal offer",
    means: "You are being asked to sign new terms. Everything is negotiable before you sign.",
    next: "Scan the new lease before signing. Compare the rent and any new clauses to your current lease.",
    tool: { id: "lease-scan", input: {} },
  },
  warning_or_rules: {
    criteria: "A complaint or warning about conduct, noise, guests, pets, or rules, with no deadline to leave",
    label: "Warning or rules notice",
    means: "The landlord is documenting a complaint. It is not an eviction notice, but it may be used as one later.",
    next: "Reply briefly in writing with your side, and keep a copy. Do not ignore it.",
    tool: { id: "tenant-rights", input: { topic: "retaliation" } },
  },
  other: {
    criteria: "Anything else: general information, building announcements, marketing, or not from a landlord at all",
    label: "General notice",
    means: "This does not look like a notice that requires action from you.",
    next: "Keep it with your lease paperwork.",
    tool: { id: "tenant-rights", input: {} },
  },
};

const URGENCY = [
  "Informational, nothing for the tenant to do",
  "Respond within a few weeks",
  "Respond within days, a deadline is stated or implied",
  "Immediate: a legal deadline, court date, or threat of losing the home within days",
];
const URGENCY_LABELS = ["low", "medium", "high", "urgent"] as const;

interface FlagDef {
  label: string;
  instructions: string;
  yes: string;
  no: string;
  why: string;
}

const FLAGS: Record<string, FlagDef> = {
  self_help_threat: {
    label: "Threatens lockout or shutoff",
    instructions:
      "Does the notice threaten to change the locks, remove the tenant's belongings, shut off utilities, or remove the tenant without going through court?",
    yes: "Yes, it threatens at least one of these without a court process",
    no: "No such threat, or it refers to a court process",
    why: "Self-help eviction is illegal in nearly every state. Only a court can remove a tenant.",
  },
  retaliation_signal: {
    label: "Possible retaliation",
    instructions:
      "Does the notice mention the tenant's complaints, repair requests, code enforcement, tenant organising, or a lawsuit as a reason or context for the action?",
    yes: "Yes, the action is linked to the tenant asserting their rights",
    no: "No link to complaints or requests by the tenant",
    why: "Many states forbid rent increases, terminations, or service cuts in retaliation for a tenant exercising a legal right.",
  },
  deadline_stated: {
    label: "Hard deadline stated",
    instructions: "Does the notice state a specific date or number of days by which the tenant must pay, act, respond, or leave?",
    yes: "Yes, a specific date or day count is stated",
    no: "No specific deadline",
    why: "Missing a stated deadline can forfeit rights or trigger the next step, so note the date now.",
  },
  demands_money: {
    label: "Demands money",
    instructions: "Does the notice ask the tenant to pay a specific amount of money?",
    yes: "Yes, a payment is demanded",
    no: "No payment demanded",
    why: "Before paying a disputed amount, ask for an itemised breakdown in writing.",
  },
  informal_or_unsigned: {
    label: "Informal or unsigned",
    instructions:
      "Is this a text message, chat message, or a note with no date, no sender name, or no address, rather than a formal written notice?",
    yes: "Yes, it is informal or missing basics like a date, sender, or address",
    no: "No, it reads like a formal written notice with the basics present",
    why: "Many notices must be in writing with specific contents to be valid. An informal message may not start any legal clock.",
  },
  not_from_landlord: {
    label: "Not clearly from the landlord",
    instructions: "Is the sender someone other than the landlord, property manager, their agent, attorney, or a court?",
    yes: "Yes, the sender is unclear or is someone else",
    no: "No, it is from the landlord side or a court",
    why: "Verify who sent this before acting on it or paying anyone.",
  },
};

const QUESTIONS = {
  kind: {
    type: "choice",
    instructions: "What kind of notice is this, judged by what it asks the tenant to do?",
    criteria: Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.criteria])),
  },
  urgency: { type: "score", instructions: "How urgently does the tenant need to act on this notice?", criteria: URGENCY },
  ...Object.fromEntries(
    Object.entries(FLAGS).map(([id, f]) => [id, { type: "noul", instructions: f.instructions, criteria: { true: f.yes, false: f.no } }]),
  ),
};

// ---------- deterministic extraction ----------

const MONTHS = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*";
const DATE_RE = new RegExp(
  `\\b(?:${MONTHS}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\.?(?:,?\\s+\\d{4})?|\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{4}-\\d{2}-\\d{2})\\b`,
  "gi",
);
const MONEY_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars)\b/gi;
const DAYS_RE = /\b(\d{1,3})[- ]?(?:calendar |business )?days?\b/gi;

function unique(list: string[], max = 8): string[] {
  return [...new Set(list.map((s) => s.trim()))].slice(0, max);
}

// ---------- Jev ----------

async function askJev(apiKey: string, state: unknown, attempt = 0): Promise<Record<string, any>> {
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
  const data = (await res.json()) as { answers?: Record<string, any> };
  if (!data.answers) throw new Error("Jev returned no answers");
  return data.answers;
}

// ---------- handler ----------

function bad(msg: string, status = 400): Response {
  return Response.json({ error: msg }, { status });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("POST required", 405);

  let body: { notice?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Body must be JSON");
  }
  if (typeof body.notice !== "string" || body.notice.trim().length < MIN_CHARS) {
    return bad(`notice must be the text you received, at least ${MIN_CHARS} characters`);
  }
  if (body.notice.length > MAX_CHARS) return bad(`notice too long (max ${MAX_CHARS} chars)`);
  if (typeof body.state !== "string" || !body.state.trim()) return bad("state is required");
  const state = body.state.trim().toUpperCase().slice(0, 20);
  const notice = body.notice.trim();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return bad("Service misconfigured: OPENROUTER_API_KEY not set", 500);

  let a: Record<string, any>;
  try {
    a = await askJev(apiKey, { us_state: state, notice });
  } catch (e) {
    return bad(`Decode failed: ${(e as Error).message}`, 502);
  }

  const kindId = (a.kind?.choice as string) in KINDS ? (a.kind.choice as string) : "other";
  const kind = KINDS[kindId];
  const urgency = Math.max(0, Math.min(3, Math.round(a.urgency?.score ?? 0)));
  const flags = Object.entries(FLAGS)
    .map(([id, f]) => ({ id, label: f.label, probability: Number((a[id]?.noul ?? 0).toFixed(2)), why: f.why }))
    .filter((f) => f.probability >= FLAG_THRESHOLD)
    .sort((x, y) => y.probability - x.probability);

  const alternatives = Object.entries((a.kind?.probabilities ?? {}) as Record<string, number>)
    .filter(([k, p]) => k !== kindId && p >= 0.15)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([k, p]) => ({ kind: k, label: KINDS[k]?.label ?? k, probability: Number(p.toFixed(2)) }));

  const escalate = kindId === "court_filing" || urgency >= 3 || flags.some((f) => f.id === "self_help_threat");

  return Response.json({
    kind: kindId,
    kind_label: kind.label,
    kind_confidence: Number((a.kind?.confidence ?? 0).toFixed(2)),
    alternatives,
    urgency,
    urgency_label: URGENCY_LABELS[urgency],
    urgency_confidence: Number((a.urgency?.confidence ?? 0).toFixed(2)),
    flags,
    what_it_means: kind.means,
    do_next: kind.next,
    get_help_now: escalate
      ? "This one needs a human today: contact your local legal aid office or tenant union. Search '<your city> tenant legal aid'."
      : null,
    mentions: {
      dates: unique(notice.match(DATE_RE) ?? []),
      amounts: unique(notice.match(MONEY_RE) ?? []),
      day_counts: unique([...notice.matchAll(DAYS_RE)].map((m) => `${m[1]} days`), 4),
    },
    next_tool: {
      id: kind.tool.id,
      input: { state, ...kind.tool.input },
      url: `${SITE}/#${kind.tool.id}`,
    },
    disclaimer: "Automated classification of the text for general information. Not legal advice; laws vary by state and city.",
    state,
    model: MODEL,
    generated_at: new Date().toISOString(),
    powered_by: "Rent Relief Bot",
  });
}
