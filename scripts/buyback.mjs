#!/usr/bin/env node
// Recycles x402 endpoint revenue into RRB. Nothing else in the wallet is touched:
// creator fees, WETH, and any USDC beyond what the endpoints earned stay where they are.
//
//   earned    all-time net revenue across the deployed endpoints (Bankr API)
//   recycled  running total already swapped, kept in scripts/buyback-state.json
//   swap      min(earned - recycled, USDC balance - USDC_RESERVE, MAX_SWAP_USD)
//
// The workflow commits the state file after a successful swap, so the ledger is the git log.
//
//   DRY_RUN=1 node scripts/buyback.mjs           # print what it would do
//   node scripts/buyback.mjs                     # execute
//
// Env:
//   BANKR_API_KEY      Bankr key (falls back to ~/.bankr/config.json from `bankr login`)
//   RRB_ADDRESS        token to buy (default: Rent Relief Bot on Base)
//   USDC_RESERVE       USDC to always leave in the wallet (default 1)
//   MAX_SWAP_USD       cap per run (default 400)
//   MIN_SWAP_USD       skip swaps smaller than this (default 2)
//   DRY_RUN            "1" to only print

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RRB = process.env.RRB_ADDRESS || "0xc66b29249edffe9c436fdb0ca4e8bfbbe9affba3";
const USDC_RESERVE = Number(process.env.USDC_RESERVE || 1);
const MAX_SWAP_USD = Number(process.env.MAX_SWAP_USD || 400);
const MIN_SWAP_USD = Number(process.env.MIN_SWAP_USD || 2);
const DRY_RUN = process.env.DRY_RUN === "1";

const STATE_FILE = join(dirname(fileURLToPath(import.meta.url)), "buyback-state.json");

const log = (...a) => console.log(new Date().toISOString(), ...a);
const round = (n) => Math.round(n * 1e6) / 1e6;

function bankr(args, { json = false } = {}) {
  const out = execFileSync("bankr", ["--ni", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return json ? JSON.parse(out) : out;
}

function bankrConfig() {
  const file = process.env.BANKR_CONFIG || join(homedir(), ".bankr", "config.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

async function api(path) {
  const cfg = bankrConfig();
  const key = process.env.BANKR_API_KEY || cfg.apiKey;
  if (!key) throw new Error("no Bankr API key: set BANKR_API_KEY or run `bankr login`");
  const base = process.env.BANKR_API_URL || cfg.apiUrl || "https://api.bankr.bot";
  const res = await fetch(`${base}${path}`, { headers: { "X-API-Key": key } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// All-time net revenue (after Bankr's cut) summed over every deployed endpoint.
async function earnedUsd() {
  const { endpoints = [] } = await api("/x402/endpoints");
  let total = 0;
  for (const ep of endpoints) {
    const { revenue } = await api(`/x402/endpoints/revenue/${ep.name}`);
    const all = revenue?.allTime ?? { totalUsd: 0, bankrFeesUsd: 0, requests: 0 };
    const net = (all.totalUsd ?? 0) - (all.bankrFeesUsd ?? 0);
    log(`  ${ep.name.padEnd(14)} ${String(all.requests ?? 0).padStart(5)} reqs  $${net.toFixed(2)}`);
    total += net;
  }
  return round(total);
}

function readState() {
  if (!existsSync(STATE_FILE)) return { recycledUsd: 0, runs: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}

function usdcBalance() {
  const portfolio = bankr(["wallet", "portfolio", "--chain", "base", "--json", "--low-value"], { json: true });
  const entries = portfolio?.balances?.base?.tokenBalances ?? [];
  const hit = entries.find((t) => (t.token?.baseToken?.symbol ?? "").toUpperCase() === "USDC");
  return hit ? Number(hit.token.balance) : 0;
}

const state = readState();
log("endpoint revenue, all time:");
const earned = await earnedUsd();
const owed = round(earned - (state.recycledUsd ?? 0));
const balance = usdcBalance();
const available = round(balance - USDC_RESERVE);
log(`earned $${earned.toFixed(2)} | recycled $${(state.recycledUsd ?? 0).toFixed(2)} | owed $${owed.toFixed(2)} | USDC ${balance} (reserve ${USDC_RESERVE})`);

const amount = round(Math.min(owed, available, MAX_SWAP_USD));
if (amount < MIN_SWAP_USD) {
  log(amount <= 0 ? "nothing to recycle" : `skip: $${amount.toFixed(2)} below MIN_SWAP_USD`);
  process.exit(0);
}

const amt = amount.toFixed(2);
log(`swap ${amt} USDC -> RRB`);
if (DRY_RUN) {
  log("dry run complete");
  process.exit(0);
}

const out = bankr(["wallet", "swap", "--from", "USDC", "--to", RRB, "--amount", amt, "--chain", "base"]);
log(out.trim().split("\n").slice(-2).join(" | "));
const tx = out.match(/0x[0-9a-fA-F]{64}/)?.[0] ?? null;

state.recycledUsd = round((state.recycledUsd ?? 0) + Number(amt));
state.runs = [...(state.runs ?? []), { at: new Date().toISOString(), usdc: Number(amt), earned, tx }].slice(-200);
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
log(`done: recycled total $${state.recycledUsd.toFixed(2)}`);
