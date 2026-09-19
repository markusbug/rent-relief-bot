import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { siteConfig } from "../site.config";
import type { ServiceDef } from "../lib/services";
import { callService, makePaidFetch, walletClientToSigner } from "../lib/x402";
import { explainError } from "../lib/errors";

export type CallState<T> =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "signing" }
  | { status: "running" }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "result"; data: T; txHash?: string };

export function usePaidCall<T>(svc: ServiceDef) {
  const { data: walletClient } = useWalletClient({ chainId: siteConfig.chainId });
  const [state, setState] = useState<CallState<T>>({ status: "idle" });

  const run = useCallback(
    async (input: Record<string, unknown>) => {
      if (!walletClient) {
        setState({ status: "error", message: "Connect a wallet on Base first.", retryable: false });
        return;
      }
      setState({ status: "requesting" });
      try {
        const signer = walletClientToSigner(walletClient, {
          onSignStart: () => setState({ status: "signing" }),
          onSignEnd: () => setState({ status: "running" }),
        });
        const paidFetch = makePaidFetch(signer);
        const { data, txHash } = await callService<T>(paidFetch, svc, input);
        setState({ status: "result", data, txHash });
      } catch (err) {
        const e = explainError(err);
        setState({ status: "error", message: e.message, retryable: e.retryable });
      }
    },
    [walletClient, svc],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);
  const busy = state.status === "requesting" || state.status === "signing" || state.status === "running";
  return { state, run, reset, busy };
}
