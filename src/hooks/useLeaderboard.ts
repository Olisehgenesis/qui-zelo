import { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';
import { useQuizelo } from './useQuizelo';

interface LeaderboardEntry {
  user: string;
  score: bigint;
  timestamp: number;
  rank?: number;
}

interface LeaderboardStats {
  totalPlayers: number;
  totalQuizzes: number;
  totalRewards: bigint;
  totalFees: bigint;
  avgWinRate: number;
}

export const useLeaderboard = () => {
  const quizelo = useQuizelo();

  // State
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [topEarners, setTopEarners] = useState<LeaderboardEntry[]>([]);
  const [topStreaks, setTopStreaks] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'scores' | 'earners' | 'streaks'>('scores');

  // Fetch all leaderboard data from contract
  const fetchLeaderboardData = useCallback(async () => {
    // Check if all required functions are available
    if (!quizelo.getTopScoresLeaderboard || !quizelo.getTopEarnersLeaderboard || !quizelo.getTopStreaksLeaderboard) {
      console.warn('Leaderboard functions not available yet');
      return;
    }

    // Check if contract address is set
    if (!process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS) {
      console.warn('Contract address not configured');
      setError('Contract address not configured');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Fetch all three leaderboards with individual error handling
      const results = await Promise.allSettled([
        quizelo.getTopScoresLeaderboard?.(100) || Promise.resolve([]),
        quizelo.getTopEarnersLeaderboard?.(100) || Promise.resolve([]),
        quizelo.getTopStreaksLeaderboard?.(100) || Promise.resolve([]),
        quizelo.getGlobalStats?.() || Promise.resolve(null)
      ]);

      // Handle each result individually
      const scores = results[0].status === 'fulfilled' ? results[0].value : [];
      const earners = results[1].status === 'fulfilled' ? results[1].value : [];
      const streaks = results[2].status === 'fulfilled' ? results[2].value : [];
      const globalStats = results[3].status === 'fulfilled' ? results[3].value : null;

      // Log any failures (but only for unexpected errors)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['scores', 'earners', 'streaks', 'globalStats'];
          const error = result.reason as Error;
          // Only log if it's not a network/HTTP error
          if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('Cannot read properties')) {
            console.warn(`Failed to fetch ${names[index]}:`, error.message);
          }
        }
      });

      // Add ranks to entries
      const scoresWithRanks = scores.map((entry, index) => ({ ...entry, rank: index + 1 }));
      const earnersWithRanks = earners.map((entry, index) => ({ ...entry, rank: index + 1 }));
      const streaksWithRanks = streaks.map((entry, index) => ({ ...entry, rank: index + 1 }));

      setTopScores(scoresWithRanks);
      setTopEarners(earnersWithRanks);
      setTopStreaks(streaksWithRanks);

      // Calculate stats from global stats
      if (globalStats) {
        setStats({
          totalPlayers: globalStats.totalUsers,
          totalQuizzes: globalStats.totalQuizzes,
          totalRewards: globalStats.totalRewards,
          totalFees: globalStats.totalFees,
          avgWinRate: globalStats.averageScore // Using average score as proxy for win rate
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch leaderboard data:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, [quizelo]);

  // Get current leaderboard based on active tab
  const getCurrentLeaderboard = useCallback((): LeaderboardEntry[] => {
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
  }, [activeTab, topScores, topEarners, topStreaks]);

  // Get player rank in current leaderboard
  const getPlayerRank = useCallback((userAddress: string): number => {
    const currentLeaderboard = getCurrentLeaderboard();
    const player = currentLeaderboard.find(p => p.user.toLowerCase() === userAddress.toLowerCase());
    return player?.rank || 0;
  }, [getCurrentLeaderboard]);

  // Get player stats from current leaderboard
  const getPlayerStats = useCallback((userAddress: string): LeaderboardEntry | null => {
    const currentLeaderboard = getCurrentLeaderboard();
    return currentLeaderboard.find(p => p.user.toLowerCase() === userAddress.toLowerCase()) || null;
  }, [getCurrentLeaderboard]);

  // Get user's ranks across all leaderboards
  const getUserRanks = useCallback(async (userAddress: Address): Promise<{
    scoreRank: number;
    earnerRank: number;
    streakRank: number;
  }> => {
    try {
      const [scoreRank, earnerRank, streakRank] = await Promise.all([
        quizelo.getUserScoreRank(userAddress),
        quizelo.getUserEarnerRank(userAddress),
        quizelo.getUserStreakRank(userAddress)
      ]);

      return { scoreRank, earnerRank, streakRank };
    } catch (err) {
      console.error('Failed to get user ranks:', err);
      return { scoreRank: 0, earnerRank: 0, streakRank: 0 };
    }
  }, [quizelo]);

  // Get top players by category (for backward compatibility)
  const getTopByEarnings = useCallback((limit = 10) => {
    return topEarners.slice(0, limit);
  }, [topEarners]);

  const getTopByWinRate = useCallback((limit = 10) => {
    // Win rate not directly available, use scores as proxy
    return topScores.slice(0, limit);
  }, [topScores]);

  const getTopByQuizzes = useCallback((limit = 10) => {
    // Total quizzes not directly available, use earners as proxy
    return topEarners.slice(0, limit);
  }, [topEarners]);

  // Auto-refresh data - only if contract is ready
  useEffect(() => {
    // Don't fetch if contract functions aren't ready
    if (!quizelo.getTopScoresLeaderboard || !quizelo.getTopEarnersLeaderboard || !quizelo.getTopStreaksLeaderboard) {
      return;
    }

    // Small delay to ensure everything is initialized
    const timeoutId = setTimeout(() => {
      fetchLeaderboardData();
    }, 1000);
    
    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, 60000); // Refresh every minute

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [fetchLeaderboardData, quizelo.getTopScoresLeaderboard, quizelo.getTopEarnersLeaderboard, quizelo.getTopStreaksLeaderboard]);

  // Format functions
  const formatEarnings = useCallback((earnings: bigint): string => {
    const eth = Number(earnings) / 1e18;
    if (eth >= 1) return `${eth.toFixed(2)}`;
    if (eth >= 0.01) return `${eth.toFixed(3)}`;
    return `${eth.toFixed(4)}`;
  }, []);

  const formatScore = useCallback((score: bigint): string => {
    return `${Number(score)}%`;
  }, []);

  const formatStreak = useCallback((streak: bigint): string => {
    return `${Number(streak)} 🔥`;
  }, []);

  const formatWinRate = useCallback((winRate: number): string => {
    return `${winRate.toFixed(1)}%`;
  }, []);

  const formatAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    // Data
    topScores,
    topEarners,
    topStreaks,
    leaderboard: getCurrentLeaderboard(), // For backward compatibility
    stats,
    isLoading,
    error,
    lastUpdated,
    activeTab,
    setActiveTab,

    // Functions
    fetchLeaderboardData,
    getPlayerRank,
    getPlayerStats,
    getUserRanks,
    getTopByEarnings,
    getTopByWinRate,
    getTopByQuizzes,
    getCurrentLeaderboard,

    // Formatters
    formatEarnings,
    formatScore,
    formatStreak,
    formatWinRate,
    formatAddress,

    // Computed values
    hasData: topScores.length > 0 || topEarners.length > 0 || topStreaks.length > 0,
    isEmpty: !isLoading && topScores.length === 0 && topEarners.length === 0 && topStreaks.length === 0,
    isStale: lastUpdated ? Date.now() - lastUpdated.getTime() > 300000 : false // 5 minutes
  };
};
