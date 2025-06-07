import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

export const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [farcasterFrame()],
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
