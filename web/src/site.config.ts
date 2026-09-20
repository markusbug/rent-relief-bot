/**
 * Single config surface for the site. Everything here comes from VITE_* env vars
 * (see web/.env.example) or is a chain constant.
 */
const env = import.meta.env;

const ownerAddress = env.VITE_OWNER_ADDRESS as `0x${string}` | undefined;
if (!ownerAddress || !/^0x[0-9a-fA-F]{40}$/.test(ownerAddress)) {
  throw new Error("VITE_OWNER_ADDRESS is missing or invalid. Copy web/.env.example to web/.env.");
}

const rrbAddress = (env.VITE_RRB_ADDRESS as `0x${string}` | undefined) ?? "0xc66b29249edffe9c436fdb0ca4e8bfbbe9affba3";
const githubUrl = (env.VITE_GITHUB_URL as string | undefined) ?? "https://github.com/markusbug/rent-relief-bot";

export const siteConfig = {
  name: "Rent Relief Bot",
  tagline: "Tenant tools you pay for by the call. No account, no subscription, no gas.",
  siteUrl: (env.VITE_SITE_URL as string | undefined) ?? "https://rentrelief.markushaas.com",
  ownerAddress,
  apiBase: ((env.VITE_API_BASE as string | undefined) ?? `https://x402.bankr.bot/${ownerAddress}`).replace(/\/$/, ""),
  githubUrl,
  rrbAddress,
  rrbSymbol: "RRB",
  buyRrbUrl:
    (env.VITE_BUY_RRB_URL as string | undefined) ??
    `https://bankr.bot/terminal/trade?out=${rrbAddress}&chain=base`,
  jevUrl: "https://openrouter.ai/~typesafe/jev-latest",
  typesafeUrl: "https://typesafe.ai",
  buybackLedgerUrl: `${githubUrl}/blob/main/scripts/buyback-state.json`,
  baseRpcUrl: env.VITE_BASE_RPC_URL as string | undefined,
  cbWalletPreference: ((env.VITE_CB_WALLET_PREFERENCE as string | undefined) ?? "eoaOnly") as
    | "eoaOnly"
    | "all"
    | "smartWalletOnly",
  chainId: 8453,
  network: "eip155:8453",
  usdcAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as `0x${string}`,
  usdcDecimals: 6,
  explorerTx: (hash: string) => `https://basescan.org/tx/${hash}`,
  explorerToken: (addr: string) => `https://basescan.org/token/${addr}`,
} as const;
