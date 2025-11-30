'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Wallet, 
  Trophy, 
  Clock, 
  Coins, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
  Play,
  X
} from 'lucide-react';
import { celo } from 'viem/chains';
import { useChainId, useAccount, usePublicClient } from 'wagmi';
import { Address, formatEther, formatUnits } from 'viem';
import { useQuizelo } from '~/hooks/useQuizelo';
import { useTopics } from '~/hooks/useTopics';
import { useAI } from '~/hooks/useAI';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface HomeContentProps {
  isMiniApp: boolean;
  isInFarcaster: boolean;
  context?: {
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
  };
  setShowConnectWallet: (show: boolean) => void;
  setShowTopicModal: (show: boolean) => void;
  switchToCelo: () => void;
  isSwitchingNetwork: boolean;
  setShowFeeCurrencyModal?: (show: boolean) => void;
  activeSessionId?: string | null;
  onResumeQuiz?: () => void;
  onDismissResume?: () => void;
  checkingActiveSession?: boolean;
}

// Hardcoded supported tokens
const SUPPORTED_TOKENS = [
  "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
  "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", // USDT
  "0x471EcE3750Da237f93B8E339c536989b8978a438", // CELO
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // USDC
] as const;

const formatAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const getTokenInfo = (address: string) => {
  if (!address) return { name: 'Select Token', symbol: '---', icon: '💵', color: '#6b7280', decimals: 18 };
  
  const normalized = address.toLowerCase().trim();
  const tokenMap: Record<string, { name: string; symbol: string; icon: string; color: string; decimals: number }> = {
    '0x765de816845861e75a25fca122bb6898b8b1282a': {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '💵',
      color: '#10b981',
      decimals: 18,
    },
    '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e': {
      name: 'USDT',
      symbol: 'USDT',
      icon: '💚',
      color: '#059669',
      decimals: 6,
    },
    '0x471ece3750da237f93b8e339c536989b8978a438': {
      name: 'Celo',
      symbol: 'CELO',
      icon: '🌱',
      color: '#7C65C1',
      decimals: 18,
    },
    '0xceba9300f2b948710d2653dd7b07f33a8b32118c': {
      name: 'USD Coin',
      symbol: 'USDC',
      icon: '💙',
      color: '#2563eb',
      decimals: 6,
    },
  };
  
  const tokenInfo = tokenMap[normalized];
  if (tokenInfo) return tokenInfo;
  
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return { name: shortAddress, symbol: 'TOKEN', icon: '💵', color: '#6b7280', decimals: 18 };
};

// Format token amount with proper decimals
const formatTokenAmount = (amount: bigint, tokenAddress: string): string => {
  const tokenInfo = getTokenInfo(tokenAddress);
  const formatted = formatUnits(amount, tokenInfo.decimals);
  // Remove trailing zeros
  return formatted.replace(/\.?0+$/, '');
};

