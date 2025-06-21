import { createConfig, http, WagmiProvider } from "wagmi";
import { celo , celoAlfajores} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { metaMask, walletConnect } from 'wagmi/connectors';
import React from "react";



export const config = createConfig({
  chains: [celo, celoAlfajores],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
  connectors: [
    farcasterFrame(),
    metaMask({
      dappMetadata: {
        name: "Quizelo",
        url: "https://quizelo.com",
      }
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
    }),
  ],
});

const queryClient = new QueryClient();



export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
