# Rent Relief Bot

**Your landlord has a lawyer. Now you have a bot.**

Three tenant tools, paid per call in USDC on Base through [x402](https://x402.org). No account,
no subscription, no gas. Humans use them at **[rentrelief.markushaas.com](https://rentrelief.markushaas.com)**;
AI agents call the same endpoints on the [Bankr](https://bankr.bot) x402 marketplace. Every dollar
of revenue is swapped into `$RRB` by a public GitHub Action.

| Tool | Method | Price | What you get |
|---|---|---|---|
| `rent-letter` | POST | $0.25 | A ready-to-send letter: push back on a rent increase, demand repairs, or get a deposit back. Plus your leverage and next steps. |
| `lease-clause` | POST | $0.10 | A lease clause in plain English, red flags ranked by severity, and edits to ask for. |
| `tenant-rights` | GET | $0.05 | State tenant protections on one topic: deposits, rent increases, eviction, repairs, entry, lease breaks, late fees, retaliation. |

Every answer carries a not-legal-advice disclaimer and never invents statute numbers.

## How it fits together

```
 browser (wagmi + @x402/fetch)                 agents (bankr x402 call, any x402 client)
        |                                                |
        v            GET / POST                          v
 https://x402.bankr.bot/<owner>/<service>  --402-->  client signs a USDC TransferWithAuthorization
        |                                            (EIP-3009, gasless, exact price)
        |  Bankr facilitator verifies + settles -> USDC lands in the owner wallet
        v
 x402/<service>/index.ts  -->  llm.bankr.bot  (LLM_GATEWAY_KEY lives only in Bankr's encrypted env)
        |
        v  JSON result
 owner wallet (USDC + $RRB creator fees)  --hourly GitHub Action-->  scripts/buyback.mjs  -->  buys $RRB
```

The site is static. It holds no keys and has no backend: the browser talks straight to the
Bankr endpoint, which allows cross-origin calls. The only secrets in the whole system are the
LLM key (stored on Bankr) and the buyback key (a GitHub secret).

## Repository layout

```
x402/<service>/index.ts    the three handlers, each self-contained (Bankr deploys them one by one)
bankr.x402.json            prices, descriptions and JSON schemas; the site imports this file
web/                       Vite + React + Tailwind site; wagmi + viem + @x402/fetch for payments
scripts/dev.mjs            runs the handlers locally on :8787 with CORS, no payment layer
scripts/buyback.mjs        claims RRB creator fees, swaps USDC and WETH into RRB via the Bankr CLI
scripts/x402-smoke.mjs     dry-runs the x402 flow against any URL without spending
.github/workflows/buyback.yml   hourly buyback (needs a secret and a repo variable to arm)
firebase.json              Firebase Hosting config for web/dist
```

## Use it as an agent

Endpoints are `https://x402.bankr.bot/<owner-wallet>/<service>`. With the Bankr CLI:

```
bankr x402 call "https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/tenant-rights?state=CA&topic=deposit"

bankr x402 call https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/rent-letter \
  -X POST --body '{"letter_type":"rent_increase","tenant_name":"Sam Lee","landlord_name":"Acme Property Mgmt","property_address":"12 Elm St Apt 4, Oakland","state":"CA","details":"Notice on Sept 3 raising rent from 2100 to 2500 from Oct 1. Month to month, 3 years here, never late.","current_rent":2100,"proposed_rent":2500}'
```

Any x402 v2 client works. Schemas for discovery are in `bankr.x402.json`.

## Run your own

Fork it, point it at your wallet, and the whole loop is yours.

### 1. Endpoints

```
npm install
bankr login                          # Bankr CLI, read-write key with the Wallet API enabled
bankr x402 env set LLM_GATEWAY_KEY=bk_...   # a SEPARATE key with only the LLM gateway enabled
bankr x402 deploy                    # prints the three URLs
bankr x402 list                      # requests and revenue
```

The LLM key needs credits: `bankr llm credits` shows the balance and how to top up. A few
dollars covers thousands of calls. Optional: `bankr x402 env set LLM_MODEL=...` to override the
per-service default (Sonnet for letters and clauses, Haiku for rights).

### 2. Site

```
cp web/.env.example web/.env         # set VITE_OWNER_ADDRESS to the wallet that ran `bankr x402 deploy`
npm run build                        # -> web/dist
```

Firebase Hosting (free Spark plan is enough, the site is static):

```
firebase login
cp .firebaserc.example .firebaserc   # or: firebase use --add
firebase hosting:channel:deploy preview   # temporary preview URL
firebase deploy --only hosting            # builds first (predeploy), then ships web/dist
```

Custom domain: Firebase console → Hosting → *Add custom domain* → enter the host → add the TXT
record it shows for verification and the A records it shows for traffic → wait for the
certificate (minutes to an hour). Then set `VITE_SITE_URL` to that host and redeploy so the
Open Graph tags point at the right place.

### 3. Buyback

Locally:

```
npm run buyback:dry                  # prints the plan
npm run buyback                      # claims fees, swaps USDC/WETH above the reserves into RRB
```

On GitHub Actions (hourly):

1. Create a **dedicated** Bankr API key at bankr.bot/api-keys: read-write, Wallet API on,
   everything else off. Do not reuse the LLM key or your main key.
2. Repo *Settings → Secrets → Actions*: add `BANKR_API_KEY`.
3. Repo *Settings → Variables → Actions*: add `BUYBACK_ENABLED` = `true`. Until it is set the
   schedule does nothing, so forks stay quiet.
4. *Actions → RRB buyback → Run workflow* with *dry run* checked to see the plan in the log.

Defaults leave 5 USDC and 0.002 WETH in the wallet, cap each swap at $400, and skip anything
under $2. Override with repo variables `USDC_RESERVE`, `WETH_RESERVE`, `MAX_SWAP_USD`,
`MIN_SWAP_USD`, `CLAIM_FEES`, `RRB_ADDRESS`. GitHub pauses scheduled workflows after 60 days
without repo activity; re-enable from the Actions tab.

## Local development

```
npm run dev                          # handlers on http://localhost:8787
npm run web                          # site on http://localhost:5173
```

Set `VITE_API_BASE=http://localhost:8787` in `web/.env` and the site calls the local handlers
with no payment step. Without `LLM_GATEWAY_KEY` exported in the shell the handlers answer 500
after validation, which is enough to work on the UI. Export it to get real output.

Dry-run the payment layer against any endpoint without spending:

```
node scripts/x402-smoke.mjs "https://x402.bankr.bot/<owner>/tenant-rights?state=CA&topic=deposit"
```

It prints the `payTo`, amount and chain the site would sign for, then refuses to sign. Note that
`payTo` is Bankr's settlement address, not the owner wallet: Bankr settles each request on-chain
and forwards the creator's share to the wallet on the endpoint record (0% fee on the free plan
for the first 1,000 requests a month, 5% on Pro).

Checks before a PR: `npm run typecheck && npm run build`.

## Security and privacy

- The wallet signs a USDC `TransferWithAuthorization` for exactly the displayed price. It is
  never asked for a token approval or a transaction, and it never pays gas.
- The site caps payments client-side at the most expensive tool, so a misconfigured endpoint
  cannot ask for more.
- Coinbase Smart Wallet uses contract signatures. The default connector preference is
  `eoaOnly`; set `VITE_CB_WALLET_PREFERENCE=all` to test smart-wallet support once the
  facilitator confirms it.
- The payment authorization is valid for 60 seconds. If a call runs longer, settlement fails and
  the user is not charged.
- Handlers do not store input, but the text is processed by an LLM gateway. The UI tells users
  to leave out social security numbers and account details.
- No analytics, no cookies, no backend.

## Launch tweet

> Rent Relief Bot is live. Three tenant tools, paid per call in USDC on Base, no account, no gas:
> a rent-increase letter ($0.25), lease-clause red flags ($0.10), your state's tenant rights ($0.05).
> Agents can call the same endpoints. Every dollar buys back $RRB, hourly, in public.
> Open source → github.com/markusbug/rent-relief-bot
> Try it → rentrelief.markushaas.com

## License

MIT. See `LICENSE`.