export const HomeContent: React.FC<HomeContentProps> = ({
  isMiniApp,
  isInFarcaster,
  setShowConnectWallet,
  setShowTopicModal,
  switchToCelo,
  isSwitchingNetwork,
  setShowFeeCurrencyModal,
  activeSessionId,
  onResumeQuiz,
  onDismissResume,
  checkingActiveSession
}) => {
  const quizelo = useQuizelo();
  const { selectedTopic } = useTopics();
  const { error: aiError } = useAI();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [allTokenStats, setAllTokenStats] = useState<Record<string, { balance: bigint; operational: boolean }>>({});
  const [loadingTokenStats, setLoadingTokenStats] = useState(false);

  // Load contract stats for all supported tokens
  const loadAllTokenStats = useCallback(async () => {
    if (!publicClient) return;
    
    setLoadingTokenStats(true);
    const stats: Record<string, { balance: bigint; operational: boolean }> = {};
    
    const statPromises = SUPPORTED_TOKENS.map(async (token) => {
      try {
        const tokenStats = await quizelo.getContractStats(token as Address);
        if (tokenStats) {
          stats[token] = {
            balance: tokenStats.balance,
            operational: tokenStats.operational
          };
        }
      } catch (err) {
        console.error(`Failed to load stats for ${token}:`, err);
        stats[token] = { balance: 0n, operational: false };
      }
    });
    
    await Promise.all(statPromises);
    setAllTokenStats(stats);
    setLoadingTokenStats(false);
  }, [publicClient, quizelo]);

  useEffect(() => {
    if (isConnected) {
      const timeoutId = setTimeout(() => {
        loadAllTokenStats();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, loadAllTokenStats]);

  // Calculate total reward pool - we can't sum different decimals, so show as "Multiple tokens"
  const isAnyOperational = Object.values(allTokenStats).some(stat => stat.operational);
  const hasMultipleTokens = Object.keys(allTokenStats).length > 1;

  return (
    <div className="w-full p-4">
      <div className="max-w-2xl mx-auto">
        {/* Single Retro Card */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 sm:p-8 relative z-[2]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b-4 border-[#050505]">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-[#7C65C1] rounded-[0.3em] border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#050505] mb-1">
                    🎮 Quizelo
                  </h1>
                  <p className="text-sm font-bold text-[#6b7280]">
                    {isMiniApp && isInFarcaster ? '🎭 Farcaster x Celo' : '🌱 Celo Blockchain'}
                  </p>
                </div>
              </div>
              {isAnyOperational && (
                <div className="flex items-center space-x-2 bg-[#10b981] px-3 py-2 rounded-[0.3em] border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000]">
                  <Zap className="w-4 h-4 text-white" />
                  <span className="text-xs font-black text-white">LIVE</span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-[#050505] leading-relaxed font-semibold mb-6">
              Test your Celo knowledge and earn rewards! Answer questions correctly to multiply your bet. 🚀
            </p>

            {/* Connection Status */}
            <div className="mb-6 p-4 bg-[#f7f7f7] rounded-[0.4em] border-[0.2em] border-[#050505]">
              {isConnected ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-[#050505]" />
                      <div>
                        <p className="text-sm font-black text-[#050505]">
                          🎯 Connected
                        </p>
                        <p className="font-mono text-xs text-[#6b7280]">{formatAddress(address || '')}</p>
                      </div>
                    </div>
                    <button
                      onClick={switchToCelo}
                      disabled={isSwitchingNetwork}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] border-[0.15em] border-[#050505] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSwitchingNetwork ? (
                        <LoadingSpinner size={4} color="text-white" />
                      ) : (
                        <span className="text-white text-xs font-black">
                          {chainId === celo.id ? '✅ Celo' : '🔄 Switch'}
                        </span>
                      )}
                    </button>
                  </div>
                  {quizelo.selectedToken && setShowFeeCurrencyModal && (
                    <button
                      onClick={() => setShowFeeCurrencyModal(true)}
                      className="flex items-center justify-between w-full px-3 py-2 bg-white hover:bg-[#f0f0f0] rounded-[0.3em] border-[0.15em] border-[#050505] transition-all text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-[#7C65C1]" />
                        <span className="text-sm font-black text-[#050505]">
                          Payment: {getTokenInfo(quizelo.selectedToken || '').symbol}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#7C65C1]" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-5 h-5 text-[#050505]" />
                    <div>
                      <p className="text-sm font-black text-[#050505]">
                        🔌 Not Connected
                      </p>
                      <p className="text-xs text-[#6b7280]">Connect to start playing!</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConnectWallet(true)}
                    className="px-4 py-2 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] border-[0.15em] border-[#050505] transition-all"
                  >
                    <span className="text-white text-xs font-black">🔗 Connect</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reward Pool Section */}
            <div className="mb-6 pb-6 border-b-4 border-[#050505]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#10b981] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#050505]">💰 Reward Pool</h2>
                    <p className="text-xs text-[#6b7280] font-semibold">Total rewards available</p>
                  </div>
                </div>
                <button
                  onClick={loadAllTokenStats}
                  disabled={loadingTokenStats}
                  className="p-2 bg-[#f7f7f7] hover:bg-[#e8e8e8] rounded-[0.3em] border-[0.15em] border-[#050505] transition-all disabled:opacity-50"
                  title="Refresh balances"
                >
                  <RefreshCw className={`w-4 h-4 text-[#050505] ${loadingTokenStats ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingTokenStats ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size={6} color="text-[#7C65C1]" />
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {SUPPORTED_TOKENS.map((token) => {
                    const tokenInfo = getTokenInfo(token);
                    const stats = allTokenStats[token] || { balance: 0n, operational: false };
                    const balance = stats.balance;
                    
                    return (
                      <div
                        key={token}
                        className={`p-3 rounded-[0.3em] border-[0.15em] border-[#050505] ${
                          stats.operational ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{tokenInfo.icon}</span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-black text-[#050505] text-sm">{tokenInfo.name}</p>
                                <div className={`w-2 h-2 rounded-full border border-[#050505] ${
                                  stats.operational ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                                }`}></div>
                              </div>
                              <p className="text-xs text-[#6b7280] font-semibold">{tokenInfo.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-[#050505]">
                              {formatTokenAmount(balance, token)}
                            </p>
                            <p className="text-xs text-[#6b7280] font-semibold">{tokenInfo.symbol}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Total Summary */}
                  {hasMultipleTokens && (
                    <div className="mt-3 p-3 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-white" />
                          <p className="text-sm font-black text-white">Multiple Tokens</p>
                        </div>
                        <p className="text-lg font-black text-white">
                          {Object.keys(allTokenStats).length} tokens
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Game Stats Grid */}
            {isConnected && (
              <div className="mb-6 pb-6 border-b-4 border-[#050505]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-[#7C65C1] rounded-[0.2em] border-[0.15em] border-[#050505] flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-black text-[#050505]">Today&apos;s Quests</span>
                    </div>
                    <p className="text-2xl font-black text-[#7C65C1]">
                      {quizelo.userInfo?.dailyCount ?? 0}/{quizelo.maxDailyQuizzes ?? 3}
                    </p>
                    {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                      <div className="mt-2 flex items-center justify-center">
                        <LoadingSpinner size={3} color="text-[#7C65C1]" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-[#f59e0b] rounded-[0.2em] border-[0.15em] border-[#050505] flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-black text-[#050505]">Next Quest</span>
                    </div>
                    <p className="text-xl font-black text-[#f59e0b]">
                      {quizelo.userInfo ? (
                        quizelo.timeUntilNextQuiz > 0 
                          ? `${Math.floor(quizelo.timeUntilNextQuiz / 60)}:${(quizelo.timeUntilNextQuiz % 60).toString().padStart(2, '0')}`
                          : 'Ready! 🚀'
                      ) : (
                        <span className="text-sm text-[#6b7280]">Loading...</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Global Stats */}
            {quizelo.contractStats && (
              <div className="mb-6 pb-6 border-b-4 border-[#050505]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-[#2563eb] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#050505]">📊 Global Stats</h2>
                    <p className="text-xs text-[#6b7280] font-semibold">Platform statistics</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#eff6ff] rounded-[0.3em] border-[0.15em] border-[#050505]">
                    <p className="text-xs font-bold text-[#6b7280] mb-1">Total Quizzes</p>
                    <p className="text-xl font-black text-[#050505]">{quizelo.contractStats.totalQuizzes}</p>
                  </div>
                  <div className="p-3 bg-[#f0fdf4] rounded-[0.3em] border-[0.15em] border-[#050505]">
                    <p className="text-xs font-bold text-[#6b7280] mb-1">Active Now</p>
                    <p className="text-xl font-black text-[#050505]">{quizelo.contractStats.activeQuizCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Status */}
            {quizelo.contractStats && (
              <div className="mb-6">
                <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-[#050505]">Connected</span>
                    <span className="text-xs font-mono text-[#6b7280]">{formatAddress(address || '')}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-[#050505]">Status</span>
                    <span className={`text-xs font-black ${
                      quizelo.contractStats.operational ? 'text-[#10b981]' : 'text-[#ef4444]'
                    }`}>
                      {quizelo.contractStats.operational ? '✅ Operational' : '❌ Not Operational'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#050505]">Balance</span>
                    <span className="text-xs font-black text-[#050505]">
                      {quizelo.selectedToken 
                        ? `${formatTokenAmount(quizelo.contractStats.balance, quizelo.selectedToken)} ${getTokenInfo(quizelo.selectedToken).symbol}`
                        : formatEther(quizelo.contractStats.balance) + ' tokens'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-black text-[#050505]">Active</span>
                    <span className="text-xs font-black text-[#050505]">
                      {quizelo.contractStats.activeQuizCount} quizzes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#050505]">Total</span>
                    <span className="text-xs font-black text-[#050505]">
                      {quizelo.contractStats.totalQuizzes} quizzes
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Quiz Session - Resume */}
            {activeSessionId && onResumeQuiz && (
              <div className="mb-6">
                <div className="p-4 bg-[#fef3c7] rounded-[0.3em] border-[0.2em] border-[#f59e0b] shadow-[0.2em_0.2em_0_#f59e0b]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-12 h-12 bg-[#f59e0b] rounded-[0.3em] border-[0.15em] border-[#050505] flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-black text-[#050505] mb-1">⏸️ Quiz in Progress</h3>
                        <p className="text-sm text-[#6b7280] font-semibold">You have an active quiz session. Resume to continue!</p>
                      </div>
                    </div>
                    {onDismissResume && (
                      <button
                        onClick={onDismissResume}
                        className="p-1.5 hover:bg-black/10 rounded-[0.3em] transition-all flex-shrink-0"
                        aria-label="Dismiss"
                        title="Start a new quiz instead"
                      >
                        <X className="w-4 h-4 text-[#6b7280]" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onResumeQuiz}
                      disabled={checkingActiveSession}
                      className="flex-1 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-[0.3em] border-[0.15em] border-[#050505] transition-all flex items-center justify-center space-x-2 font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingActiveSession ? (
                        <>
                          <LoadingSpinner size={4} color="text-white" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>▶️ Resume Quiz</span>
                        </>
                      )}
                    </button>
                    {onDismissResume && (
                      <button
                        onClick={onDismissResume}
                        className="px-4 py-3 bg-white hover:bg-[#f0f0f0] text-[#6b7280] rounded-[0.3em] border-[0.15em] border-[#050505] transition-all font-black text-sm"
                      >
                        Start New
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Topic */}
            {selectedTopic && (
              <div className="mb-6">
                <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="text-3xl w-14 h-14 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] flex items-center justify-center">
                      {selectedTopic.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-[#050505] mb-1">🎯 {selectedTopic.title}</h3>
                      <p className="text-sm text-[#6b7280] font-semibold">{selectedTopic.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTopicModal(true)}
                    className="w-full py-2 bg-white hover:bg-[#f0f0f0] rounded-[0.3em] border-[0.15em] border-[#050505] transition-all flex items-center justify-center space-x-2 font-black text-sm text-[#050505]"
                  >
                    <span>🔄 Change Topic</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {quizelo.error && (
              <div className="mb-4 p-3 bg-[#fef2f2] rounded-[0.3em] border-[0.15em] border-[#ef4444]">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                  <p className="text-xs font-black text-[#050505]">⚠️ {quizelo.error}</p>
                </div>
              </div>
            )}

            {quizelo.success && (
              <div className="mb-4 p-3 bg-[#f0fdf4] rounded-[0.3em] border-[0.15em] border-[#10b981]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                  <p className="text-xs font-black text-[#050505]">✨ {quizelo.success}</p>
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-3 bg-[#fffbeb] rounded-[0.3em] border-[0.15em] border-[#f59e0b]">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                  <p className="text-xs font-black text-[#050505]">🤖 {aiError}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
