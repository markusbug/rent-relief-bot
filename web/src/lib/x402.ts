import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientEvmSigner } from "@x402/evm";
import type { WalletClient } from "viem";
import { siteConfig } from "../site.config";
import { MAX_PRICE_USD, type ServiceDef } from "./services";
import { ServiceError } from "./errors";

export interface SignHooks {
  onSignStart?: () => void;
  onSignEnd?: () => void;
}

/**
 * The x402 EVM scheme only needs an address and EIP-712 signing. A wagmi WalletClient
 * gives us both, so no private key ever touches this code.
 */
export function walletClientToSigner(wc: WalletClient, hooks: SignHooks = {}): ClientEvmSigner {
  const account = wc.account;
  if (!account) throw new Error("Wallet client has no account");
  return {
    address: account.address,
    async signTypedData(args) {
      hooks.onSignStart?.();
      try {
        return await wc.signTypedData({
          account,
          domain: args.domain,
          types: args.types,
          primaryType: args.primaryType,
          message: args.message,
        } as Parameters<typeof wc.signTypedData>[0]);
      } finally {
        hooks.onSignEnd?.();
      }
    },
  };
}

export function makePaidFetch(signer: ClientEvmSigner): typeof fetch {
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: siteConfig.network, client: new ExactEvmScheme(signer) }],
    // Hard cap so a misconfigured endpoint can never ask for more than the priciest tool.
    spendControls: { maxAmountPerPayment: `$${MAX_PRICE_USD.toFixed(2)}` },
  }) as typeof fetch;
}

export interface CallResult<T> {
  data: T;
  txHash?: string;
}

export async function callService<T>(
  paidFetch: typeof fetch,
  svc: ServiceDef,
  input: Record<string, unknown>,
): Promise<CallResult<T>> {
  let res: Response;
  if (svc.method === "GET") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(input)) if (v !== undefined && v !== "") qs.set(k, String(v));
    res = await paidFetch(`${svc.url}?${qs.toString()}`, { method: "GET" });
  } else {
    res = await paidFetch(svc.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ServiceError(res.status, msg);
  }

  const data = (await res.json()) as T;
  let txHash: string | undefined;
  const header = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  if (header) {
    try {
      const decoded = decodePaymentResponseHeader(header) as { transaction?: string };
      txHash = decoded.transaction;
    } catch {
      /* best effort */
    }
  }
  return { data, txHash };
}
