import { siteConfig } from "../../site.config";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/5 py-10 text-sm text-slate-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <p>
            <strong className="text-slate-300">Not legal advice.</strong> Rent Relief Bot gives general information written by an AI model. Laws change and
            vary by city. Verify anything you rely on, and talk to a tenant-rights organisation or lawyer for your situation.
          </p>
          <p>
            <strong className="text-slate-300">Privacy.</strong> This site has no backend and no analytics. What you type is sent to the tool endpoint,
            processed by an LLM gateway, and returned. Do not include social security numbers, bank details or other secrets.
          </p>
        </div>
        <div className="flex flex-col gap-1 text-slate-400">
          <a className="hover:text-white" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
          <a className="hover:text-white" href="https://bankr.bot" target="_blank" rel="noreferrer">
            Endpoints hosted by Bankr
          </a>
          <a className="hover:text-white" href="https://x402.org" target="_blank" rel="noreferrer">
            Payments via x402
          </a>
          <span className="mt-2 text-xs">MIT licensed</span>
        </div>
      </div>
    </footer>
  );
}
