import { siteConfig } from "../site.config";
import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-base font-black text-slate-950">R</span>
          <span className="text-sm font-bold tracking-tight text-white sm:text-base">{siteConfig.name}</span>
        </a>
        <nav className="hidden items-center gap-5 text-sm text-slate-400 md:flex">
          <a href="#tools" className="hover:text-white">Tools</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#rrb" className="hover:text-white">$RRB</a>
          <a href="#agents" className="hover:text-white">Bring your agent</a>
          <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
