import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig, injected } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

export const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [farcasterFrame(), injected()],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
