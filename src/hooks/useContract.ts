import { useState, useEffect, useCallback } from 'react';
import { formatEther, parseEther } from 'viem';
import { 
  useAccount, 
  usePublicClient, 
  useWalletClient, 
  useSendTransaction, 
  useChainId,
  useSwitchChain,
  useReadContract
} from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { Interface } from 'ethers';
import { quizABI } from '../abi/quizABI';

// Contract configuration
const QUIZELO_CONTRACT_ADDRESS = import.meta.env.VITE_QUIZELO_CONTRACT_ADDRESS  as `0x${string}`; 
const env = import.meta.env.VITE_ENV;

//if env is dev , use alfjores instead of celo

// Centralized Divvi configuration
const DIVVI_CONFIG = {
  consumer: '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as `0x${string}`,
  providers: [
    '0x0423189886d7966f0dd7e7d256898daeee625dca',
    '0xc95876688026be9d6fa7a7c33328bd013effa2bb', 
    '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
  ] as `0x${string}`[]
};

// Types
interface UserStats {
  totalQuizzesTaken: number;
  totalCorrectAnswers: number;
  totalEarnings: bigint;
  streak: number;
}

interface QuizAttempt {
  timestamp: number;
  correct: boolean;
  earnings: bigint;
}

interface LeaderboardEntry {
  user: string;
  score: number;
}

interface UserQuizStatus {
  dailyCount: number;
  lastQuizTime: number;
  cooldownEnd: number;
  wonToday: number;
  canTakeQuiz: boolean;
}

// Custom hook for Divvi-enabled transactions
const useDivviTransaction = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const executeWithDivvi = useCallback(async ({
    functionName,
    args = [],
    value,
    onSuccess,
    onError
  }: {
    functionName: string;
    args?: any[];
    value?: bigint;
    onSuccess?: (txHash: string) => void;
    onError?: (error: Error) => void;
  }) => {
    try {
      if (!walletClient) throw new Error('Wallet not connected');

      // Always switch to Celo before executing transaction
      if (chainId !== chainId) {
        console.log('🔄 Switching to Celo network...');
        await switchChain({ chainId: chainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create interface and encode function data
      const quizeloInterface = new Interface(quizABI);
      const encodedData = quizeloInterface.encodeFunctionData(functionName, args);

      // Get Divvi data suffix
      const dataSuffix = getDataSuffix(DIVVI_CONFIG);
      const finalData = encodedData + dataSuffix;

      // Send transaction with Divvi integration
      const txHash = await sendTransactionAsync({
        to: QUIZELO_CONTRACT_ADDRESS,
        data: finalData as `0x${string}`,
        value,
      });

      if (!txHash) throw new Error('Transaction failed to send');

      // Wait for confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        if (receipt.status === 'success') {
          // Submit to Divvi
          try {
            const chainId = await walletClient.getChainId();
            await submitReferral({
              txHash: txHash as `0x${string}`,
              chainId
            });
            console.log('✅ Divvi referral submitted successfully');
          } catch (referralError) {
            console.error('Referral submission error:', referralError);
          }

          onSuccess?.(txHash);
          return txHash;
        } else {
          throw new Error('Transaction failed');
        }
      }

      return txHash;
    } catch (error) {
      console.error(`Error in ${functionName}:`, error);
      onError?.(error as Error);
      throw error;
    }
  }, [sendTransactionAsync, walletClient, publicClient, chainId, switchChain]);

  return { executeWithDivvi };
};

