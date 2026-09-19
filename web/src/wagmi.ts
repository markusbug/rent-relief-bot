import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { siteConfig } from "./site.config";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: siteConfig.name,
      preference: siteConfig.cbWalletPreference,
    }),
  ],
  transports: {
    [base.id]: http(siteConfig.baseRpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
