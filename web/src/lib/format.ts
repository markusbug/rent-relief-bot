import { formatUnits } from "viem";
import { siteConfig } from "../site.config";

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatUsdc(units: bigint | undefined): string {
  if (units === undefined) return "…";
  const n = Number(formatUnits(units, siteConfig.usdcDecimals));
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPrice(price: string): string {
  return `$${Number(price).toFixed(2)}`;
}
