'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface ConnectWalletModalProps {
  isVisible: boolean;
  onClose: () => void;
  isMiniApp: boolean;
  isInFarcaster: boolean;
}

export const ConnectWalletModal = ({ 
  isVisible, 
  onClose, 
  isMiniApp, 
  isInFarcaster 
}: ConnectWalletModalProps) => {
  const { connect, connectors } = useConnect();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <motion.div 
            className="retro-card bg-white p-6 sm:p-8 w-full max-w-sm mx-4 z-[2]"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="retro-title-header">
              <span>🔗 Connect & Play!</span>
            </div>
            
            <div className="px-[1.5em] py-[1.5em] text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C65C1] rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              <p className="text-[#050505] text-sm sm:text-base mb-6 sm:mb-8 font-semibold">
                {isMiniApp && isInFarcaster 
                  ? '🎮 Connect your wallet to start your learning adventure!' 
                  : '🎮 Connect your Celo wallet to start your learning adventure and earn rewards!'
                }
              </p>
              
              {isMiniApp && isInFarcaster ? (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
                      if (farcasterConnector) {
                        connect({ connector: farcasterConnector });
                      } else {
                        connect({ connector: injected() });
                      }
                      onClose();
                    }}
                    className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em] mb-3"
                  >
                    🎯 Connect in Farcaster
                  </button>
                  
                  {connectors.length > 1 && (
                    <button
                      onClick={() => {
                        connect({ connector: connectors.find((c) => c.name.includes('Coinbase')) || connectors[1] });
                        onClose();
                      }}
                      className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em]"
                    >
                      🔵 Coinbase Wallet
                    </button>
                  )}
                  
                  {connectors.length > 2 && (
                    <button
                      onClick={() => {
                        connect({ connector: connectors.find((c) => c.name.includes('MetaMask')) || connectors[2] });
                        onClose();
                      }}
                      className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em]"
                    >
                      🦊 MetaMask
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      connect({ connector: injected() });
                      onClose();
                    }}
                    className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em] mb-4"
                  >
                    🚀 Connect Wallet
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full text-[#6b7280] py-2 text-sm hover:text-[#050505] transition-colors font-semibold"
              >
                ⏰ Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

