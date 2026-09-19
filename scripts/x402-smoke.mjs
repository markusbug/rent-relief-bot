#!/usr/bin/env node
// Smoke-test the x402 flow without spending anything.
//
//   node scripts/x402-smoke.mjs <url> [method] [json-body]
//
// Wraps fetch with the same client the site uses, but with a signer that logs the
// EIP-712 request it would sign and then refuses. Use it to confirm an endpoint:
//   - passes non-402 responses straight through (local dev server), or
//   - returns a 402 whose payTo / amount / chain are what you expect (live endpoint).
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

const [url, method = "GET", body] = process.argv.slice(2);
if (!url) {
  console.error("usage: node scripts/x402-smoke.mjs <url> [GET|POST] [json-body]");
  process.exit(1);
}

const signer = {
  address: "0x000000000000000000000000000000000000dEaD",
  async signTypedData(args) {
    const m = args.message;
    console.log(`402 received. Would sign ${args.primaryType} on chain ${args.domain.chainId}`);
    console.log(`  payTo  ${m.to}`);
    console.log(`  amount ${m.value} (USDC base units)`);
    throw new Error("smoke test: refusing to sign");
  },
};

const paid = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(signer) }],
});

try {
  const res = await paid(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body,
  });
  console.log(`${res.status} ${res.statusText}`);
  console.log((await res.text()).slice(0, 500));
} catch (e) {
  console.log("stopped before payment:", e.message);
}
