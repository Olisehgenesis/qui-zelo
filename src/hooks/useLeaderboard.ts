import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';

const QUIZELO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS as `0x${string}`;
const env = process.env.NEXT_PUBLIC_ENV;

interface LeaderboardEntry {
  address: string;
  totalQuizzes: number;
  totalWins: number;
  totalEarnings: bigint;
  winRate: number;
  rank: number;
  displayName: string;
}

interface LeaderboardStats {
  totalPlayers: number;
  totalQuizzes: number;
  totalRewards: bigint;
  avgWinRate: number;
}

export const useLeaderboard = () => {
  const publicClient = usePublicClient({ 
    chainId: env === 'dev' ? celoAlfajores.id : celo.id 
  });

  // State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get events from contract to build leaderboard
  const fetchLeaderboardData = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError('');

    try {
      // Get all QuizStarted and QuizCompleted events
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - 100000n; // Last ~100k blocks

      // Fetch QuizStarted events
      const quizStartedLogs = await publicClient.getLogs({
        address: QUIZELO_CONTRACT_ADDRESS,
        event: {
          name: 'QuizStarted',
          type: 'event',
          inputs: [
            { name: 'sessionId', type: 'bytes32', indexed: true },
            { name: 'user', type: 'address', indexed: true },
            { name: 'startTime', type: 'uint256', indexed: false }
          ]
        },
        fromBlock,
        toBlock: 'latest'
      });

      // Fetch QuizCompleted events
      const quizCompletedLogs = await publicClient.getLogs({
        address: QUIZELO_CONTRACT_ADDRESS,
        event: {
          name: 'QuizCompleted',
          type: 'event',
          inputs: [
            { name: 'sessionId', type: 'bytes32', indexed: true },
            { name: 'user', type: 'address', indexed: true },
            { name: 'score', type: 'uint256', indexed: false },
            { name: 'reward', type: 'uint256', indexed: false }
          ]
        },
        fromBlock,
        toBlock: 'latest'
      });

      // Process data
      const playerData = new Map<string, {
        totalQuizzes: number;
        totalWins: number;
        totalEarnings: bigint;
      }>();

      // Count quiz starts
      quizStartedLogs.forEach(log => {
        const user = log.args.user as string;
        if (!playerData.has(user)) {
          playerData.set(user, { totalQuizzes: 0, totalWins: 0, totalEarnings: 0n });
        }
        playerData.get(user)!.totalQuizzes++;
      });

      // Count wins and earnings
      quizCompletedLogs.forEach(log => {
        const user = log.args.user as string;
        const score = log.args.score as bigint;
        const reward = log.args.reward as bigint;

        if (playerData.has(user)) {
          const data = playerData.get(user)!;
          if (Number(score) >= 60) {
            data.totalWins++;
          }
          data.totalEarnings += reward;
        }
      });

      // Convert to leaderboard entries
      const entries: LeaderboardEntry[] = Array.from(playerData.entries())
        .map(([address, data]) => ({
          address,
          totalQuizzes: data.totalQuizzes,
          totalWins: data.totalWins,
          totalEarnings: data.totalEarnings,
          winRate: data.totalQuizzes > 0 ? (data.totalWins / data.totalQuizzes) * 100 : 0,
          rank: 0,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`
        }))
        .filter(entry => entry.totalQuizzes > 0)
        .sort((a, b) => {
          // Sort by total earnings first, then by win rate
          if (a.totalEarnings !== b.totalEarnings) {
            return Number(b.totalEarnings - a.totalEarnings);
          }
          return b.winRate - a.winRate;
        })
        .slice(0, 100) // Top 100
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Calculate stats
      const totalPlayers = entries.length;
      const totalQuizzes = entries.reduce((sum, entry) => sum + entry.totalQuizzes, 0);
      const totalRewards = entries.reduce((sum, entry) => sum + entry.totalEarnings, 0n);
      const avgWinRate = totalPlayers > 0 
        ? entries.reduce((sum, entry) => sum + entry.winRate, 0) / totalPlayers 
        : 0;

      setLeaderboard(entries);
      setStats({
        totalPlayers,
        totalQuizzes,
        totalRewards,
        avgWinRate
      });
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Failed to fetch leaderboard data:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Get player rank
  const getPlayerRank = useCallback((address: string): number => {
    const player = leaderboard.find(p => p.address.toLowerCase() === address.toLowerCase());
    return player?.rank || 0;
  }, [leaderboard]);

  // Get player stats
  const getPlayerStats = useCallback((address: string): LeaderboardEntry | null => {
    return leaderboard.find(p => p.address.toLowerCase() === address.toLowerCase()) || null;
  }, [leaderboard]);

  // Get top players by category
  const getTopByEarnings = useCallback((limit = 10) => {
    return [...leaderboard]
      .sort((a, b) => Number(b.totalEarnings - a.totalEarnings))
      .slice(0, limit);
  }, [leaderboard]);

  const getTopByWinRate = useCallback((limit = 10) => {
    return [...leaderboard]
      .filter(p => p.totalQuizzes >= 5) // At least 5 quizzes for meaningful win rate
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }, [leaderboard]);

  const getTopByQuizzes = useCallback((limit = 10) => {
    return [...leaderboard]
      .sort((a, b) => b.totalQuizzes - a.totalQuizzes)
      .slice(0, limit);
  }, [leaderboard]);

  // Auto-refresh data
  useEffect(() => {
    fetchLeaderboardData();
    
    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // Format functions
  const formatEarnings = useCallback((earnings: bigint): string => {
    const eth = Number(earnings) / 1e18;
    if (eth >= 1) return `${eth.toFixed(2)} CELO`;
    if (eth >= 0.01) return `${eth.toFixed(3)} CELO`;
    return `${eth.toFixed(4)} CELO`;
  }, []);

  const formatWinRate = useCallback((winRate: number): string => {
    return `${winRate.toFixed(1)}%`;
  }, []);

  const formatAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    // Data
    leaderboard,
    stats,
    isLoading,
    error,
    lastUpdated,

    // Functions
    fetchLeaderboardData,
    getPlayerRank,
    getPlayerStats,
    getTopByEarnings,
    getTopByWinRate,
    getTopByQuizzes,

    // Formatters
    formatEarnings,
    formatWinRate,
    formatAddress,

    // Computed values
    hasData: leaderboard.length > 0,
    isEmpty: !isLoading && leaderboard.length === 0,
    isStale: lastUpdated ? Date.now() - lastUpdated.getTime() > 300000 : false // 5 minutes
  };
};