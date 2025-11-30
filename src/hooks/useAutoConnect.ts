import { useState, useEffect, useRef } from 'react';
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
// import farcasterFrame from '@farcaster/frame-wagmi-connector';
import { isMiniPay } from '~/lib/minipay';

interface UseAutoConnectProps {
  isSDKLoaded: boolean;
  isMiniApp: boolean;
  isInFarcaster: boolean;
  isConnected: boolean;
  context?: {
    client?: {
      clientFid?: number;
    };
  };
}

export const useAutoConnect = ({
  isSDKLoaded,
  isMiniApp,
  isInFarcaster,
  isConnected,
  context,
}: UseAutoConnectProps) => {
  const { connect, connectors } = useConnect();
  const hasAttemptedConnection = useRef(false);
  const [isMiniPayWallet, setIsMiniPayWallet] = useState(false);

  // Detect MiniPay wallet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMiniPayWallet(isMiniPay());
    }
  }, []);

  useEffect(() => {
    // Don't attempt if already connected or already attempted
    if (!isSDKLoaded || isConnected || hasAttemptedConnection.current) return;

    const attemptConnection = async () => {
      // Mark as attempted immediately to prevent re-runs
      hasAttemptedConnection.current = true;
      
      try {
        // Only attempt Farcaster connection if SDK is actually ready
        if (isMiniApp && isInFarcaster && context?.client?.clientFid) {
          // Try to connect with Farcaster frame connector first
          const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
          if (farcasterConnector) {
            try {
              await connect({ connector: farcasterConnector });
              return; // Success, exit early
            } catch (connError) {
              console.warn('Failed to connect with Farcaster connector:', connError);
              // Reset flag on error so we can try injected wallet
              hasAttemptedConnection.current = false;
            }
          }
        }
        
        // Fallback to injected wallet for MiniPay or if Farcaster failed
        if (isMiniPayWallet || !isMiniApp) {
          try {
            await connect({ connector: injected() });
          } catch (injectedError) {
            console.warn('Failed to connect with injected wallet:', injectedError);
            // Reset flag on error
            hasAttemptedConnection.current = false;
          }
        }
      } catch (error) {
        console.warn('Error during auto-connect:', error);
        // Reset flag on error
        hasAttemptedConnection.current = false;
      }
    };

    // Add a small delay to ensure everything is initialized
    const timeoutId = setTimeout(() => {
      attemptConnection();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isSDKLoaded, isMiniApp, isInFarcaster, isConnected, connect, connectors, isMiniPayWallet, context]);

  return { isMiniPayWallet };
};

