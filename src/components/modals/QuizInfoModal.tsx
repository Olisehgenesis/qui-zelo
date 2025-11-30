'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Play, ChevronDown, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Address, parseEther, formatUnits, parseUnits } from 'viem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useQuizelo } from '~/hooks/useQuizelo';
import { useAccount, usePublicClient } from 'wagmi';
import { erc20Abi } from 'viem';

// Hardcoded supported tokens
const SUPPORTED_TOKENS = [
  "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
  "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", // USDT
  "0x471EcE3750Da237f93B8E339c536989b8978a438", // CELO
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // USDC
] as const;

interface QuizInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStart: (token: string, betAmount: bigint) => void | Promise<void>;
  isLoading: boolean;
}

const getTokenInfo = (address: string) => {
  if (!address) return { name: 'Select Token', symbol: '---', icon: '💵', decimals: 18 };
  
  const normalized = address.toLowerCase().trim();
  const tokenMap: Record<string, { name: string; symbol: string; icon: string; decimals: number }> = {
    '0x765de816845861e75a25fca122bb6898b8b1282a': {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '💵',
      decimals: 18,
    },
    '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e': {
      name: 'USDT',
      symbol: 'USDT',
      icon: '💚',
      decimals: 6,
    },
    '0x471ece3750da237f93b8e339c536989b8978a438': {
      name: 'Celo',
      symbol: 'CELO',
      icon: '🌱',
      decimals: 18,
    },
    '0xceba9300f2b948710d2653dd7b07f33a8b32118c': {
      name: 'USD Coin',
      symbol: 'USDC',
      icon: '💙',
      decimals: 6,
    },
  };
  
  const tokenInfo = tokenMap[normalized];
  if (tokenInfo) return tokenInfo;
  
  // Fallback: show shortened address instead of "Unknown"
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return { name: shortAddress, symbol: 'TOKEN', icon: '💵', decimals: 18 };
};

// Format token amount with proper decimals
const formatTokenAmount = (amount: bigint, tokenAddress: string): string => {
  const tokenInfo = getTokenInfo(tokenAddress);
  const formatted = formatUnits(amount, tokenInfo.decimals);
  // Remove trailing zeros
  return formatted.replace(/\.?0+$/, '');
};

