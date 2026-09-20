import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { siteConfig } from "../site.config";
import type { ServiceDef } from "../lib/services";
import { formatPrice } from "../lib/format";
import { useUsdcBalance } from "../hooks/useUsdcBalance";
import type { CallState } from "../hooks/usePaidCall";
import { Button, Spinner } from "./ui";

interface Props<T> {
  svc: ServiceDef;
  label: string;
  state: CallState<T>;
  formValid: boolean;
  onRun: () => void;
  onReset: () => void;
  runningLabel?: string;
}

export function PayButton<T>({ svc, label, state, formValid, onRun, onReset, runningLabel = "Writing…" }: Props<T>) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { balance, isLoading: balanceLoading } = useUsdcBalance(address);

  const busy = state.status === "requesting" || state.status === "signing" || state.status === "running";
  const price = formatPrice(svc.price);

  if (busy) {
    const text = state.status === "signing" ? "Confirm in your wallet" : state.status === "running" ? runningLabel : "Requesting…";
    return (
      <Button type="button" disabled className="w-full sm:w-auto">
        <Spinner /> {text}
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {connectors.map((c) => (
          <Button key={c.uid} type="button" disabled={connecting} onClick={() => connect({ connector: c })} className="w-full sm:w-auto">
            Connect {c.name === "Injected" ? "browser wallet" : c.name}
          </Button>
        ))}
        <span className="text-xs text-slate-500">
          {price} USDC on Base per call. No gas needed.
        </span>
      </div>
    );
  }

  if (chainId !== siteConfig.chainId) {
    return (
      <Button type="button" disabled={switching} onClick={() => switchChain({ chainId: siteConfig.chainId })} className="w-full sm:w-auto">
        Switch to Base
      </Button>
    );
  }

  const insufficient = balance !== undefined && balance < svc.priceUnits;
  if (insufficient) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button type="button" disabled className="w-full sm:w-auto">
          {label} · {price}
        </Button>
        <span className="text-xs text-amber-300">
          You need at least {price} USDC on Base.{" "}
          <a className="underline" href="https://www.coinbase.com/how-to-buy/usdc" target="_blank" rel="noreferrer">
            Get USDC
          </a>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" disabled={!formValid || balanceLoading} onClick={onRun} className="w-full sm:w-auto">
          {label} · {price}
        </Button>
        {state.status === "result" && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Start over
          </Button>
        )}
      </div>
      {state.status === "error" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {state.message}
          {state.retryable && (
            <button type="button" onClick={onRun} className="ml-2 underline">
              Retry
            </button>
          )}
        </div>
      )}
      {!formValid && state.status === "idle" && <span className="text-xs text-slate-500">Fill in the required fields to continue.</span>}
    </div>
  );
}
