import manifest from "../../../bankr.x402.json";
import { parseUnits } from "viem";
import { siteConfig } from "../site.config";

export type ServiceId = "rent-letter" | "lease-clause" | "lease-scan" | "tenant-rights";

export interface ServiceDef {
  id: ServiceId;
  title: string;
  short: string;
  method: "GET" | "POST";
  price: string;
  priceUnits: bigint;
  description: string;
  url: string;
}

const TITLES: Record<ServiceId, { title: string; short: string }> = {
  "rent-letter": { title: "Rent letter", short: "Ready-to-send landlord letter" },
  "lease-clause": { title: "Lease clause check", short: "Plain English plus red flags" },
  "lease-scan": { title: "Whole-lease scan", short: "Every clause ranked, worst first" },
  "tenant-rights": { title: "Tenant rights", short: "Your state, one topic, two minutes" },
};

type ManifestService = {
  price: string;
  description: string;
  methods?: string[];
  schema?: { input?: { properties?: Record<string, { enum?: string[] }> } };
};

const services = manifest.services as Record<ServiceId, ManifestService>;

function def(id: ServiceId): ServiceDef {
  const s = services[id];
  return {
    id,
    ...TITLES[id],
    method: (s.methods?.[0] as "GET" | "POST") ?? "POST",
    price: s.price,
    priceUnits: parseUnits(s.price, siteConfig.usdcDecimals),
    description: s.description,
    url: `${siteConfig.apiBase}/${id}`,
  };
}

export const SERVICES: Record<ServiceId, ServiceDef> = {
  "rent-letter": def("rent-letter"),
  "lease-clause": def("lease-clause"),
  "lease-scan": def("lease-scan"),
  "tenant-rights": def("tenant-rights"),
};

export const SERVICE_LIST: ServiceDef[] = [SERVICES["rent-letter"], SERVICES["lease-clause"], SERVICES["lease-scan"], SERVICES["tenant-rights"]];

export const MAX_PRICE_USD = SERVICE_LIST.reduce((m, s) => Math.max(m, Number(s.price)), 0);

export const LETTER_TYPES = services["rent-letter"].schema?.input?.properties?.letter_type?.enum ?? [
  "rent_increase",
  "repair_request",
  "deposit_return",
];
export const TOPICS = services["tenant-rights"].schema?.input?.properties?.topic?.enum ?? [
  "deposit",
  "rent_increase",
  "eviction",
  "repairs",
  "entry",
  "lease_break",
  "late_fees",
  "retaliation",
];

export const LETTER_TYPE_LABELS: Record<string, string> = {
  rent_increase: "Push back on a rent increase",
  repair_request: "Demand repairs",
  deposit_return: "Get my deposit back",
};

export const TOPIC_LABELS: Record<string, string> = {
  deposit: "Security deposit",
  rent_increase: "Rent increases",
  eviction: "Eviction",
  repairs: "Repairs and habitability",
  entry: "Landlord entry",
  lease_break: "Breaking a lease",
  late_fees: "Late fees",
  retaliation: "Retaliation",
};

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export interface LetterOut {
  subject: string;
  letter: string;
  key_points: string[];
  next_steps: string[];
  disclaimer: string;
  letter_type: string;
  generated_at: string;
}

export interface ClauseOut {
  plain_english: string;
  what_it_means_for_you: string[];
  red_flags: { severity: "low" | "medium" | "high"; issue: string; why: string }[];
  negotiation_asks: string[];
  disclaimer: string;
  state: string;
  generated_at: string;
}

export interface RightsOut {
  summary: string;
  key_rules: string[];
  common_landlord_violations: string[];
  where_to_get_help: string[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
  state: string;
  topic: string;
  generated_at: string;
}

export interface ScanFlag {
  id: string;
  label: string;
  probability: number;
  why: string;
  ask: string;
}

export interface ScanFinding {
  clause_number: number;
  topic: string;
  risk: 0 | 1 | 2 | 3 | 4;
  risk_label: "standard" | "minor" | "one-sided" | "serious" | "severe";
  confidence: number;
  flags: ScanFlag[];
  excerpt: string;
}

export interface ScanOut {
  summary: { clauses_scanned: number; flagged: number; serious: number; topics: Record<string, number>; overall: string };
  findings: ScanFinding[];
  next_step: string;
  disclaimer: string;
  state: string;
  model: string;
  generated_at: string;
}

export const SCAN_TOPIC_LABELS: Record<string, string> = {
  rent_and_fees: "Rent and fees",
  deposit: "Deposit",
  repairs_and_maintenance: "Repairs",
  entry_and_privacy: "Entry",
  term_renewal_termination: "Term and renewal",
  use_and_rules: "Use and rules",
  liability_and_legal: "Legal terms",
  utilities_and_services: "Utilities",
  other: "Other",
};
