#!/usr/bin/env node
// Revenue-to-RRB buyback.
//
// 1. Claims any pending RRB creator fees (WETH + RRB) to the Bankr wallet.
// 2. Reads the Base portfolio via the Bankr CLI.
// 3. Swaps USDC above a reserve (x402 revenue lands as USDC) into RRB.
// 4. Swaps WETH above a reserve (claimed creator fees) into RRB.
//
// Every swap is a real buy in the RRB/WETH pool: it generates LP fees (95% back to you)
// and adds demand. Run it from cron. Defaults are conservative; override via env.
//
//   DRY_RUN=1 node scripts/buyback.mjs           # print what it would do
//   node scripts/buyback.mjs                     # execute
//
// Env:
//   RRB_ADDRESS        token to buy (default: Rent Relief Bot on Base)
//   USDC_RESERVE       USDC to always leave in the wallet (default 5)
//   WETH_RESERVE       WETH to always leave (default 0.002, covers gas-ish/dust)
//   MAX_SWAP_USD       cap per swap so one run can't blow past Bankr tx limits (default 400)
//   MIN_SWAP_USD       skip swaps smaller than this (default 2)
//   CLAIM_FEES         "0" to skip the creator-fee claim step (default 1)
//   DRY_RUN            "1" to only print

import { execFileSync } from "node:child_process";

const RRB = process.env.RRB_ADDRESS || "0xc66b29249edffe9c436fdb0ca4e8bfbbe9affba3";
const USDC_RESERVE = Number(process.env.USDC_RESERVE || 5);
const WETH_RESERVE = Number(process.env.WETH_RESERVE || 0.002);
const MAX_SWAP_USD = Number(process.env.MAX_SWAP_USD || 400);
const MIN_SWAP_USD = Number(process.env.MIN_SWAP_USD || 2);
const CLAIM_FEES = (process.env.CLAIM_FEES || "1") !== "0";
const DRY_RUN = process.env.DRY_RUN === "1";

const log = (...a) => console.log(new Date().toISOString(), ...a);

function bankr(args, { json = false } = {}) {
  const out = execFileSync("bankr", ["--ni", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return json ? JSON.parse(out) : out;
}

function findToken(portfolio, symbol) {
  const entries = portfolio?.balances?.base?.tokenBalances ?? [];
  const hit = entries.find((t) => (t.token?.baseToken?.symbol ?? "").toUpperCase() === symbol);
  if (!hit) return { balance: 0, price: 0 };
  return { balance: Number(hit.token.balance), price: Number(hit.token.baseToken.price ?? 0) };
}

function swap(from, amount, usd) {
  const amt = amount.toFixed(from === "USDC" ? 2 : 8);
  log(`swap ${amt} ${from} (~$${usd.toFixed(2)}) -> RRB`);
  if (DRY_RUN) return;
  const out = bankr(["wallet", "swap", "--from", from, "--to", RRB, "--amount", amt, "--chain", "base"]);
  log(out.trim().split("\n").slice(-2).join(" | "));
}

function planSwap(from, { balance, price }, reserve) {
  const excess = balance - reserve;
  if (excess <= 0 || price <= 0) return null;
  let usd = excess * price;
  let amount = excess;
  if (usd > MAX_SWAP_USD) {
    amount = MAX_SWAP_USD / price;
    usd = MAX_SWAP_USD;
  }
  if (usd < MIN_SWAP_USD) {
    log(`skip ${from}: excess $${usd.toFixed(2)} below MIN_SWAP_USD`);
    return null;
  }
  return { from, amount, usd };
}

if (CLAIM_FEES) {
  log("claiming creator fees for RRB");
  if (!DRY_RUN) {
    try {
      const out = bankr(["fees", "claim", "-y", RRB]);
      log(out.trim().split("\n").slice(-1)[0]);
    } catch (e) {
      log("fee claim failed (continuing):", String(e.stderr ?? e.message).trim().split("\n").slice(-1)[0]);
    }
  }
}

const portfolio = bankr(["wallet", "portfolio", "--chain", "base", "--json", "--low-value"], { json: true });
const usdc = findToken(portfolio, "USDC");
const weth = findToken(portfolio, "WETH");
log(`balances: USDC ${usdc.balance} | WETH ${weth.balance} (@$${weth.price.toFixed(0)})`);

// USDC price is ~1 even if the API returns 0 for stables.
if (usdc.balance > 0 && usdc.price === 0) usdc.price = 1;

const plans = [planSwap("USDC", usdc, USDC_RESERVE), planSwap("WETH", weth, WETH_RESERVE)].filter(Boolean);
if (plans.length === 0) log("nothing to buy back");
for (const p of plans) swap(p.from, p.amount, p.usd);
log(DRY_RUN ? "dry run complete" : "done");
