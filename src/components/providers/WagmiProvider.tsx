import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { celo } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { metaMask, walletConnect } from 'wagmi/connectors';
import React from "react";



// Use multiple RPC endpoints for better reliability
const celoRpcUrls = [
  'https://celo.drpc.org',
  'https://rpc.ankr.com/celo',
  'https://celo-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
].filter(Boolean);

// const alfajoresRpcUrls = [
//   'https://alfajores-forno.celo-testnet.org',
//   'https://celo-alfajores.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
// ].filter(Boolean);

export const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(celoRpcUrls[0], {
      retryCount: 3,
      retryDelay: 1000,
    })
  },
  connectors: [
    injected(),
    // Only add farcasterFrame connector if we're in a browser environment
    // This prevents errors when the SDK is not available
    ...(typeof window !== 'undefined' ? [farcasterFrame()] : []),
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable auto-reconnect to prevent Farcaster connector errors
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});



export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
