import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/frame-sdk';

interface SDKContext {
  client?: {
    clientFid?: number;
    safeAreaInsets?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
  user?: {
    fid?: number;
  };
}

export const useSDK = () => {
  const [context, setContext] = useState<SDKContext>();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Check if running in Mini App by checking the context
        // Only try to access SDK if we're in a browser environment
        if (typeof window !== 'undefined' && window.location) {
          try {
            const frameContext = await sdk.context;
            setContext(frameContext);
            
            const miniAppStatus = frameContext?.client?.clientFid !== undefined;
            setIsMiniApp(miniAppStatus);
            
            if (miniAppStatus) {
              // Call ready to dismiss Farcaster's loading screen
              try {
                await sdk.actions.ready();
              } catch (readyError) {
                console.warn('Failed to call sdk.actions.ready():', readyError);
                // Continue anyway
              }
            }
          } catch (sdkError) {
            // SDK not available or not in Farcaster context
            console.warn('Farcaster SDK not available:', sdkError);
            setIsMiniApp(false);
          }
        }
        
        setIsSDKLoaded(true);
      } catch (error) {
        console.warn('Error during SDK initialization:', error);
        // Still set as loaded to avoid infinite loading
        setIsSDKLoaded(true);
      }
    };
    
    load();
  }, []);

  const isInFarcaster = context?.client?.clientFid !== undefined;

  return {
    context,
    isSDKLoaded,
    isMiniApp,
    isInFarcaster,
  };
};

