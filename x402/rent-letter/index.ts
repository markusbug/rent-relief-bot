/**
 * rent-letter — Rent Relief Bot x402 service (POST).
 *
 * Generates a formal tenant letter: rent-increase negotiation, repair demand,
 * or security-deposit return request. Paid per request in USDC via x402.
 *
 * Env (set with `bankr x402 env set KEY=VALUE`):
 *   LLM_GATEWAY_KEY   Bankr API key with LLM gateway enabled and credits loaded.
 *   LLM_MODEL       Optional. Defaults to claude-sonnet-5.
 */

const GATEWAY = "https://llm.bankr.bot/v1/chat/completions";
const LETTER_TYPES = ["rent_increase", "repair_request", "deposit_return"] as const;
type LetterType = (typeof LETTER_TYPES)[number];

interface LetterInput {
  letter_type: LetterType;
  tenant_name: string;
  landlord_name: string;
  property_address: string;
  state: string;
  details: string;
  current_rent?: number;
  proposed_rent?: number;
  lease_start?: string;
  tone?: "firm" | "cooperative";
}

const SYSTEM_PROMPT = `You are Rent Relief Bot, a tenant-advocacy writing assistant.
Write letters a tenant can send to a landlord. Be precise, professional and non-threatening.
Cite the general category of tenant protection that applies in the given US state (for example
"habitability warranty", "notice period for rent increases", "deposit return deadline") without
inventing specific statute numbers. Never claim to be a lawyer. Never fabricate dates or facts
that were not supplied. Output ONLY a raw JSON object, no code fences, no prose, with the keys:
  "subject": string,
  "letter": string (the full letter body, ready to send, with placeholders in [BRACKETS] only where the tenant must fill in something you were not given),
  "key_points": string[] (3-6 bullets summarising the leverage the tenant has),
  "next_steps": string[] (2-4 concrete follow-up actions),
  "disclaimer": string (one sentence: informational, not legal advice).`;

/** Pull the first JSON object out of model output, tolerating ```json fences and prose. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("no JSON object in output");
  }
}

function bad(msg: string, status = 400): Response {
  return Response.json({ error: msg }, { status });
}

function buildUserPrompt(i: LetterInput): string {
  const lines = [
    `Letter type: ${i.letter_type}`,
    `Tenant: ${i.tenant_name}`,
    `Landlord / property manager: ${i.landlord_name}`,
    `Property address: ${i.property_address}`,
    `State: ${i.state}`,
    `Tone: ${i.tone ?? "firm"}`,
  ];
  if (i.current_rent != null) lines.push(`Current monthly rent: $${i.current_rent}`);
  if (i.proposed_rent != null) lines.push(`Proposed monthly rent: $${i.proposed_rent}`);
  if (i.lease_start) lines.push(`Lease start date: ${i.lease_start}`);
  lines.push(`Situation described by the tenant:\n${i.details}`);
  lines.push(`Today's date: ${new Date().toISOString().slice(0, 10)}`);
  return lines.join("\n");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("POST required", 405);

  let body: Partial<LetterInput>;
  try {
    body = (await req.json()) as Partial<LetterInput>;
  } catch {
    return bad("Body must be JSON");
  }

  const required: (keyof LetterInput)[] = [
    "letter_type", "tenant_name", "landlord_name", "property_address", "state", "details",
  ];
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string") return bad(`Missing or invalid field: ${k}`);
  }
  if (!LETTER_TYPES.includes(body.letter_type as LetterType)) {
    return bad(`letter_type must be one of ${LETTER_TYPES.join(", ")}`);
  }
  if ((body.details as string).length > 4000) return bad("details too long (max 4000 chars)");
  if (body.tone && body.tone !== "firm" && body.tone !== "cooperative") {
    return bad("tone must be 'firm' or 'cooperative'");
  }

  const apiKey = process.env.LLM_GATEWAY_KEY;
  if (!apiKey) return bad("Service misconfigured: LLM_GATEWAY_KEY not set", 500);

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "claude-sonnet-5",
      temperature: 0.4,
      max_tokens: 1800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body as LetterInput) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return bad(`LLM gateway error ${res.status}: ${text.slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch {
    return bad("LLM returned non-JSON output; retry", 502);
  }

  return Response.json({
    ...(parsed as object),
    letter_type: body.letter_type,
    generated_at: new Date().toISOString(),
    powered_by: "Rent Relief Bot",
  });
}
