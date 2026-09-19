/**
 * tenant-rights — Rent Relief Bot x402 service (GET).
 *
 * Quick summary of tenant protections for a US state on one topic.
 *   GET ?state=CA&topic=deposit
 *
 * Env: LLM_GATEWAY_KEY (required), LLM_MODEL (optional, default claude-haiku-4.5).
 */

const GATEWAY = "https://llm.bankr.bot/v1/chat/completions";
const TOPICS = [
  "deposit", "rent_increase", "eviction", "repairs", "entry", "lease_break", "late_fees", "retaliation",
] as const;

const SYSTEM_PROMPT = `You are Rent Relief Bot. Summarise the tenant protections that generally apply
in the given US state for the given topic. Be accurate about the *type* of rule (notice periods,
deadlines, caps, remedies) and say "varies by city" where local ordinances commonly override state
law. Do not invent statute numbers; if you are unsure of a specific number, give the typical range
and say to verify. Output ONLY a raw JSON object, no code fences, no prose, with the keys:
  "summary": string (2-4 sentences),
  "key_rules": string[] (3-7 bullets),
  "common_landlord_violations": string[] (2-4 bullets),
  "where_to_get_help": string[] (2-3 bullets: type of agency or organisation, not URLs),
  "confidence": "high" | "medium" | "low",
  "disclaimer": string (one sentence: informational, not legal advice, verify current law).`;

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return bad("GET required", 405);

  const url = new URL(req.url);
  const state = (url.searchParams.get("state") ?? "").trim();
  const topic = (url.searchParams.get("topic") ?? "").trim() as (typeof TOPICS)[number];

  if (!state || state.length > 40) return bad("state query param is required (e.g. CA or California)");
  if (!TOPICS.includes(topic)) return bad(`topic must be one of ${TOPICS.join(", ")}`);

  const apiKey = process.env.LLM_GATEWAY_KEY;
  if (!apiKey) return bad("Service misconfigured: LLM_GATEWAY_KEY not set", 500);

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "claude-haiku-4.5",
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `State: ${state}\nTopic: ${topic}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return bad(`LLM gateway error ${res.status}: ${text.slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let parsed: unknown;
  try {
    parsed = extractJson(data.choices?.[0]?.message?.content ?? "");
  } catch {
    return bad("LLM returned non-JSON output; retry", 502);
  }

  return Response.json({
    ...(parsed as object),
    state,
    topic,
    generated_at: new Date().toISOString(),
    powered_by: "Rent Relief Bot ($RRB on Base)",
  });
}
