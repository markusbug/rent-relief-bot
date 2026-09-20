#!/usr/bin/env node
// Local stand-in for OpenRouter's Decisions API (Jev). Same request and response
// shape, keyword heuristics instead of a model. Only for exercising lease-scan offline:
//   node scripts/jev-stub.mjs                 # listens on :8788
//   OPENROUTER_API_KEY=x JEV_API_URL=http://localhost:8788/api/alpha/decisions npm run dev
import { createServer } from "node:http";

const KEYWORDS = {
  waives_rights: /waiv|releas|hold harmless|jury|arbitrat/i,
  tenant_repairs: /tenant (shall|is|will be) responsible for (all )?(repairs|maintenance)|regardless of cause/i,
  nonrefundable: /non-?refundable|forfeit/i,
  entry_no_notice: /enter .{0,40}(without|at any time|any reason)/i,
  auto_renew: /automatic(ally)? renew|renew(s|al) .{0,30}(unless|automatic)|(60|90) days.{0,20}notice/i,
  fees_penalties: /per day|penalt|\$\d{2,} (late|fee)/i,
  unilateral_change: /(landlord|owner) (may|reserves the right to) (change|modify|amend|increase)/i,
  one_sided_legal: /indemnif|attorney'?s? fees/i,
  early_termination: /remainder of the (term|lease)|entire (remaining|balance)|no (duty|obligation) to (re-?let|mitigate)/i,
  self_help: /change the locks|remove .{0,30}(belongings|property)|shut ?off|disconnect utilit/i,
};
const TOPIC_KW = [
  ["deposit", /deposit/i],
  ["repairs_and_maintenance", /repair|maintain|habitab/i],
  ["entry_and_privacy", /enter|entry|access/i],
  ["term_renewal_termination", /renew|terminat|vacate|holdover|notice to/i],
  ["rent_and_fees", /rent|fee|late/i],
  ["liability_and_legal", /indemn|liab|attorney|waiv|jury/i],
  ["use_and_rules", /pet|guest|smok|sublet|occup|alter/i],
  ["utilities_and_services", /utilit|parking|electric|water/i],
];

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { res.writeHead(400); return res.end("{}"); }
  const text = typeof body.state === "string" ? body.state : JSON.stringify(body.state);
  const answers = {};
  let hits = 0;
  for (const [name, q] of Object.entries(body.questions ?? {})) {
    if (q.type === "noul") {
      const hit = KEYWORDS[name]?.test(text) ?? false;
      if (hit) hits++;
      answers[name] = { type: "noul", noul: hit ? 0.9 : 0.05 };
    }
  }
  for (const [name, q] of Object.entries(body.questions ?? {})) {
    if (q.type === "choice") {
      const choice = (TOPIC_KW.find(([, re]) => re.test(text)) ?? ["other"])[0];
      answers[name] = { type: "choice", choice, confidence: 0.8, probabilities: { [choice]: 0.8 } };
    } else if (q.type === "score") {
      const score = Math.min(4, hits === 0 ? 0 : hits + 1);
      answers[name] = { type: "score", score, confidence: 0.75, probabilities: { [score]: 0.75 } };
    }
  }
  await new Promise((r) => setTimeout(r, 120));
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ model: "jev-stub", answers, usage: { input_tokens: Math.ceil(text.length / 4), output_tokens: 0 } }));
}).listen(Number(process.env.PORT ?? 8788), () => console.log("jev stub on http://localhost:8788/api/alpha/decisions"));
