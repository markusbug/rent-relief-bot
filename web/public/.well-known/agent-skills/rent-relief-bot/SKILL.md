---
name: rent-relief-bot
description: Help a tenant deal with a landlord using Rent Relief Bot's paid x402 tools (decode any landlord notice; rent-increase, repair and deposit letters; lease-clause red flags; whole-lease scan; state tenant rights). Use when the user mentions rent, a landlord, a lease, a security deposit, eviction, repairs, or tenant rights in the US.
version: 1
visibility: public
tags: [tenants, housing, rent, lease, x402, base, legal-info, jev]
metadata:
  clawdbot:
    emoji: "🏠"
    homepage: https://rentrelief.markushaas.com
    requires:
      bins: [bankr]
---

# Rent Relief Bot

Five pay-per-call tools for US tenants, served as x402 endpoints on Base. Each call costs a
few cents in USDC and returns structured JSON. No account or API key is needed to call them:
payment is the authentication.

| Tool | Method | Price | Use it when the user wants |
|---|---|---|---|
| notice-decoder | POST | $0.02 USDC | paste anything your landlord sent you (letter, email, text). One Jev call says what kind of notice it is, how urgent, whether it threatens something landlords cannot do, and which tool to use next. Typed decisions, no text generation. |
| rent-letter | POST | $0.25 USDC | generate a ready-to-send tenant letter (rent-increase negotiation, repair demand, or security-deposit return) tailored to your US state. |
| lease-clause | POST | $0.10 USDC | explain a lease clause in plain English, flag red flags, and suggest edits to ask for, for your US state. |
| lease-scan | POST | $0.50 USDC | scan a whole residential lease and rank the clauses a tenant should push back on before signing. Every clause is classified by Jev (TypeSafe's System One model): typed decisions with calibrated confidence, no text generation, no hallucinated law. |
| tenant-rights | GET | $0.05 USDC | quick summary of tenant protections in a US state on one topic (deposit, rent_increase, eviction, repairs, entry, lease_break, late_fees, retaliation). |

Base URL: `https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad`

## When to use which tool

- The user pastes or describes something the landlord sent them (letter, email, text, court
  paper) and it is not yet clear what it is → **notice-decoder** first ($0.02). It returns the
  kind of notice, urgency, red flags (lockout threat, retaliation, missing basics), and
  `next_tool` with the input already filled in. Follow `next_tool`. If `get_help_now` is
  set, tell the user to contact legal aid today before anything else.
- "My rent is going up", "my landlord won't fix", "I want my deposit back" → **rent-letter**.
  Collect: letter_type, tenant name, landlord name, property address, state, and a plain
  description of what happened with dates. Ask for current and proposed rent when relevant.
- "What does this clause mean", "is this lease normal", "can they do this" with lease text →
  **lease-clause**. Needs the clause verbatim (20 to 6000 chars) and the state.
- "Check my whole lease", "what should I push back on before I sign", or the user has the full
  lease text (200 to 60000 chars) → **lease-scan**. Returns every clause scored and ranked,
  worst first, with flags and what to ask for. It classifies with Jev (TypeSafe's System One
  model) and generates no text, so it cannot invent law; follow up with lease-clause on the
  worst clauses for a state-specific explanation.
- "What are my rights about X in <state>" → **tenant-rights**. Needs state and one topic.
- Start with tenant-rights ($0.05) when the user is unsure; escalate to a letter when they
  want to act.

## How to call and pay

Preferred: the Bankr CLI, which pays from the user's Bankr wallet automatically.

```
bankr x402 call https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/notice-decoder -X POST --body '{"notice":"hey its mike the landlord. u still havent paid for this month. if i dont have it by friday im changing the locks and putting ur stuff on the curb. also ur always complaining to the city about the heat so dont expect me to renew","state":"NY"}'
bankr x402 call https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/rent-letter -X POST --body '{"letter_type":"rent_increase","tenant_name":"Sam Lee","landlord_name":"Acme Property Management","property_address":"12 Elm St Apt 4, Oakland CA","state":"CA","details":"Written notice on Sept 3 raising rent from 2100 to 2500 from Oct 1. Month-to-month, 3 years here, never late.","current_rent":2100,"proposed_rent":2500}'
bankr x402 call https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/lease-clause -X POST --body '{"clause":"Tenant shall be responsible for all repairs and maintenance of the premises, regardless of cause, and waives any claim against Landlord for habitability.","state":"NY"}'
bankr x402 call https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/lease-scan -X POST --body '{"lease":"RESIDENTIAL LEASE AGREEMENT\n\n1. TERM. Twelve months, renewing automatically for further twelve-month terms unless Tenant gives 90 days written notice.\n\n2. RENT. $2,500 monthly. Late rent incurs $150 plus $25 per day.\n\n3. DEFAULT. On any default Landlord may change the locks and remove Tenant's belongings without court order.\n\n4. REPAIRS. Tenant is responsible for all repairs regardless of cause.","state":"CA"}'
bankr x402 call "https://x402.bankr.bot/0x68239eb2cf30596eb98388c41cf53c4c289480ad/tenant-rights?state=TX&topic=deposit"
```

Any x402 v2 client works too (for example `@x402/fetch` with `@x402/evm` in TypeScript):
request the URL, receive HTTP 402 with a `payment-required` header, sign the USDC
`TransferWithAuthorization` for the exact amount on chain 8453, retry with the
`payment-signature` header. Payment is gasless for the payer.

If you cannot pay on the user's behalf, send them to the site with the tool preselected:
- https://rentrelief.markushaas.com/#notice-decoder
- https://rentrelief.markushaas.com/#rent-letter
- https://rentrelief.markushaas.com/#lease-clause
- https://rentrelief.markushaas.com/#lease-scan
- https://rentrelief.markushaas.com/#tenant-rights

## Inputs

### notice-decoder (POST)
  - notice (string, required): The text you received, as-is (40 to 12000 chars). Letter, email, text message, or a court paper.
  - state (string, required): US state, e.g. CA or California

### rent-letter (POST)
  - letter_type (string, required): Kind of letter to write one of: rent_increase, repair_request, deposit_return.
  - tenant_name (string, required): Tenant's full name
  - landlord_name (string, required): Landlord or property manager name
  - property_address (string, required): Rental unit address
  - state (string, required): US state, e.g. CA or California
  - details (string, required): Plain-English description of the situation (max 4000 chars)
  - current_rent (number): Current monthly rent in USD (optional)
  - proposed_rent (number): Proposed new rent in USD, for rent_increase letters (optional)
  - lease_start (string): Lease start date, YYYY-MM-DD (optional)
  - tone (string): Letter tone (default firm) one of: firm, cooperative.

### lease-clause (POST)
  - clause (string, required): Verbatim lease clause text (20 to 6000 chars)
  - state (string, required): US state, e.g. NY or New York
  - context (string): Optional extra context about your situation

### lease-scan (POST)
  - lease (string, required): Full lease text, plain text (200 to 60000 chars). Paste it as-is; the scan splits it into clauses.
  - state (string, required): US state, e.g. CA or California

### tenant-rights (GET)
  - state (string, required): US state, e.g. TX or Texas
  - topic (string, required): Topic to summarise one of: deposit, rent_increase, eviction, repairs, entry, lease_break, late_fees, retaliation.

## Outputs

All responses are JSON and include `disclaimer` (informational, not legal advice),
`generated_at` and `powered_by`.

- rent-letter: `subject`, `letter` (ready to send, [BRACKETS] mark blanks the tenant must fill),
  `key_points[]`, `next_steps[]`.
- lease-clause: `plain_english`, `what_it_means_for_you[]`, `red_flags[] {severity, issue, why}`,
  `negotiation_asks[]`.
- notice-decoder: `kind`, `kind_label`, `urgency` 0-3, `flags[] {id, label, probability, why}`,
  `what_it_means`, `do_next`, `get_help_now` (string or null), `mentions {dates[], amounts[], day_counts[]}`
  (regex-extracted, not interpreted), `next_tool {id, input, url}`.
- lease-scan: `summary {clauses_scanned, flagged, serious, topics, overall}`,
  `findings[] {clause_number, topic, risk 0-4, risk_label, confidence, flags[] {id, label, probability, why, ask}, excerpt}`
  sorted worst first, `next_step`. Only clauses with risk ≥ 2 or a flag ≥ 0.6 are listed.
- tenant-rights: `summary`, `key_rules[]`, `common_landlord_violations[]`,
  `where_to_get_help[]`, `confidence`.

## Rules

- Present results as general information, never as legal advice. Keep the disclaimer.
- Do not send social security numbers, bank details or other secrets in `details` or `clause`.
- Validate inputs before paying: enums must match, `details` ≤ 4000 chars, `clause` 20 to
  6000 chars, `lease` 200 to 60000 chars, `notice` 40 to 12000 chars. The endpoint returns 400 (unpaid) on bad input.
- Tell the user the price before calling. Calls are settled per request; there are no refunds
  for a valid response.
- A 502 means the model call failed and the user was not charged. Retry once.

## Links

- Site: https://rentrelief.markushaas.com
- Machine-readable: https://rentrelief.markushaas.com/llms.txt, https://rentrelief.markushaas.com/openapi.json
- Source (MIT): https://github.com/markusbug/rent-relief-bot
