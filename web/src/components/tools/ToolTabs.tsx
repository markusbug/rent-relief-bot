import { useEffect, useState } from "react";
import { SERVICE_LIST, type ServiceId } from "../../lib/services";
import { formatPrice } from "../../lib/format";
import { Card } from "../ui";
import { RentLetterForm } from "./RentLetterForm";
import { LeaseClauseForm } from "./LeaseClauseForm";
import { LeaseScanForm } from "./LeaseScanForm";
import { TenantRightsForm } from "./TenantRightsForm";

const IDS = SERVICE_LIST.map((s) => s.id);

function fromHash(): ServiceId {
  const h = window.location.hash.replace("#", "") as ServiceId;
  return IDS.includes(h) ? h : "rent-letter";
}

export function ToolTabs() {
  const [active, setActive] = useState<ServiceId>(() => (typeof window === "undefined" ? "rent-letter" : fromHash()));

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div id="tools" className="scroll-mt-20">
      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {SERVICE_LIST.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                active === s.id ? "border-brand-400 bg-brand-500/15 text-white" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {s.title} <span className="ml-1 text-xs opacity-70">{formatPrice(s.price)}</span>
            </a>
          ))}
        </div>
      </div>
      <Card>
        {active === "rent-letter" && <RentLetterForm />}
        {active === "lease-clause" && <LeaseClauseForm />}
        {active === "lease-scan" && <LeaseScanForm />}
        {active === "tenant-rights" && <TenantRightsForm />}
      </Card>
    </div>
  );
}
