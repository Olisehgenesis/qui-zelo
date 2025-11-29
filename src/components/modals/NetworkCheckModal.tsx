'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface NetworkCheckModalProps {
  showNetworkModal: boolean;
  isSwitchingNetwork: boolean;
  networkError: string;
  switchToCelo: () => void;
  setShowNetworkModal: (show: boolean) => void;
}

export const NetworkCheckModal = ({ 
  showNetworkModal,
  isSwitchingNetwork, 
  networkError, 
  switchToCelo,
  setShowNetworkModal 
}: NetworkCheckModalProps) => {
  if (!showNetworkModal) return null;
  
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
            initial={{ scale: 0.8, rotate: -3, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="retro-title-header bg-[#f59e0b]">
              <span>
                {isSwitchingNetwork ? '⚡ Switching Networks' : '🔄 Wrong Network'}
              </span>
            </div>
            
            <div className="px-[1.5em] py-[1.5em] text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-[#f59e0b]`}>
                {isSwitchingNetwork ? (
                  <LoadingSpinner size={8} color="text-white" />
                ) : (
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </div>
              
              <p className="text-[#050505] text-sm sm:text-base mb-6 font-semibold">
                {isSwitchingNetwork 
                  ? '🌟 Switching to Celo network...' 
                  : '🎮 Quizelo runs on the Celo network! Please switch to continue your adventure.'
                }
              </p>
              
              <div className="retro-info-box mb-6 bg-[#fffbeb]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#050505] font-bold">Current Network</span>
                  <span className="text-xs text-[#ef4444] font-black">❌ Wrong</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#050505] font-bold">Required Network</span>
                  <span className="text-xs text-[#10b981] font-black">✅ Celo</span>
                </div>
              </div>
              
              {networkError && (
                <div className="retro-info-box mb-4 bg-[#fef2f2]">
                  <p className="text-[#ef4444] text-xs font-bold">⚠️ {networkError}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={switchToCelo}
                  disabled={isSwitchingNetwork}
                  className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.3em_0.3em_0_#000000] uppercase tracking-[0.05em] flex items-center justify-center space-x-3"
                >
                  <div className="relative flex items-center space-x-3">
                    {isSwitchingNetwork ? (
                      <LoadingSpinner size={6} color="text-white" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-white" />
                    )}
                    <span className="text-white">
                      {isSwitchingNetwork ? '🔄 Switching...' : '🚀 Switch to Celo'}
                    </span>
                  </div>
                </button>
                
                {!isSwitchingNetwork && (
                  <button
                    onClick={() => setShowNetworkModal(false)}
                    className="w-full text-[#6b7280] py-2 text-sm hover:text-[#050505] transition-colors font-semibold"
                  >
                    ⏰ Maybe later
                  </button>
                )}
              </div>
              
              <div className="mt-4 retro-info-box bg-[#eff6ff]">
                <p className="text-xs text-[#2563eb] font-bold">
                  💡 Tip: You can also manually switch networks in your wallet settings
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

