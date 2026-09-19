export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Turn wallet, x402 and HTTP errors into one short sentence a tenant can act on. */
export function explainError(err: unknown): { message: string; retryable: boolean; charged: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected the request")) {
    return { message: "You cancelled the signature. Nothing was charged.", retryable: true, charged: false };
  }
  if (lower.includes("insufficient") && lower.includes("balance")) {
    return { message: "Not enough USDC on Base for this call.", retryable: false, charged: false };
  }
  if (lower.includes("chain") && (lower.includes("mismatch") || lower.includes("switch"))) {
    return { message: "Your wallet is on the wrong network. Switch to Base and try again.", retryable: true, charged: false };
  }
  if (lower.includes("spend") || lower.includes("exceeds") || lower.includes("max amount")) {
    return { message: "The endpoint asked for more than this site allows per call. Not charged.", retryable: false, charged: false };
  }
  if (err instanceof ServiceError) {
    if (err.status === 402) {
      return { message: "Payment could not be verified. Nothing was charged. Try again.", retryable: true, charged: false };
    }
    if (err.status === 400) {
      return { message: `The service rejected the input: ${raw}`, retryable: false, charged: false };
    }
    if (err.status === 502 || err.status === 504) {
      return { message: "The writing model timed out. You were not charged. Try again.", retryable: true, charged: false };
    }
    if (err.status >= 500) {
      return { message: `Service error (${err.status}). Try again in a moment.`, retryable: true, charged: false };
    }
    return { message: raw, retryable: true, charged: false };
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return { message: "Could not reach the service. Check your connection and try again.", retryable: true, charged: false };
  }
  return { message: raw.length > 200 ? raw.slice(0, 200) + "…" : raw, retryable: true, charged: false };
}
