'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronRight, X } from 'lucide-react';
import { Address } from 'viem';
import { isTokenSupportedByMiniPay } from '~/lib/minipay';

interface FeeCurrencyModalProps {
  isVisible: boolean;
  onSelect: (tokenAddress: Address) => void;
  onClose?: () => void;
  supportedTokens: string[];
  isMiniPayWallet: boolean;
}

export const FeeCurrencyModal = ({
  isVisible,
  onSelect,
  onClose,
  supportedTokens,
  isMiniPayWallet,
}: FeeCurrencyModalProps) => {
  // Filter tokens based on MiniPay support
  const availableTokens = supportedTokens.filter((token) => {
    if (isMiniPayWallet) {
      // MiniPay only supports stablecoins, not CELO
      return isTokenSupportedByMiniPay(token);
    }
    return true; // All tokens available for non-MiniPay wallets
  });

  const getTokenInfo = (address: string) => {
    if (!address) return { name: 'Select Token', symbol: '---', icon: '💵' };
    
    const normalized = address.toLowerCase().trim();
    const tokenMap: Record<string, { name: string; symbol: string; icon: string }> = {
      '0x765de816845861e75a25fca122bb6898b8b1282a': {
        name: 'Celo Dollar',
        symbol: 'cUSD',
        icon: '💵',
      },
      '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e': {
        name: 'USDT',
        symbol: 'USDT',
        icon: '💚',
      },
      '0x471ece3750da237f93b8e339c536989b8978a438': {
        name: 'Celo',
        symbol: 'CELO',
        icon: '🌱',
      },
    };
    
    const tokenInfo = tokenMap[normalized];
    if (tokenInfo) return tokenInfo;
    
    // Fallback: show shortened address instead of "Unknown"
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return { name: shortAddress, symbol: 'TOKEN', icon: '💵' };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <motion.div
              className="retro-card bg-white p-6 w-full max-w-md mx-4 z-[2]"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="retro-title-header flex items-center justify-between">
                <span>💵 Select Payment Token</span>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-[#f7f7f7] rounded-[0.3em] transition-all border-2 border-[#050505]"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-[#050505]" />
                  </button>
                )}
              </div>
              
              <div className="px-[1.5em] py-[1.5em]">

                {isMiniPayWallet && (
                  <div className="retro-info-box mb-4 bg-[#fffbeb]">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-[#050505]">
                        <p className="font-bold mb-1">⚠️ MiniPay Notice</p>
                        <p className="font-semibold">
                          MiniPay only supports stablecoins (cUSD, USDC, USDT). 
                          CELO native token is not available in MiniPay.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {availableTokens.length === 0 ? (
                    <div className="retro-info-box p-4 text-center bg-[#fef2f2]">
                      <p className="font-bold text-[#050505]">No supported tokens available</p>
                      <p className="text-sm mt-2 text-[#050505] font-semibold">
                        Please ensure your wallet supports the required tokens.
                      </p>
                    </div>
                  ) : (
                    availableTokens.map((tokenAddress) => {
                      const tokenInfo = getTokenInfo(tokenAddress);
                      return (
                        <button
                          key={tokenAddress}
                          onClick={() => onSelect(tokenAddress as Address)}
                          className="w-full p-4 rounded-[0.4em] border-[0.2em] border-[#050505] bg-white hover:bg-[#f7f7f7] transition-all shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#7C65C1] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.1em_0.1em_0_#000000] text-left group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{tokenInfo.icon}</div>
                            <div className="flex-1">
                              <p className="font-black text-[#050505] group-hover:text-[#7C65C1] transition-colors">{tokenInfo.name}</p>
                              <p className="text-sm text-[#666] font-semibold">{tokenInfo.symbol}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#7C65C1] group-hover:text-[#6952A3] transition-colors" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="retro-info-box text-xs text-center bg-[#f7f7f7]">
                  <p className="font-bold text-[#050505] mb-1">Quiz fee: 0.05 tokens</p>
                  <p className="mt-1 text-[#050505] font-semibold">
                    💰 Entry fee is 0.05 tokens. Winnings range from 0.1 to 0.25+ tokens based on your score!
                  </p>
                  <p className="mt-2 text-[#050505] font-semibold">Gas fees will be paid in {isMiniPayWallet ? 'cUSD or CELO' : 'CELO'}</p>
                </div>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 text-sm font-bold text-[#666] hover:text-[#050505] transition-colors border-2 border-[#050505] hover:bg-[#f7f7f7]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