// Main Quizelo hook
export const useQuizelo = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { executeWithDivvi } = useDivviTransaction();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Quiz state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userQuizStatus, setUserQuizStatus] = useState<UserQuizStatus | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contractConfig, setContractConfig] = useState({
    minimumBalance: 0n,
    rewardAmount: 0n,
    cooldownPeriod: 0,
    maxDailyQuizzes: 0,
    isPaused: false
  });

  // Contract read hooks
  const { data: userStatsData, refetch: refetchUserStats } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  console.log(userStatsData);

  const { data: userQuizStatusData, refetch: refetchUserQuizStatus } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'canUserTakeQuiz',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  console.log(userQuizStatusData);
  const { data: minimumBalance } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'MIN_CONTRACT_BALANCE'
  });

  const { data: rewardAmount } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'REWARD_AMOUNT'
  });

  const { data: cooldownPeriod } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'COOLDOWN_PERIOD'
  });

  const { data: maxDailyQuizzes } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'MAX_DAILY_QUIZZES'
  });

  const { data: isPaused } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'paused'
  });

  // Utility functions
  const resetMessages = useCallback(() => {
    setError('');
    setSuccess('');
    setTxHash('');
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  }, []);

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    if (!address || !publicClient) return;

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserStats',
        args: [address]
      }) as [bigint, bigint, bigint, bigint];

      setUserStats({
        totalQuizzesTaken: Number(stats[0]),
        totalCorrectAnswers: Number(stats[1]),
        totalEarnings: stats[2],
        streak: Number(stats[3])
      });
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  }, [address, publicClient]);

  // Fetch user quiz status
  const fetchUserQuizStatus = useCallback(async () => {
    if (!address || !publicClient) return;

    try {
      const [dailyCount, lastQuizTime, cooldownEnd, wonToday, canTake] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'canUserTakeQuiz',
        args: [address]
      }) as [bigint, bigint, bigint, bigint, boolean];

      setUserQuizStatus({
        dailyCount: Number(dailyCount),
        lastQuizTime: Number(lastQuizTime),
        cooldownEnd: Number(cooldownEnd),
        wonToday: Number(wonToday),
        canTakeQuiz: canTake
      });
    } catch (err) {
      console.error('Failed to fetch user quiz status:', err);
    }
  }, [address, publicClient]);

  // Fetch quiz history
  const fetchQuizHistory = useCallback(async (offset = 0, limit = 10) => {
    if (!address || !publicClient) return;

    try {
      const history = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getQuizHistory',
        args: [address, BigInt(offset), BigInt(limit)]
      }) as Array<[bigint, boolean, bigint]>;

      const formattedHistory = history.map(([timestamp, correct, earnings]) => ({
        timestamp: Number(timestamp),
        correct,
        earnings
      }));

      setQuizHistory(formattedHistory);
    } catch (err) {
      console.error('Failed to fetch quiz history:', err);
    }
  }, [address, publicClient]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (limit = 10) => {
    if (!publicClient) return;

    try {
      const [users, scores] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getLeaderboard',
        args: [BigInt(limit)]
      }) as [string[], bigint[]];

      const leaderboardData = users.map((user, index) => ({
        user,
        score: Number(scores[index])
      }));

      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, [publicClient]);

  // Contract interaction functions
  const takeQuiz = async (answerHash: string) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    if (chainId !== chainId) {
      try {
        await switchChain({ chainId: chainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        showError('Please switch to Celo network first');
        return;
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'takeQuiz',
        args: [answerHash],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🎯 Quiz taken successfully!');
          // Refresh data
          fetchUserStats();
          fetchUserQuizStatus();
        },
        onError: (error) => {
          showError('Failed to take quiz: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    if (chainId !== chainId) {
      try {
        await switchChain({ chainId: chainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        showError('Please switch to Celo network first');
        return;
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'submitAnswer',
        args: [answer],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('📝 Answer submitted successfully!');
          // Refresh data
          fetchUserStats();
          fetchUserQuizStatus();
          fetchQuizHistory();
        },
        onError: (error) => {
          showError('Failed to submit answer: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    if (chainId !== chainId) {
      try {
        await switchChain({ chainId: chainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        showError('Please switch to Celo network first');
        return;
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'claimReward',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💰 Reward claimed successfully!');
          // Refresh data
          fetchUserStats();
        },
        onError: (error) => {
          showError('Failed to claim reward: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Admin functions (if user is owner)
  const updateQuizQuestion = async (questionHash: string, correctAnswerHash: string) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'updateQuizQuestion',
        args: [questionHash, correctAnswerHash],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('📚 Quiz question updated successfully!');
        },
        onError: (error) => {
          showError('Failed to update quiz question: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setRewardAmount = async (amount: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'setRewardAmount',
        args: [amount],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💰 Reward amount updated successfully!');
        },
        onError: (error) => {
          showError('Failed to set reward amount: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setCooldownPeriod = async (period: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'setCooldownPeriod',
        args: [period],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('⏰ Cooldown period updated successfully!');
        },
        onError: (error) => {
          showError('Failed to set cooldown period: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxDailyQuizzes = async (max: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'setMaxDailyQuizzes',
        args: [max],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('📊 Max daily quizzes updated successfully!');
        },
        onError: (error) => {
          showError('Failed to set max daily quizzes: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setMinimumBalance = async (balance: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'setMinimumBalance',
        args: [balance],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💎 Minimum balance updated successfully!');
        },
        onError: (error) => {
          showError('Failed to set minimum balance: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pauseContract = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'pause',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('⏸️ Contract paused successfully!');
        },
        onError: (error) => {
          showError('Failed to pause contract: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unpauseContract = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'unpause',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('▶️ Contract unpaused successfully!');
        },
        onError: (error) => {
          showError('Failed to unpause contract: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fundContract = async (amount: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'fundContract',
        args: [],
        value: amount,
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💰 Contract funded successfully!');
        },
        onError: (error) => {
          showError('Failed to fund contract: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFunds = async (amount: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'withdrawFunds',
        args: [amount],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💸 Funds withdrawn successfully!');
        },
        onError: (error) => {
          showError('Failed to withdraw funds: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyWithdraw = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeWithDivvi({
        functionName: 'emergencyWithdraw',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🚨 Emergency withdrawal completed!');
        },
        onError: (error) => {
          showError('Failed to emergency withdraw: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to Celo network
  const switchToCelo = async () => {
    try {
      await switchChain({ chainId: chainId });
      showSuccess('🌐 Switched to Celo network!');
    } catch (error) {
      showError('Failed to switch to Celo network');
    }
  };

  // Effects
  useEffect(() => {
    if (address) {
      fetchUserStats();
      fetchUserQuizStatus();
      fetchQuizHistory();
    }
  }, [address, fetchUserStats, fetchUserQuizStatus, fetchQuizHistory]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Update contract config when data changes
  useEffect(() => {
    setContractConfig({
      minimumBalance: minimumBalance as bigint || 0n,
      rewardAmount: rewardAmount as bigint || 0n,
      cooldownPeriod: Number(cooldownPeriod as bigint || 0n),
      maxDailyQuizzes: Number(maxDailyQuizzes as bigint || 0n),
      isPaused: isPaused as boolean || false
    });
  }, [minimumBalance, rewardAmount, cooldownPeriod, maxDailyQuizzes, isPaused]);

  // Data refresh interval
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchUserStats();
      fetchUserQuizStatus();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [address, fetchUserStats, fetchUserQuizStatus]);

  return {
    // State
    address,
    isLoading,
    error,
    success,
    txHash,
    userStats,
    userQuizStatus,
    quizHistory,
    leaderboard,
    contractConfig,
    chainId,
    isConnected: !!address,
    isOnCelo: chainId === chainId,

    // Quiz functions
    takeQuiz,
    submitAnswer,
    claimReward,

    // Admin functions
    updateQuizQuestion,
    setRewardAmount,
    setCooldownPeriod,
    setMaxDailyQuizzes,
    setMinimumBalance,
    pauseContract,
    unpauseContract,
    fundContract,
    withdrawFunds,
    emergencyWithdraw,

    // Utility functions
    switchToCelo,
    fetchUserStats,
    fetchUserQuizStatus,
    fetchQuizHistory,
    fetchLeaderboard,
    resetMessages,
    showSuccess,
    showError,

    // Computed values
    canTakeQuiz: userQuizStatus?.canTakeQuiz || false,
    hasReachedDailyLimit: userQuizStatus ? userQuizStatus.dailyCount >= contractConfig.maxDailyQuizzes : false,
    timeUntilNextQuiz: userQuizStatus ? Math.max(0, userQuizStatus.cooldownEnd - Math.floor(Date.now() / 1000)) : 0,
    accuracyRate: userStats ? (userStats.totalQuizzesTaken > 0 ? (userStats.totalCorrectAnswers / userStats.totalQuizzesTaken) * 100 : 0) : 0,
    
    // Formatters
    formatEther: (value: bigint) => formatEther(value),
    parseEther: (value: string) => parseEther(value),

    // Raw contract data for advanced usage
    refetchUserStats,
    refetchUserQuizStatus
  };
};

export default useQuizelo;