/**
 * lease-clause — Rent Relief Bot x402 service (POST).
 *
 * Explains a lease clause in plain English, flags red flags, and says what
 * the tenant can push back on. Paid per request in USDC via x402.
 *
 * Env: LLM_GATEWAY_KEY (required), LLM_MODEL (optional, default claude-sonnet-5).
 */

const GATEWAY = "https://llm.bankr.bot/v1/chat/completions";

const SYSTEM_PROMPT = `You are Rent Relief Bot, a tenant-advocacy assistant.
Given a clause from a residential lease and the US state, explain it in plain English for a
tenant with no legal background. Be concrete about what it lets the landlord do and what it
obliges the tenant to do. Flag terms that are commonly unenforceable or heavily tenant-unfavourable
in that state, but describe the protection category rather than inventing statute numbers.
Output ONLY a raw JSON object, no code fences, no prose, with the keys:
  "plain_english": string (2-5 sentences),
  "what_it_means_for_you": string[] (2-5 bullets),
  "red_flags": { "severity": "low" | "medium" | "high", "issue": string, "why": string }[],
  "negotiation_asks": string[] (0-4 specific edits the tenant could request),
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("POST required", 405);

  let body: { clause?: unknown; state?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Body must be JSON");
  }

  if (typeof body.clause !== "string" || body.clause.trim().length < 20) {
    return bad("clause must be a string of at least 20 characters");
  }
  if (body.clause.length > 6000) return bad("clause too long (max 6000 chars)");
  if (typeof body.state !== "string" || !body.state.trim()) return bad("state is required");
  if (body.context != null && typeof body.context !== "string") return bad("context must be a string");

  const apiKey = process.env.LLM_GATEWAY_KEY;
  if (!apiKey) return bad("Service misconfigured: LLM_GATEWAY_KEY not set", 500);

  const userPrompt = [
    `State: ${body.state}`,
    body.context ? `Extra context from tenant: ${body.context}` : "",
    `Lease clause:\n"""\n${body.clause}\n"""`,
  ].filter(Boolean).join("\n\n");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "claude-sonnet-5",
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
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
    state: body.state,
    generated_at: new Date().toISOString(),
    powered_by: "Rent Relief Bot ($RRB on Base)",
  });
}
