'use client';

import { useEffect } from 'react';
import { 
  Wallet, 
  Trophy, 
  Clock, 
  Coins, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  Brain,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { celo } from 'viem/chains';
import { useChainId, useAccount } from 'wagmi';
import { Address } from 'viem';
import { sdk } from '@farcaster/frame-sdk';
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
}

const formatAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const HomeContent: React.FC<HomeContentProps> = ({
  isMiniApp,
  isInFarcaster,
  context,
  setShowConnectWallet,
  setShowTopicModal,
  switchToCelo,
  isSwitchingNetwork,
  setShowFeeCurrencyModal
}) => {
  const quizelo = useQuizelo();
  const { selectedTopic } = useTopics();
  const { error: aiError } = useAI();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  // Load contract stats for selected token
  useEffect(() => {
    if (isConnected && quizelo.supportedTokens.length > 0) {
      const token = quizelo.selectedToken || quizelo.supportedTokens[0];
      if (token) {
        quizelo.refetchContractStats(token as Address);
      }
    }
  }, [isConnected, quizelo.supportedTokens, quizelo.selectedToken, quizelo]);

  return (
    <div className="w-full p-3">
      <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
      {/* Hero Section - Retro Theme */}
      <div className="retro-card-group relative">
        <div className="retro-pattern-overlay" />
        <div className="retro-card bg-white p-4 text-[#050505] relative z-[2]">
          <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
            <div className="flex items-center space-x-3">
              <div className="bg-[#7C65C1] p-2 rounded-[0.3em]">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-mobile-xl sm:text-2xl font-black text-[#050505]">
                  🎮 Quizelo
                </h1>
                <p className="text-[#050505] font-bold text-mobile-xs">
                  {isMiniApp && isInFarcaster ? '🎭 Powered by Farcaster x Celo' : '🌱 Powered by Celo Magic'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-[1.5em] py-[1.5em]">
            <p className="text-[#050505] mb-4 text-mobile-sm leading-relaxed font-semibold">
              🎮 Level up your Celo knowledge and earn epic CELO rewards! Join thousands of crypto warriors on the ultimate blockchain adventure! ⚔️💰
            </p>
            
            {isConnected ? (
              <div className="p-3 bg-[#f7f7f7] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-4 h-4 text-[#050505]" />
                    <div>
                      <p className="text-[#050505] text-xs font-bold">
                        {isMiniApp && isInFarcaster 
                          ? `🎭 Farcaster Player (FID: ${context?.user?.fid || 'N/A'})` 
                          : '🎯 Player Connected'
                        }
                      </p>
                      <p className="font-mono text-[#050505] text-xs">{formatAddress(address || '')}</p>
                    </div>
                  </div>
                  <button
                    onClick={switchToCelo}
                    disabled={isSwitchingNetwork}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] transition-all disabled:opacity-50 disabled:cursor-not-allowed border-[0.1em] border-[#050505] shadow-md"
                  >
                    {isSwitchingNetwork ? (
                      <LoadingSpinner size={4} color="text-white" />
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 text-white" />
                        <span className="text-white text-xs font-medium">
                          {chainId === celo.id ? '✅ Celo' : '🔄 Switch to Celo'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
                {quizelo.selectedToken && setShowFeeCurrencyModal && (
                  <div className="mt-2 pt-2 border-t border-[#e5e7eb]">
                    <button
                      onClick={() => setShowFeeCurrencyModal(true)}
                      className="flex items-center justify-between w-full px-2 py-1.5 bg-white hover:bg-[#f0f0f0] rounded-[0.3em] border-[0.1em] border-[#050505] transition-all text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Coins className="w-3 h-3 text-[#7C65C1]" />
                        <span className="text-[#050505] text-xs font-bold">
                          Payment: {quizelo.selectedToken.slice(0, 6)}...{quizelo.selectedToken.slice(-4)}
                        </span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#7C65C1]" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#f7f7f7] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-4 h-4 text-[#050505]" />
                    <div>
                      <p className="text-[#050505] text-xs font-bold">
                        {isMiniApp && isInFarcaster ? '🔌 Wallet Not Connected in Farcaster' : '🔌 Wallet Not Connected'}
                      </p>
                      <p className="text-[#050505] text-xs">
                        {isMiniApp && isInFarcaster ? 'Connect your wallet to play!' : 'Connect to start playing!'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConnectWallet(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] transition-all border-[0.1em] border-[#050505] shadow-md"
                  >
                    <span className="text-white text-xs font-medium">🔗 Connect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Farcaster Mini App Features - Retro Theme */}
      {isMiniApp && isInFarcaster && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] flex items-center justify-center">
                  <span className="text-white text-sm">🎭</span>
                </div>
                <div>
                  <h3 className="font-black text-[#050505] text-mobile-sm">🚀 Farcaster Mini App</h3>
                  <p className="text-[#050505] text-mobile-xs">Special features for Farcaster users</p>
                </div>
              </div>
            </div>
            
            <div className="px-[1.5em] py-[1.5em]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowTopicModal(true)}
                  className="p-2 rounded-[0.3em] text-mobile-xs font-bold bg-[#7C65C1] text-white hover:bg-[#6952A3] transition-all border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]"
                >
                  🎮 Start Quiz
                </button>
                
                <button
                  onClick={() => {
                    const shareText = `🎮 Just played Quizelo and learned about ${selectedTopic?.title || 'Celo'}! Join me on this epic blockchain learning adventure and earn CELO rewards! 🌱💰\n\nTry it yourself: ${window.location.origin}`;
                    const encodedText = encodeURIComponent(shareText);
                    const composeUrl = `https://warpcast.com/~/compose?text=${encodedText}`;
                    sdk.actions.openUrl(composeUrl);
                  }}
                  className="p-2 rounded-[0.3em] text-mobile-xs font-bold bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-all border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]"
                >
                  📤 Share Quizelo
                </button>
                
                <button
                  onClick={() => sdk.actions.close()}
                  className="p-2 rounded-[0.3em] text-mobile-xs font-bold bg-[#ef4444] text-white hover:bg-[#dc2626] transition-all border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]"
                >
                  ❌ Close App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Stats - Retro Theme */}
      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-4 relative z-[2]">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-mobile-xs font-bold text-[#050505]">🏆 Todayz Quests</span>
              </div>
              <p className="text-mobile-xl sm:text-2xl font-black text-[#7C65C1]">
                {quizelo.userInfo?.dailyCount ?? 0}/{quizelo.maxDailyQuizzes ?? 3}
              </p>
              {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                <div className="mt-2 flex items-center justify-center">
                  <LoadingSpinner size={3} color="text-[#7C65C1]" />
                </div>
              )}
              {isMiniApp && !quizelo.userInfo && !quizelo.isLoading && (
                <div className="mt-2 flex items-center justify-center">
                  <button 
                    onClick={() => quizelo.refetchUserInfo()}
                    className="text-mobile-xs text-[#7C65C1] hover:text-[#6952A3] font-bold"
                  >
                    🔄 Retry
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-4 relative z-[2]">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-mobile-xs font-bold text-[#050505]">⏰ Next Quest</span>
              </div>
              <p className="text-mobile-lg sm:text-xl font-black text-[#7C65C1]">
                {quizelo.userInfo ? (
                  quizelo.timeUntilNextQuiz > 0 
                    ? `${Math.floor(quizelo.timeUntilNextQuiz / 60)}:${(quizelo.timeUntilNextQuiz % 60).toString().padStart(2, '0')}`
                    : 'Ready! 🚀'
                ) : (
                  isMiniApp && quizelo.isLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size={3} color="text-[#7C65C1]" />
                    </div>
                  ) : (
                    <span className="text-[#6b7280] font-semibold">Loading...</span>
                  )
                )}
              </p>
              {isMiniApp && !quizelo.userInfo && !quizelo.isLoading && (
                <div className="mt-2 flex items-center justify-center">
                  <button 
                    onClick={() => quizelo.refetchUserInfo()}
                    className="text-mobile-xs text-[#7C65C1] hover:text-[#6952A3] font-bold"
                  >
                    🔄 Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Status - Retro Theme */}
      {quizelo.contractStats && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="font-black text-[#050505] text-mobile-sm">⚡ Game Status</span>
              </div>
              {quizelo.contractStats.operational ? (
                <div className="flex items-center space-x-2 bg-[#10b981] px-2 py-1 rounded-[0.3em] border-[0.1em] border-[#050505]">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-mobile-xs font-bold text-white">🟢 Online</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-[#ef4444] px-2 py-1 rounded-[0.3em] border-[0.1em] border-[#050505]">
                  <AlertCircle className="w-3 h-3 text-white" />
                  <span className="text-mobile-xs font-bold text-white">🔴 Limited</span>
                </div>
              )}
            </div>
            <div className="px-[1.5em] py-[1.5em]">
              <div className="retro-info-box bg-[#f0fdf4] border-[0.15em] border-[#050505]">
                <p className="text-[#050505] text-mobile-xs mb-1 font-bold">💰 Reward Pool</p>
                <p className="font-black text-[#050505] text-mobile-base sm:text-lg">
                  {quizelo.formatEther(quizelo.contractStats.balance)} tokens ✨
                </p>
              </div>
              {quizelo.contractStats.totalQuizzes > 0 && (
                <div className="retro-info-box bg-[#eff6ff] border-[0.15em] border-[#050505] mt-3">
                  <p className="text-[#050505] text-mobile-xs mb-1 font-bold">📊 Total Quizzes</p>
                  <p className="font-black text-[#050505] text-mobile-base">{quizelo.contractStats.totalQuizzes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Stats Loading/Error State - Retro Theme */}
      {isConnected && !quizelo.contractStats && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="font-black text-[#050505] text-mobile-sm">⚡ Game Status</span>
              </div>
              {quizelo.isLoading ? (
                <div className="flex items-center space-x-2 bg-[#2563eb] px-2 py-1 rounded-[0.3em] border-[0.1em] border-[#050505]">
                  <LoadingSpinner size={3} color="text-white" />
                  <span className="text-mobile-xs font-bold text-white">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-[#f59e0b] px-2 py-1 rounded-[0.3em] border-[0.1em] border-[#050505]">
                  <AlertCircle className="w-3 h-3 text-white" />
                  <span className="text-mobile-xs font-bold text-white">Failed</span>
                </div>
              )}
            </div>
            <div className="px-[1.5em] py-[1.5em]">
              <div className="retro-info-box bg-[#fffbeb] border-[0.15em] border-[#050505]">
                <p className="text-[#050505] text-mobile-xs mb-1 font-bold">
                  {quizelo.isLoading ? '🔄 Loading contract data...' : '❌ Failed to load contract data'}
                </p>
                {!quizelo.isLoading && (
                  <button 
                    onClick={() => {
                      const token = quizelo.selectedToken || (quizelo.supportedTokens.length > 0 ? quizelo.supportedTokens[0] : null);
                      if (token) {
                        quizelo.refetchContractStats(token as Address);
                      }
                    }}
                    className="text-mobile-xs text-[#f59e0b] hover:text-[#d97706] font-bold underline"
                  >
                    🔄 Retry Loading
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Topic - Retro Theme */}
      {selectedTopic && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-3xl sm:text-4xl bg-[#7C65C1] w-14 h-14 sm:w-16 sm:h-16 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center">
                {selectedTopic.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[#050505] text-mobile-base sm:text-lg">🎯 {selectedTopic.title}</h3>
                <p className="text-[#6b7280] text-mobile-sm">{selectedTopic.description}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopicModal(true)}
              className="text-[#7C65C1] font-bold hover:text-[#6952A3] transition-colors flex items-center space-x-2 text-mobile-sm bg-[#f7f7f7] px-4 py-2 rounded-[0.3em] hover:bg-[#e8e8e8] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]"
            >
              <span>🔄 Change Quest</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status Messages - Retro Theme */}
      {quizelo.error && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-[#ef4444] flex-shrink-0" />
                <p className="text-[#050505] text-sm sm:text-base font-bold">⚠️ {quizelo.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {quizelo.success && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-[#10b981] flex-shrink-0" />
                <p className="text-[#050505] text-sm sm:text-base font-bold">✨ {quizelo.success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiError && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-white border-b-[0.35em] border-[#050505]">
              <div className="flex items-center space-x-3">
                <Brain className="w-6 h-6 text-[#f59e0b] flex-shrink-0" />
                <p className="text-[#050505] text-sm sm:text-base font-bold">🤖 {aiError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
