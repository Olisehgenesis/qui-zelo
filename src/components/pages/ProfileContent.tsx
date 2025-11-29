'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Trophy, 
  Wallet,
  Settings,
  LogOut,
  Coins,
  Target,
  TrendingUp,
  Flame,
  Award,
  Clock
} from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { Address } from 'viem';
import { injected } from 'wagmi/connectors';
import { useQuizelo } from '~/hooks/useQuizelo';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProfileContentProps {
  isMiniApp: boolean;
  isInFarcaster: boolean;
  context?: {
    user?: {
      fid?: number;
    };
  };
  showProfileDropdown: boolean;
  setShowProfileDropdown: (show: boolean) => void;
  setShowConnectWallet: (show: boolean) => void;
}

const formatAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const ProfileContent: React.FC<ProfileContentProps> = ({
  isMiniApp,
  isInFarcaster,
  context,
  showProfileDropdown,
  setShowProfileDropdown,
  setShowConnectWallet
}) => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const quizelo = useQuizelo();
  const [quizHistory, setQuizHistory] = useState<Array<{
    sessionId: string;
    score: number;
    reward: bigint;
    timestamp: number;
  }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch user stats and history
  useEffect(() => {
    if (isConnected && address && quizelo.getUserStats && quizelo.getUserQuizHistory) {
      // Fetch user stats
      quizelo.getUserStats(address as Address).then((stats) => {
        if (stats) {
          // Stats are already in quizelo.userStats via refetchUserStats
        }
      });

      // Fetch quiz history
      setIsLoadingHistory(true);
      quizelo.getUserQuizHistory(address as Address, 10).then((history) => {
        setQuizHistory(history);
        setIsLoadingHistory(false);
      }).catch(() => {
        setIsLoadingHistory(false);
      });
    }
  }, [isConnected, address, quizelo]);

  return (
    <div className="space-y-4 w-full p-3">
      {/* Header - Retro Theme */}
      <div className="retro-card-group relative">
        <div className="retro-pattern-overlay" />
        <div className="retro-card bg-white p-4 relative z-[2]">
          <div className="retro-title-header bg-[#7C65C1]">
            <h2 className="text-mobile-2xl sm:text-3xl font-black text-white">
              👤 Player Profile
            </h2>
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="p-3 rounded-[0.3em] hover:bg-white/20 transition-colors border-[0.15em] border-white/30"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] py-2 z-10">
                  <button className="flex items-center w-full px-4 py-3 text-sm text-[#050505] hover:bg-[#f7f7f7] transition-colors font-semibold">
                    <Settings className="w-4 h-4 mr-3" />
                    ⚙️ Settings
                  </button>
                  <button className="flex items-center w-full px-4 py-3 text-sm text-[#ef4444] hover:bg-[#fef2f2] transition-colors font-semibold">
                    <LogOut className="w-4 h-4 mr-3" />
                    🔌 Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-4">
          {/* Wallet Info - Retro Theme */}
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-4 relative z-[2]">
              <div className="text-center px-[1.5em] py-[1.5em]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#7C65C1] rounded-full border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-6">
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <h3 className="font-black text-[#050505] text-mobile-xl sm:text-2xl mb-4">🎮 Connected Player</h3>
                <div className="retro-info-box bg-[#fffbeb]">
                  <p className="text-[#050505] text-mobile-sm font-bold mb-1">🔗 Wallet Address</p>
                  <p className="font-mono text-[#050505] font-bold text-mobile-sm">{formatAddress(address || '')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats - Retro Theme */}
          {quizelo.userStats && (
            <div className="retro-card-group relative">
              <div className="retro-pattern-overlay" />
              <div className="retro-card bg-white p-4 relative z-[2]">
                <div className="retro-title-header bg-[#7C65C1]">
                  <h4 className="font-black text-white text-mobile-base sm:text-lg flex items-center space-x-2">
                    <Trophy className="w-5 h-5" />
                    <span>📊 Player Statistics</span>
                  </h4>
                </div>
                <div className="px-[1.5em] py-[1.5em] grid grid-cols-2 gap-4">
                  {[
                    { 
                      icon: Target,
                      label: "🎯 Total Quizzes", 
                      value: quizelo.userStats.totalQuizzes,
                      bgColor: "#eff6ff",
                      borderColor: "#2563eb"
                    },
                    { 
                      icon: Coins,
                      label: "💰 Total Earnings", 
                      value: quizelo.formatEther(quizelo.userStats.totalEarnings),
                      bgColor: "#f0fdf4",
                      borderColor: "#10b981"
                    },
                    { 
                      icon: Award,
                      label: "🏆 Best Score", 
                      value: `${quizelo.userStats.bestScore}%`,
                      bgColor: "#fffbeb",
                      borderColor: "#f59e0b"
                    },
                    { 
                      icon: TrendingUp,
                      label: "📈 Avg Score", 
                      value: `${quizelo.userStats.averageScore.toFixed(1)}%`,
                      bgColor: "#fdf2f8",
                      borderColor: "#ec4899"
                    },
                    { 
                      icon: Flame,
                      label: "🔥 Current Streak", 
                      value: quizelo.userStats.currentStreak,
                      bgColor: "#fef2f2",
                      borderColor: "#ef4444"
                    },
                    { 
                      icon: Trophy,
                      label: "⭐ Longest Streak", 
                      value: quizelo.userStats.longestStreak,
                      bgColor: "#f3e8ff",
                      borderColor: "#a855f7"
                    },
                    { 
                      icon: Award,
                      label: "✅ Total Wins", 
                      value: quizelo.userStats.totalWins,
                      bgColor: "#ecfdf5",
                      borderColor: "#059669"
                    },
                    { 
                      icon: Clock,
                      label: "⏰ Last Activity", 
                      value: quizelo.userStats.lastActivity 
                        ? new Date(quizelo.userStats.lastActivity * 1000).toLocaleDateString()
                        : 'Never',
                      bgColor: "#f7f7f7",
                      borderColor: "#6b7280"
                    }
                  ].map((stat) => (
                    <div 
                      key={stat.label}
                      className="retro-info-box"
                      style={{ backgroundColor: stat.bgColor, borderColor: stat.borderColor }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <stat.icon className="w-4 h-4" style={{ color: stat.borderColor }} />
                        <span className="text-mobile-xs font-bold text-[#050505]">{stat.label}</span>
                      </div>
                      <p className="text-mobile-lg font-black text-[#050505]">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Daily Quiz Info - Retro Theme */}
          {quizelo.userInfo && (
            <div className="retro-card-group relative">
              <div className="retro-pattern-overlay" />
              <div className="retro-card bg-white p-4 relative z-[2]">
                <div className="retro-title-header bg-[#7C65C1]">
                  <h4 className="font-black text-white text-mobile-base sm:text-lg flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>📅 Daily Status</span>
                  </h4>
                </div>
                <div className="px-[1.5em] py-[1.5em] space-y-4">
                  {[
                    { 
                      label: "🎯 Today's quests", 
                      value: `${quizelo.userInfo?.dailyCount ?? 0}/${quizelo.maxDailyQuizzes ?? 3}`,
                      bgColor: "#eff6ff",
                      borderColor: "#2563eb"
                    },
                    { 
                      label: "🏆 Won today", 
                      value: quizelo.userInfo?.wonToday ? '✨ Yes!' : '⏳ Not yet',
                      bgColor: quizelo.userInfo?.wonToday ? "#f0fdf4" : "#f7f7f7",
                      borderColor: quizelo.userInfo?.wonToday ? "#10b981" : "#6b7280"
                    },
                    { 
                      label: "⚡ Ready to play", 
                      value: quizelo.userInfo?.canQuiz ? '🟢 Ready!' : '🔴 Wait',
                      bgColor: quizelo.userInfo?.canQuiz ? "#f0fdf4" : "#fef2f2",
                      borderColor: quizelo.userInfo?.canQuiz ? "#10b981" : "#ef4444"
                    }
                  ].map((stat) => (
                    <div 
                      key={stat.label}
                      className="retro-info-box flex justify-between items-center"
                      style={{ backgroundColor: stat.bgColor, borderColor: stat.borderColor }}
                    >
                      <span className="text-[#050505] font-bold text-mobile-sm">{stat.label}</span>
                      <span className={`font-black text-mobile-sm`} style={{ color: stat.borderColor }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                  
                  {/* Farcaster-specific stats */}
                  {isMiniApp && isInFarcaster && context?.user?.fid && (
                    <div className="retro-info-box flex justify-between items-center" style={{ backgroundColor: '#fdf2f8', borderColor: '#ec4899' }}>
                      <span className="text-[#050505] font-bold text-mobile-sm">🎭 Farcaster FID</span>
                      <span className="font-black text-[#050505] text-mobile-sm">
                        #{context.user.fid}
                      </span>
                    </div>
                  )}
                  
                  {/* Loading indicator for mini app */}
                  {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                    <div className="retro-info-box flex items-center justify-center" style={{ backgroundColor: '#f7f7f7', borderColor: '#6b7280' }}>
                      <div className="flex items-center space-x-3">
                        <LoadingSpinner size={5} color="text-[#6b7280]" />
                        <span className="text-[#050505] font-bold text-mobile-sm">🔄 Loading player data...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quiz History - Retro Theme */}
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-4 relative z-[2]">
              <div className="retro-title-header bg-[#7C65C1]">
                <h4 className="font-black text-white text-mobile-base sm:text-lg flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>📜 Quiz History</span>
                </h4>
              </div>
              <div className="px-[1.5em] py-[1.5em]">
                {isLoadingHistory ? (
                  <div className="retro-info-box flex items-center justify-center" style={{ backgroundColor: '#f7f7f7', borderColor: '#6b7280' }}>
                    <div className="flex items-center space-x-3">
                      <LoadingSpinner size={5} color="text-[#6b7280]" />
                      <span className="text-[#050505] font-bold text-mobile-sm">🔄 Loading history...</span>
                    </div>
                  </div>
                ) : quizHistory.length === 0 ? (
                  <div className="retro-info-box bg-[#fffbeb] text-center">
                    <p className="text-[#050505] font-bold">📜 No quiz history yet</p>
                    <p className="text-[#6b7280] text-mobile-sm font-semibold">Complete your first quiz to see your history! 🚀</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizHistory.map((entry, index) => (
                      <div
                        key={entry.sessionId || index}
                        className="retro-info-box flex justify-between items-center"
                        style={{ 
                          backgroundColor: entry.score >= 60 ? '#f0fdf4' : '#fef2f2',
                          borderColor: entry.score >= 60 ? '#10b981' : '#ef4444'
                        }}
                      >
                        <div>
                          <p className="text-[#050505] font-bold text-mobile-sm">
                            {entry.score >= 60 ? '✅' : '❌'} Score: {entry.score}%
                          </p>
                          <p className="text-[#6b7280] text-mobile-xs font-semibold">
                            {new Date(entry.timestamp * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#050505] text-mobile-sm">
                            {quizelo.formatEther(entry.reward)} tokens
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 text-center relative z-[2]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#6b7280] rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 className="font-black text-[#050505] text-mobile-xl sm:text-2xl mb-4">🔌 No Player Connected</h3>
            <p className="text-[#6b7280] mb-8 text-mobile-sm font-semibold">Connect your wallet to join the adventure and start earning epic rewards! 🎮</p>
            <button
              onClick={() => {
                connect({ connector: injected() });
                setShowConnectWallet(false);
              }}
              className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em]"
            >
              🚀 Connect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
