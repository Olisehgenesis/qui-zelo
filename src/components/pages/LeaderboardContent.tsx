'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  User, 
  Coins, 
  RefreshCw,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { useLeaderboard } from '~/hooks/useLeaderboard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const LeaderboardContent: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { 
    topScores,
    topEarners,
    topStreaks,
    stats,
    isLoading: leaderboardLoading,
    error: leaderboardError,
    activeTab,
    setActiveTab,
    getUserRanks,
    formatEarnings,
    formatScore,
    formatStreak,
    formatAddress,
    fetchLeaderboardData,
  } = useLeaderboard();
  const [userRanks, setUserRanks] = useState<{
    scoreRank: number;
    earnerRank: number;
    streakRank: number;
  } | null>(null);

  // Fetch user ranks when connected
  useEffect(() => {
    if (isConnected && address && getUserRanks) {
      getUserRanks(address as Address).then(setUserRanks);
    }
  }, [isConnected, address, getUserRanks]);

  const getCurrentLeaderboard = () => {
    switch (activeTab) {
      case 'scores':
        return topScores;
      case 'earners':
        return topEarners;
      case 'streaks':
        return topStreaks;
      default:
        return topScores;
    }
  };

  const getCurrentLabel = () => {
    switch (activeTab) {
      case 'scores':
        return '🏆 Top Scores';
      case 'earners':
        return '💰 Top Earners';
      case 'streaks':
        return '🔥 Top Streaks';
      default:
        return '🏆 Top Scores';
    }
  };

  const formatCurrentValue = (entry: typeof topScores[0]) => {
    switch (activeTab) {
      case 'scores':
        return formatScore(entry.score);
      case 'earners':
        return `${formatEarnings(entry.score)} tokens`;
      case 'streaks':
        return formatStreak(entry.score);
      default:
        return formatScore(entry.score);
    }
  };

  const getCurrentRank = () => {
    if (!address || !userRanks) return 0;
    switch (activeTab) {
      case 'scores':
        return userRanks.scoreRank;
      case 'earners':
        return userRanks.earnerRank;
      case 'streaks':
        return userRanks.streakRank;
      default:
        return userRanks.scoreRank;
    }
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getCurrentRank = getCurrentRank;

  return (
    <div className="space-y-4 w-full p-3">
      {/* Header - Retro Theme */}
      <div className="retro-card-group relative">
        <div className="retro-pattern-overlay" />
        <div className="retro-card bg-white p-4 relative z-[2]">
          <div className="retro-title-header bg-[#7C65C1]">
            <h2 className="text-mobile-2xl sm:text-3xl font-black text-white">
              🏆 Hall of Fame
            </h2>
            <button
              onClick={() => fetchLeaderboardData()}
              className="p-3 rounded-[0.3em] hover:bg-white/20 transition-colors border-[0.15em] border-white/30"
            >
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Selector - Retro Theme */}
      <div className="retro-card-group relative">
        <div className="retro-pattern-overlay" />
        <div className="retro-card bg-white p-4 relative z-[2]">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'scores' as const, label: '🏆 Scores', icon: Trophy },
              { id: 'earners' as const, label: '💰 Earners', icon: Coins },
              { id: 'streaks' as const, label: '🔥 Streaks', icon: Flame }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3 rounded-[0.3em] font-bold text-mobile-xs border-[0.15em] border-[#050505] transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#7C65C1] text-white shadow-[0.2em_0.2em_0_#000000]'
                    : 'bg-white text-[#050505] hover:bg-[#f7f7f7] shadow-[0.15em_0.15em_0_#000000]'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Stats - Retro Theme */}
      {stats && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-[#10b981]">
              <h3 className="font-black text-white text-mobile-base sm:text-lg">📊 Global Stats</h3>
            </div>
            <div className="px-[1.5em] py-[1.5em] grid grid-cols-2 gap-3">
              <div className="retro-info-box bg-[#f0fdf4]">
                <p className="text-[#050505] text-mobile-xs font-bold mb-1">👥 Total Players</p>
                <p className="font-black text-[#050505] text-mobile-lg">{stats.totalPlayers}</p>
              </div>
              <div className="retro-info-box bg-[#eff6ff]">
                <p className="text-[#050505] text-mobile-xs font-bold mb-1">🎯 Total Quizzes</p>
                <p className="font-black text-[#050505] text-mobile-lg">{stats.totalQuizzes}</p>
              </div>
              <div className="retro-info-box bg-[#fffbeb]">
                <p className="text-[#050505] text-mobile-xs font-bold mb-1">💰 Total Rewards</p>
                <p className="font-black text-[#050505] text-mobile-sm">{formatEarnings(stats.totalRewards)} tokens</p>
              </div>
              <div className="retro-info-box bg-[#fdf2f8]">
                <p className="text-[#050505] text-mobile-xs font-bold mb-1">💵 Total Fees</p>
                <p className="font-black text-[#050505] text-mobile-sm">{formatEarnings(stats.totalFees)} tokens</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - Retro Theme */}
      {leaderboardLoading && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 text-center relative z-[2]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C65C1] rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-6">
              <LoadingSpinner size={8} color="text-white" />
            </div>
            <h3 className="text-mobile-xl sm:text-2xl font-black text-[#050505] mb-4">🔄 Loading Leaderboard</h3>
            <p className="text-[#6b7280] font-semibold">📊 Fetching the latest player data...</p>
          </div>
        </div>
      )}

      {/* Error State - Retro Theme */}
      {!leaderboardLoading && leaderboardError && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <div className="retro-title-header bg-[#ef4444]">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
                <p className="text-white font-bold">❌ Failed to load leaderboard data</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List - Retro Theme */}
      {!leaderboardLoading && !leaderboardError && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-[#7C65C1]">
              <h3 className="font-black text-white text-mobile-base sm:text-lg">{getCurrentLabel()}</h3>
            </div>
            <div className="px-[1.5em] py-[1.5em] space-y-3">
              {getCurrentLeaderboard().length === 0 ? (
                <div className="retro-info-box bg-[#fffbeb] text-center">
                  <p className="text-[#050505] font-bold">📊 No entries yet</p>
                  <p className="text-[#6b7280] text-mobile-sm font-semibold">Be the first to complete a quiz! 🚀</p>
                </div>
              ) : (
                getCurrentLeaderboard().slice(0, 50).map((entry, index) => {
                  const isCurrentUser = address?.toLowerCase() === entry.user.toLowerCase();
                  return (
                    <div
                      key={`${entry.user}-${index}`}
                      className={`retro-info-box flex items-center justify-between ${
                        isCurrentUser ? 'bg-[#fef3c7] border-[#f59e0b]' : 'bg-[#f7f7f7]'
                      }`}
                      style={isCurrentUser ? { borderColor: '#f59e0b', borderWidth: '0.2em' } : {}}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-[0.3em] border-[0.15em] border-[#050505] flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-[#fbbf24] text-[#050505]' :
                          index === 1 ? 'bg-[#94a3b8] text-white' :
                          index === 2 ? 'bg-[#f97316] text-white' :
                          'bg-white text-[#050505]'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${entry.rank || index + 1}`}
                        </div>
                        <div>
                          <p className={`font-bold text-mobile-sm ${isCurrentUser ? 'text-[#f59e0b]' : 'text-[#050505]'}`}>
                            {isCurrentUser ? '✨ You' : formatAddress(entry.user)}
                          </p>
                          <p className="text-[#6b7280] text-mobile-xs font-semibold">
                            {new Date(entry.timestamp * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#050505] text-mobile-base">
                          {formatCurrentValue(entry)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Player Stats - Retro Theme */}
      {isConnected && address && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-4 relative z-[2]">
            <div className="retro-title-header bg-[#7C65C1]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#7C65C1]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-mobile-base sm:text-lg">📊 Your Rankings</h3>
                  <p className="text-white/90 text-mobile-sm font-semibold">{formatAddress(address || '')}</p>
                </div>
              </div>
            </div>
            
            <div className="px-[1.5em] py-[1.5em]">
              {userRanks ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { 
                      label: "🏆 Score Rank", 
                      value: userRanks.scoreRank || 'N/A',
                      bgColor: "#fffbeb",
                      borderColor: "#f59e0b"
                    },
                    { 
                      label: "💰 Earner Rank", 
                      value: userRanks.earnerRank || 'N/A',
                      bgColor: "#f0fdf4",
                      borderColor: "#10b981"
                    },
                    { 
                      label: "🔥 Streak Rank", 
                      value: userRanks.streakRank || 'N/A',
                      bgColor: "#fef2f2",
                      borderColor: "#ef4444"
                    }
                  ].map((stat) => (
                    <div 
                      key={stat.label}
                      className="retro-info-box text-center"
                      style={{ backgroundColor: stat.bgColor, borderColor: stat.borderColor }}
                    >
                      <p className="text-mobile-xs font-bold text-[#050505] mb-1">{stat.label}</p>
                      <p className="text-mobile-xl font-black text-[#050505]">
                        {stat.value === 'N/A' ? '—' : `#${stat.value}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="retro-info-box bg-[#fffbeb] text-center">
                  <p className="text-[#050505] font-bold">📊 No rankings yet</p>
                  <p className="text-[#6b7280] text-mobile-sm font-semibold">Complete your first quiz to get ranked! 🚀</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
