import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { siteConfig } from "../site.config";
import { shortAddress } from "../lib/format";
import { useUsdcBalance } from "../hooks/useUsdcBalance";
import { Button } from "./ui";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { formatted } = useUsdcBalance(address);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {connectors.map((c) => (
          <Button key={c.uid} variant="outline" size="sm" disabled={isPending} onClick={() => connect({ connector: c })}>
            {c.name === "Injected" ? "Browser wallet" : c.name}
          </Button>
        ))}
      </div>
    );
  }

  const wrongChain = chainId !== siteConfig.chainId;
  return (
    <div className="flex items-center gap-2">
      {wrongChain ? (
        <Button size="sm" disabled={switching} onClick={() => switchChain({ chainId: siteConfig.chainId })}>
          Switch to Base
        </Button>
      ) : (
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 sm:inline">{formatted} USDC</span>
      )}
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-slate-200" title={address}>
        {shortAddress(address)}
      </span>
      <Button variant="ghost" size="sm" onClick={() => disconnect()} aria-label="Disconnect">
        ✕
      </Button>
    </div>
  );
}
