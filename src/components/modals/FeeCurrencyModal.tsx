'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertCircle, ChevronRight } from 'lucide-react';
import { Address } from 'viem';
import { isTokenSupportedByMiniPay } from '~/lib/minipay';

interface FeeCurrencyModalProps {
  isVisible: boolean;
  onSelect: (tokenAddress: Address) => void;
  supportedTokens: string[];
  isMiniPayWallet: boolean;
}

export const FeeCurrencyModal = ({
  isVisible,
  onSelect,
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
    const tokenMap: Record<string, { name: string; symbol: string; icon: string }> = {
      '0x765DE816845861e75A25fCA122bb6898B8B1282a': {
        name: 'Celo Dollar',
        symbol: 'cUSD',
        icon: '💵',
      },
      '0xcebA9300f2b948710d2653dD7B07f33A8B32118C': {
        name: 'USDC',
        symbol: 'USDC',
        icon: '💙',
      },
      '0x48065fbbe25f71C9282ddf5e1cD6D6A887483D5e': {
        name: 'USDT',
        symbol: 'USDT',
        icon: '💚',
      },
      '0x471EcE3750Da237f93B8E339c536989b8978a438': {
        name: 'Celo Native',
        symbol: 'CELO',
        icon: '🌱',
      },
    };
    return tokenMap[address.toLowerCase()] || { name: 'Unknown', symbol: 'UNK', icon: '❓' };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-[0.4em] p-6 w-full max-w-md border-[0.2em] border-[#050505] shadow-[0.4em_0.4em_0_#000000] relative"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#050505]">Select Payment Token</h2>
                  <p className="text-sm text-[#6b7280]">Choose your preferred currency</p>
                </div>
              </div>
            </div>

            {isMiniPayWallet && (
              <div className="mb-4 p-3 bg-amber-50 border-[0.15em] border-amber-300 rounded-[0.3em]">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-bold mb-1">⚠️ MiniPay Notice</p>
                    <p>
                      MiniPay only supports stablecoins (cUSD, USDC, USDT). 
                      CELO native token is not available in MiniPay.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {availableTokens.length === 0 ? (
                <div className="p-4 text-center text-[#6b7280]">
                  <p className="font-bold">No supported tokens available</p>
                  <p className="text-sm mt-2">
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
                      className="w-full p-4 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white hover:bg-[#f7f7f7] transition-all shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{tokenInfo.icon}</div>
                        <div className="flex-1">
                          <p className="font-black text-[#050505]">{tokenInfo.name}</p>
                          <p className="text-sm text-[#6b7280]">{tokenInfo.symbol}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#7C65C1]" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="text-xs text-center text-[#6b7280] pt-2 border-t border-[#e5e7eb]">
              <p className="font-bold">Quiz fee: 100 tokens</p>
              <p className="mt-1 text-[#ef4444]">
                ⚠️ Note: Contract currently requires 100 tokens. 
                To use 0.1 cUSD, the contract QUIZ_FEE constant needs to be updated.
              </p>
              <p className="mt-2">Gas fees will be paid in {isMiniPayWallet ? 'cUSD or CELO' : 'CELO'}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

