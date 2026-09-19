import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { siteConfig } from "../site.config";
import { formatUsdc } from "../lib/format";

export function useUsdcBalance(address?: `0x${string}`) {
  const q = useReadContract({
    address: siteConfig.usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: siteConfig.chainId,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  return {
    balance: q.data as bigint | undefined,
    formatted: formatUsdc(q.data as bigint | undefined),
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}