export const QuizInfoModal = ({ 
  isVisible, 
  onClose, 
  onStart, 
  isLoading
}: QuizInfoModalProps) => {
  const quizelo = useQuizelo();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, bigint>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  // Get fixed bet amount based on selected token decimals
  const getFixedBetAmount = (tokenAddress: string | null): bigint => {
    if (!tokenAddress) return parseEther('0.05');
    const tokenInfo = getTokenInfo(tokenAddress);
    return parseUnits('0.05', tokenInfo.decimals);
  };
  
  // CELO native token address
  const CELO_NATIVE = '0x471EcE3750Da237f93B8E339c536989b8978a438'.toLowerCase();

  // Initialize selected token
  useEffect(() => {
    if (quizelo.selectedToken) {
      setSelectedToken(quizelo.selectedToken);
    } else if (SUPPORTED_TOKENS.length > 0) {
      setSelectedToken(SUPPORTED_TOKENS[0]);
    }
  }, [quizelo.selectedToken]);


  // Load token balances function
  const loadBalances = useCallback(async () => {
    if (!address || !publicClient) {
      setTokenBalances({});
      return;
    }
    
    setLoadingBalances(true);
    const balances: Record<string, bigint> = {};
    
    // Load balances in parallel for better performance
    const balancePromises = SUPPORTED_TOKENS.map(async (token) => {
      try {
        const tokenLower = token.toLowerCase();
        
        // For CELO native token, use getBalance instead of ERC20 balanceOf
        if (tokenLower === CELO_NATIVE) {
          const balance = await publicClient.getBalance({ address: address as Address });
          balances[token] = balance;
        } else {
          // For ERC20 tokens, use balanceOf
          const balance = await publicClient.readContract({
            address: token as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as Address],
          }) as bigint;
          balances[token] = balance;
        }
      } catch (err) {
        console.error(`Failed to load balance for ${token}:`, err);
        balances[token] = 0n;
      }
    });
    
    await Promise.all(balancePromises);
    setTokenBalances(balances);
    setLoadingBalances(false);
  }, [address, publicClient, CELO_NATIVE]);

  // Load balances when modal opens or dependencies change
  useEffect(() => {
    if (isVisible && address) {
      loadBalances();
    } else {
      setTokenBalances({});
    }
  }, [isVisible, address, loadBalances]);

  if (!isVisible) return null;

  const handleStart = () => {
    if (!selectedToken) {
      alert('Please select a token');
      return;
    }

    // Check if user has sufficient balance
    const balance = tokenBalances[selectedToken] || 0n;
    const betAmount = getFixedBetAmount(selectedToken);
    if (balance < betAmount) {
      const tokenInfo = getTokenInfo(selectedToken);
      alert(`Insufficient balance. You need 0.05 ${tokenInfo.symbol} but only have ${formatTokenAmount(balance, selectedToken)} ${tokenInfo.symbol}`);
      return;
    }

    onStart(selectedToken, betAmount);
  };

  const selectedTokenInfo = selectedToken ? getTokenInfo(selectedToken) : null;
  const selectedBalance = selectedToken ? tokenBalances[selectedToken] || 0n : 0n;
  const fixedBetAmount = getFixedBetAmount(selectedToken);
  
  // Calculate potential rewards for fixed 0.05 bet
  // 60%: 2x, 70%: 3x, 80%: 4x, 90%+: 5x
  const minReward = fixedBetAmount * 2n; // 60%
  const maxReward = fixedBetAmount * 5n; // 90%+
  const rewards = selectedToken ? {
    min: formatTokenAmount(minReward, selectedToken),
    max: formatTokenAmount(maxReward, selectedToken)
  } : { min: '0', max: '0' };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <motion.div 
            className="retro-card bg-white p-6 sm:p-8 w-full max-w-sm mx-4 z-[2]"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="retro-title-header flex items-center justify-between">
              <span>🎮 Ready to Quest?</span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#f7f7f7] rounded-[0.3em] transition-all border-2 border-[#050505]"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#050505]" />
              </button>
            </div>
            
            <div className="px-[1.5em] py-[1.5em]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C65C1] rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              {/* Token Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-[#050505]">💵 Payment Token</label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadBalances();
                    }}
                    disabled={loadingBalances}
                    className="p-1.5 rounded-[0.3em] hover:bg-[#f7f7f7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh balances"
                  >
                    <RefreshCw className={`w-4 h-4 text-[#7C65C1] ${loadingBalances ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full p-3 rounded-[0.4em] border-[0.2em] border-[#050505] bg-white hover:bg-[#f7f7f7] transition-all shadow-[0.2em_0.2em_0_#000000] flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {selectedTokenInfo ? (
                        <>
                          <span className="text-2xl">{selectedTokenInfo.icon}</span>
                          <div className="text-left">
                            <p className="font-black text-[#050505]">{selectedTokenInfo.name}</p>
                            <div className="text-xs text-[#666] font-semibold">
                              {loadingBalances ? (
                                <span className="flex items-center space-x-1">
                                  <LoadingSpinner size={3} color="text-[#7C65C1]" />
                                  <span>Loading...</span>
                                </span>
                              ) : selectedToken ? (
                                `Balance: ${formatTokenAmount(selectedBalance, selectedToken)} ${selectedTokenInfo.symbol}`
                              ) : (
                                `Balance: 0 ${selectedTokenInfo.symbol}`
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-[#666]">Select a token</span>
                      )}
                    </div>
                    <ChevronDown className="w-5 h-5 text-[#7C65C1]" />
                  </button>
                  
                  {showTokenDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] max-h-60 overflow-y-auto">
                      {SUPPORTED_TOKENS.map((token) => {
                        const tokenInfo = getTokenInfo(token);
                        const balance = tokenBalances[token] || 0n;
                        return (
                          <button
                            key={token}
                            onClick={() => {
                              setSelectedToken(token);
                              setShowTokenDropdown(false);
                            }}
                            className="w-full p-3 hover:bg-[#f7f7f7] transition-all text-left flex items-center justify-between border-b border-[#e5e7eb] last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{tokenInfo.icon}</span>
                              <div>
                                <p className="font-black text-[#050505]">{tokenInfo.name}</p>
                                <div className="text-xs text-[#666] font-semibold">
                                  {loadingBalances ? (
                                    <span className="flex items-center space-x-1">
                                      <LoadingSpinner size={3} color="text-[#7C65C1]" />
                                      <span>Loading...</span>
                                    </span>
                                  ) : (
                                    `Balance: ${formatTokenAmount(balance, token)} ${tokenInfo.symbol}`
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedToken === token && (
                              <span className="text-[#7C65C1]">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Bet Amount Display */}
              <div className="mb-4">
                <div className="retro-info-box bg-[#fffbeb]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#050505]">💰 Entry Fee</span>
                    <span className="text-sm font-black text-[#f59e0b]">
                      0.05 {selectedTokenInfo?.symbol || 'tokens'}
                    </span>
                  </div>
                  <p className="text-xs text-[#050505] font-semibold">Fixed bet amount for all quizzes</p>
                  {selectedToken && selectedBalance < fixedBetAmount && selectedTokenInfo && (
                    <div className="mt-2 flex items-start space-x-2 bg-[#fef2f2] p-2 rounded-[0.3em] border border-[#ef4444]">
                      <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#ef4444] font-semibold">
                        Insufficient balance. You need 0.05 {selectedTokenInfo.symbol} but only have {formatTokenAmount(selectedBalance, selectedToken)} {selectedTokenInfo.symbol}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Potential Rewards */}
              <div className="retro-info-box mb-6 bg-[#f0fdf4]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#050505]">🏆 Potential Winnings</span>
                  <span className="text-sm font-black text-[#10b981]">
                    {rewards.min} - {rewards.max} {selectedTokenInfo?.symbol || 'tokens'}
                  </span>
                </div>
                <p className="text-xs text-[#050505] font-semibold">Win by scoring 60% or higher! Higher scores = bigger rewards!</p>
                <p className="text-xs text-[#050505] font-semibold mt-1">
                  📊 60%: 2x | 70%: 3x | 80%: 4x | 90%+: 5x
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleStart}
                  disabled={Boolean(isLoading || !selectedToken || (selectedToken && selectedBalance < fixedBetAmount))}
                  className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center space-x-3 uppercase tracking-[0.05em]"
                >
                  {isLoading ? (
                    <LoadingSpinner size={6} color="text-white" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 text-white" />
                      <span className="text-white">🚀 Start Quest</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full text-[#6b7280] py-2 text-sm hover:text-[#050505] transition-colors font-semibold"
                >
                  ⏰ Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

