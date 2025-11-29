import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, formatEther, parseEther, Address } from 'viem';
import { 
  useAccount, 
  usePublicClient,  
  useSendTransaction, 
  useChainId,
  useSwitchChain,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { quizABI } from '../abi/quizABI';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';
import { erc20Abi } from 'viem';
import { isMiniPay, getFeeCurrencyForMiniPay } from '~/lib/minipay';

const QUIZELO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS as `0x${string}`;
const env = process.env.NEXT_PUBLIC_ENV;

// Divvi consumer address for referral tracking (from environment variable)
const DIVVI_CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_DIVVI_CONSUMER_ADDRESS || '0x53eaF4CD171842d8144e45211308e5D90B4b0088') as `0x${string}`;

// If env is dev, use alfajores instead of celo in clients
const targetChainId = env === 'dev' ? 44787 : 42220;

// Types matching QuizeloV2 contract
interface UserInfo {
  dailyCount: number;
  lastQuizTime: number;
  nextQuizTime: number;
  wonToday: boolean;
  canQuiz: boolean;
}

interface QuizSession {
  user: string;
  paymentToken: string;
  startTime: number;
  expiryTime: number;
  active: boolean;
  claimed: boolean;
  score: number;
  reward: bigint;
  timeRemaining: number;
}

interface ContractStats {
  balance: bigint;
  activeQuizCount: number;
  minBalance: bigint;
  operational: boolean;
  totalQuizzes: number;
  totalRewards: bigint;
  totalFees: bigint;
}

interface UserStats {
  totalQuizzes: number;
  totalEarnings: bigint;
  bestScore: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  totalWins: number;
  lastActivity: number;
}

interface LeaderboardEntry {
  user: string;
  score: bigint;
  timestamp: number;
}

interface QuizHistory {
  sessionId: string;
  score: number;
  reward: bigint;
  timestamp: number;
}

interface GlobalStats {
  totalUsers: number;
  totalQuizzes: number;
  totalRewards: bigint;
  totalFees: bigint;
  averageScore: number;
}

// Custom hook for contract transactions
const useContractTransaction = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient({ 
    chainId: env === 'dev' ? celoAlfajores.id : celo.id
  });
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();

  const executeTransaction = useCallback(async ({
    functionName,
    args = [],
    value,
    onSuccess,
    onError
  }: {
    functionName: string;
    args?: unknown[];
    value?: bigint;
    onSuccess?: (txHash: string, receipt?: unknown) => void;
    onError?: (error: Error) => void;
  }) => {
    try {
      // Check if wallet is connected first
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      // Switch to correct network if needed
      if (currentChainId !== targetChainId) {
        console.log('🔄 Switching to correct network...');
        try {
          await switchChain({ chainId: targetChainId });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
          throw new Error('Failed to switch to the correct network');
        }
      }

      // Encode function data
      const encodedData = encodeFunctionData({
        abi: quizABI,
        functionName,
        args,
      });

      // Generate Divvi referral tag
      const referralTag = getReferralTag({
        user: address,
        consumer: DIVVI_CONSUMER_ADDRESS,
      });

      // Append referral tag to transaction data
      const dataWithReferral = (encodedData + referralTag.slice(2)) as `0x${string}`;

      console.log('📎 Sending transaction with Divvi referral tracking:', {
        functionName,
        user: address,
        dataLength: encodedData.length,
        referralTagLength: referralTag.length,
      });

      // Get fee currency for MiniPay
      const feeCurrency = isMiniPay() && functionName === 'startQuiz' && args[0] 
        ? getFeeCurrencyForMiniPay(args[0] as string)
        : undefined;

      // Send transaction with Divvi referral tag
      // MiniPay supports feeCurrency parameter
      const txHash = await sendTransactionAsync({
        to: QUIZELO_CONTRACT_ADDRESS,
        data: dataWithReferral,
        value,
        ...(feeCurrency && { feeCurrency: feeCurrency as `0x${string}` }),
      } as Parameters<typeof sendTransactionAsync>[0]);

      if (!txHash) throw new Error('Transaction failed to send');

      // Wait for confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        if (receipt.status === 'success') {
          // Submit referral to Divvi after successful transaction
          try {
            const chainId = await publicClient.getChainId();
            await submitReferral({
              txHash,
              chainId,
            });
            console.log('✅ Referral submitted to Divvi successfully');
          } catch (divviError) {
            console.warn('⚠️ Failed to submit referral to Divvi:', divviError);
            // Don't fail the transaction if Divvi submission fails
          }

          onSuccess?.(txHash, receipt);
          return { success: true, txHash, receipt };
        } else {
          throw new Error('Transaction failed');
        }
      }

      return { success: true, txHash, receipt: null };
    } catch (error) {
      console.error(`Error in ${functionName}:`, error);
      onError?.(error as Error);
      return { success: false, error: error as Error };
    }
  }, [sendTransactionAsync, isConnected, address, publicClient, switchChain, currentChainId]);

  return { executeTransaction };
};

export const useQuizelo = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { executeTransaction } = useContractTransaction();
  const { writeContractAsync } = useWriteContract();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Quiz state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [activeQuizTakers, setActiveQuizTakers] = useState<string[]>([]);
  const [currentQuizSession] = useState<QuizSession | null>(null);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Contract read hooks for constants
  const { data: quizFee } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'QUIZ_FEE'
  });

  const { data: quizDuration } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'QUIZ_DURATION'
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

  const { data: minContractBalance } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'MIN_CONTRACT_BALANCE'
  });

  // Contract read hooks for user data
  const { data: userInfoData, refetch: refetchUserInfo } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
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

  // Extract sessionId from transaction receipt
  const extractSessionIdFromReceipt = (receipt: unknown): string | null => {
    try {
      const typedReceipt = receipt as { logs?: Array<{ topics?: string[]; address?: string }> };
      if (!typedReceipt?.logs) return null;

      // Find QuizStarted event
      for (const log of typedReceipt.logs) {
        if (log.topics && log.topics.length >= 2) {
          // Check if this is from our contract
          if (log.address?.toLowerCase() === QUIZELO_CONTRACT_ADDRESS.toLowerCase()) {
            // The sessionId is typically in the first indexed parameter (topics[1])
            const sessionId = log.topics[1];
            if (sessionId && sessionId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
              console.log('✅ Extracted sessionId from receipt:', sessionId);
              return sessionId;
            }
          }
        }
      }

      console.warn('⚠️ No valid sessionId found in transaction receipt');
      return null;
    } catch (error) {
      console.error('❌ Error extracting sessionId:', error);
      return null;
    }
  };

  // Get supported tokens
  const getSupportedTokens = useCallback(async (): Promise<string[]> => {
    if (!publicClient) return [];
    try {
      const tokens = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getSupportedTokens',
      }) as string[];
      setSupportedTokens(tokens);
      if (tokens.length > 0 && !selectedToken) {
        setSelectedToken(tokens[0]);
      }
      return tokens;
    } catch (err) {
      console.error('Failed to fetch supported tokens:', err);
      return [];
    }
  }, [publicClient, selectedToken]);

  // Check if token is supported
  const isTokenSupported = useCallback(async (token: string): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'isTokenSupported',
        args: [token as Address],
      }) as boolean;
    } catch (err) {
      console.error('Failed to check token support:', err);
      return false;
    }
  }, [publicClient]);

  // Approve ERC20 token
  const approveToken = useCallback(async (token: Address, amount: bigint): Promise<boolean> => {
    if (!address || !publicClient) return false;
    try {
      const txHash = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [QUIZELO_CONTRACT_ADDRESS, amount],
      });
      
      if (txHash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to approve token:', err);
      return false;
    }
  }, [address, publicClient, writeContractAsync]);

  // Check token allowance
  const checkTokenAllowance = useCallback(async (token: Address, owner: Address): Promise<bigint> => {
    if (!publicClient) return 0n;
    try {
      return await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, QUIZELO_CONTRACT_ADDRESS],
      }) as bigint;
    } catch (err) {
      console.error('Failed to check token allowance:', err);
      return 0n;
    }
  }, [publicClient]);

  // Main contract interaction functions
  const startQuiz = async (token?: string) => {
    // Early validation checks
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return { success: false, sessionId: null };
    }

    if (!quizFee) {
      showError('Quiz fee not loaded yet');
      return { success: false, sessionId: null };
    }

    // Use selected token or first supported token
    const tokenToUse = token || selectedToken || (supportedTokens.length > 0 ? supportedTokens[0] : null);
    if (!tokenToUse) {
      showError('No token selected. Please select a payment token.');
      return { success: false, sessionId: null };
    }

    if (currentChainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        showError('Please switch to the correct network first');
        return { success: false, sessionId: null };
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      // Check and approve token if needed
      const tokenAddress = tokenToUse as Address;
      const feeAmount = quizFee as bigint;
      const allowance = await checkTokenAllowance(tokenAddress, address);
      if (allowance < feeAmount) {
        showSuccess('Approving token...');
        const approved = await approveToken(tokenAddress, feeAmount);
        if (!approved) {
          showError('Failed to approve token. Please try again.');
          return { success: false, sessionId: null };
        }
      }

      let sessionId: string | null = null;

      const result = await executeTransaction({
        functionName: 'startQuiz',
        args: [tokenAddress],
        onSuccess: (txHash, receipt) => {
          setTxHash(txHash);
          showSuccess('🎯 Quiz started successfully!');
          
          // Extract sessionId from receipt
          sessionId = extractSessionIdFromReceipt(receipt);
          
          // Refresh data
          refetchUserInfo();
          refetchContractStats(tokenAddress);
          refetchActiveQuizTakers();
        },
        onError: (error) => {
          showError('Failed to start quiz: ' + error.message);
        }
      });

      return { success: result.success, sessionId };
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async (sessionId: string, score: number) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    if (!sessionId) {
      showError('Invalid session ID');
      return;
    }

    if (currentChainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        showError('Please switch to the correct network first');
        return;
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      // Validate session before claiming
      if (publicClient) {
        try {
          const session = await publicClient.readContract({
            address: QUIZELO_CONTRACT_ADDRESS,
            abi: quizABI,
            functionName: 'getQuizSession',
            args: [sessionId as `0x${string}`]
          });

          const typedSession = session as [string, string, bigint, bigint, boolean, boolean, bigint, bigint, bigint];

          console.log('📝 Validating session before claim:', {
            sessionId,
            user: typedSession[0],
            paymentToken: typedSession[1],
            startTime: typedSession[2],
            expiryTime: typedSession[3],
            active: typedSession[4],
            claimed: typedSession[5],
            score: typedSession[6],
            reward: typedSession[7],
            timeRemaining: typedSession[8]
          });

          if (!typedSession[4]) { // active
            showError('This quiz session is no longer active');
            return;
          }

          if (typedSession[5]) { // claimed
            showError('This quiz has already been claimed');
            return;
          }

          if (typedSession[0].toLowerCase() !== address.toLowerCase()) {
            showError('This quiz session belongs to a different user');
            return;
          }

          const now = Math.floor(Date.now() / 1000);
          if (Number(typedSession[3]) < now) { // expiryTime
            showError('This quiz session has expired');
            return;
          }
        } catch (error) {
          console.error('❌ Error validating session:', error);
          showError('Failed to validate quiz session');
          return;
        }
      }

      await executeTransaction({
        functionName: 'claimReward',
        args: [sessionId as `0x${string}`, BigInt(score)],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess(`💰 Quiz completed! Score: ${score}%`);
          // Refresh data
          refetchUserInfo();
          if (selectedToken) {
            refetchContractStats(selectedToken as Address);
          }
          refetchActiveQuizTakers();
          refetchUserStats();
        },
        onError: (error) => {
          showError('Failed to claim reward: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupExpiredQuiz = async (sessionId: string) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'cleanupExpiredQuiz',
        args: [sessionId as `0x${string}`],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🧹 Expired quiz cleaned up');
          refetchActiveQuizTakers();
        },
        onError: (error) => {
          showError('Failed to cleanup quiz: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Admin functions
  const topUpContract = async (token: Address, amount: bigint) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      // Approve token first
      const allowance = await checkTokenAllowance(token, address);
      if (allowance < amount) {
        const approved = await approveToken(token, amount);
        if (!approved) {
          showError('Failed to approve token');
          return;
        }
      }

      await executeTransaction({
        functionName: 'topUpContract',
        args: [token, amount],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💰 Contract topped up successfully!');
          refetchContractStats(token);
        },
        onError: (error) => {
          showError('Failed to top up contract: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adminEmergencyDrain = async (token: Address) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'adminEmergencyDrain',
        args: [token],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🚨 Emergency drain completed!');
          refetchContractStats(token);
        },
        onError: (error) => {
          showError('Failed to emergency drain: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adminCleanupExpired = async () => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'adminCleanupExpired',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🧹 All expired quizzes cleaned up!');
          refetchActiveQuizTakers();
        },
        onError: (error) => {
          showError('Failed to cleanup expired quizzes: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quiz session details
  const getQuizSession = async (sessionId: string): Promise<QuizSession | null> => {
    if (!publicClient) return null;

    try {
      const [user, paymentToken, startTime, expiryTime, active, claimed, score, reward, timeRemaining] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getQuizSession',
        args: [sessionId as `0x${string}`]
      }) as [string, string, bigint, bigint, boolean, boolean, bigint, bigint, bigint];

      return {
        user,
        paymentToken,
        startTime: Number(startTime),
        expiryTime: Number(expiryTime),
        active,
        claimed,
        score: Number(score),
        reward,
        timeRemaining: Number(timeRemaining)
      };
    } catch (err) {
      console.error('Failed to fetch quiz session:', err);
      return null;
    }
  };

  // Calculate potential reward
  const calculatePotentialReward = useCallback(async (score: number): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      const reward = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'calculatePotentialReward',
        args: [BigInt(score)],
      }) as bigint;

      return reward;
    } catch (err) {
      console.error('Failed to calculate potential reward:', err);
      return 0n;
    }
  }, [publicClient]);

  // Check if contract can operate
  const canOperateQuizzes = useCallback(async (token: Address): Promise<boolean> => {
    if (!publicClient) return false;

    try {
      const canOperate = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'canOperateQuizzes',
        args: [token],
      }) as boolean;

      return canOperate;
    } catch (err) {
      console.error('Failed to check if contract can operate:', err);
      return false;
    }
  }, [publicClient]);

  // Get user statistics
  const getUserStats = useCallback(async (userAddress: Address): Promise<UserStats | null> => {
    if (!publicClient) return null;

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserStats',
        args: [userAddress],
      }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

      return {
        totalQuizzes: Number(stats[0]),
        totalEarnings: stats[1],
        bestScore: Number(stats[2]),
        averageScore: Number(stats[3]),
        currentStreak: Number(stats[4]),
        longestStreak: Number(stats[5]),
        totalWins: Number(stats[6]),
        lastActivity: Number(stats[7])
      };
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
      return null;
    }
  }, [publicClient]);

  // Get user quiz history
  const getUserQuizHistory = useCallback(async (userAddress: Address, limit: number = 0): Promise<QuizHistory[]> => {
    if (!publicClient) return [];

    try {
      const history = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserQuizHistory',
        args: [userAddress, BigInt(limit)],
      }) as Array<[string, bigint, bigint, bigint]>;

      return history.map(([sessionId, score, reward, timestamp]) => ({
        sessionId,
        score: Number(score),
        reward,
        timestamp: Number(timestamp)
      }));
    } catch (err) {
      console.error('Failed to fetch quiz history:', err);
      return [];
    }
  }, [publicClient]);

  // Get leaderboards
  const getTopScoresLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) return [];

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getTopScoresLeaderboard',
        args: [BigInt(limit)],
      }) as Array<[string, bigint, bigint]>;

      return entries.map(([user, score, timestamp]) => ({
        user,
        score,
        timestamp: Number(timestamp)
      }));
    } catch (err) {
      console.error('Failed to fetch top scores leaderboard:', err);
      return [];
    }
  }, [publicClient]);

  const getTopEarnersLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) return [];

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getTopEarnersLeaderboard',
        args: [BigInt(limit)],
      }) as Array<[string, bigint, bigint]>;

      return entries.map(([user, score, timestamp]) => ({
        user,
        score,
        timestamp: Number(timestamp)
      }));
    } catch (err) {
      console.error('Failed to fetch top earners leaderboard:', err);
      return [];
    }
  }, [publicClient]);

  const getTopStreaksLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) return [];

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getTopStreaksLeaderboard',
        args: [BigInt(limit)],
      }) as Array<[string, bigint, bigint]>;

      return entries.map(([user, score, timestamp]) => ({
        user,
        score,
        timestamp: Number(timestamp)
      }));
    } catch (err) {
      console.error('Failed to fetch top streaks leaderboard:', err);
      return [];
    }
  }, [publicClient]);

  // Get user ranks
  const getUserScoreRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserScoreRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      console.error('Failed to fetch user score rank:', err);
      return 0;
    }
  }, [publicClient]);

  const getUserEarnerRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserEarnerRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      console.error('Failed to fetch user earner rank:', err);
      return 0;
    }
  }, [publicClient]);

  const getUserStreakRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getUserStreakRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      console.error('Failed to fetch user streak rank:', err);
      return 0;
    }
  }, [publicClient]);

  // Get contract stats for a token
  const getContractStats = useCallback(async (token: Address): Promise<ContractStats | null> => {
    if (!publicClient) return null;

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getContractStats',
        args: [token],
      }) as [bigint, bigint, bigint, boolean, bigint, bigint, bigint];

      return {
        balance: stats[0],
        activeQuizCount: Number(stats[1]),
        minBalance: stats[2],
        operational: stats[3],
        totalQuizzes: Number(stats[4]),
        totalRewards: stats[5],
        totalFees: stats[6]
      };
    } catch (err) {
      console.error('Failed to fetch contract stats:', err);
      return null;
    }
  }, [publicClient]);

  // Refetch contract stats
  const refetchContractStats = useCallback(async (token?: Address) => {
    if (!token && selectedToken) {
      token = selectedToken as Address;
    }
    if (!token && supportedTokens.length > 0) {
      token = supportedTokens[0] as Address;
    }
    if (!token) return;

    const stats = await getContractStats(token);
    if (stats) {
      setContractStats(stats);
    }
  }, [selectedToken, supportedTokens, getContractStats]);

  // Refetch user stats
  const refetchUserStats = useCallback(async () => {
    if (!address) return;
    const stats = await getUserStats(address as Address);
    if (stats) {
      setUserStats(stats);
    }
  }, [address, getUserStats]);

  // Refetch active quiz takers
  const refetchActiveQuizTakers = useCallback(async () => {
    if (!publicClient) return;
    try {
      const takers = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getCurrentQuizTakers',
      }) as string[];
      setActiveQuizTakers(takers);
    } catch (err) {
      console.error('Failed to fetch active quiz takers:', err);
    }
  }, [publicClient]);

  // Get global stats
  const getGlobalStats = useCallback(async (): Promise<GlobalStats | null> => {
    if (!publicClient) return null;

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getGlobalStats',
      }) as [bigint, bigint, bigint, bigint, bigint];

      return {
        totalUsers: Number(stats[0]),
        totalQuizzes: Number(stats[1]),
        totalRewards: stats[2],
        totalFees: stats[3],
        averageScore: Number(stats[4])
      };
    } catch (err) {
      console.error('Failed to fetch global stats:', err);
      return null;
    }
  }, [publicClient]);

  // Get token balance
  const getTokenBalance = useCallback(async (token: Address): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      return await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getTokenBalance',
        args: [token],
      }) as bigint;
    } catch (err) {
      console.error('Failed to fetch token balance:', err);
      return 0n;
    }
  }, [publicClient]);

  // Compare users
  const compareUsers = useCallback(async (user1: Address, user2: Address): Promise<[UserStats | null, UserStats | null]> => {
    if (!publicClient) return [null, null];

    try {
      const [stats1, stats2] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'compareUsers',
        args: [user1, user2],
      }) as [[bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint], [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]];

      const formatted1: UserStats = {
        totalQuizzes: Number(stats1[0]),
        totalEarnings: stats1[1],
        bestScore: Number(stats1[2]),
        averageScore: Number(stats1[3]),
        currentStreak: Number(stats1[4]),
        longestStreak: Number(stats1[5]),
        totalWins: Number(stats1[6]),
        lastActivity: Number(stats1[7])
      };

      const formatted2: UserStats = {
        totalQuizzes: Number(stats2[0]),
        totalEarnings: stats2[1],
        bestScore: Number(stats2[2]),
        averageScore: Number(stats2[3]),
        currentStreak: Number(stats2[4]),
        longestStreak: Number(stats2[5]),
        totalWins: Number(stats2[6]),
        lastActivity: Number(stats2[7])
      };

      return [formatted1, formatted2];
    } catch (err) {
      console.error('Failed to compare users:', err);
      return [null, null];
    }
  }, [publicClient]);

  // Switch to correct network
  const switchToCorrectNetwork = async () => {
    try {
      await switchChain({ chainId: targetChainId });
      showSuccess(`🌐 Switched to ${env === 'dev' ? 'Alfajores' : 'Celo'} network!`);
    } catch {
      showError(`Failed to switch to ${env === 'dev' ? 'Alfajores' : 'Celo'} network`);
    }
  };

  // Effects to update state when contract data changes
  useEffect(() => {
    if (userInfoData) {
      const [dailyCount, lastQuizTime, nextQuizTime, wonToday, canQuiz] = userInfoData as [bigint, bigint, bigint, bigint, boolean];
      setUserInfo({
        dailyCount: Number(dailyCount),
        lastQuizTime: Number(lastQuizTime),
        nextQuizTime: Number(nextQuizTime),
        wonToday: Boolean(wonToday),
        canQuiz
      });
    }
  }, [userInfoData]);

  // Load supported tokens on mount
  useEffect(() => {
    getSupportedTokens();
  }, [getSupportedTokens]);

  // Auto-refresh data
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      refetchUserInfo();
      if (selectedToken) {
        refetchContractStats(selectedToken as Address);
      }
      refetchActiveQuizTakers();
      refetchUserStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [address, selectedToken, refetchUserInfo, refetchContractStats, refetchActiveQuizTakers, refetchUserStats]);

  return {
    // State
    address,
    isLoading,
    error,
    success,
    txHash,
    userInfo,
    userStats,
    contractStats,
    activeQuizTakers,
    currentQuizSession,
    supportedTokens,
    selectedToken,
    setSelectedToken,
    currentChainId,
    targetChainId,
    isConnected,
    isOnCorrectNetwork: currentChainId === targetChainId,

    // Constants from contract
    quizFee,
    quizDuration: Number(quizDuration || 0n),
    cooldownPeriod: Number(cooldownPeriod || 0n),
    maxDailyQuizzes: Number(maxDailyQuizzes || 0n),
    minContractBalance,

    // Main functions
    startQuiz,
    claimReward,
    cleanupExpiredQuiz,
    getQuizSession,
    calculatePotentialReward,
    canOperateQuizzes,

    // Token functions
    getSupportedTokens,
    isTokenSupported,
    approveToken,
    checkTokenAllowance,
    getTokenBalance,

    // User stats functions
    getUserStats,
    getUserQuizHistory,
    refetchUserStats,

    // Leaderboard functions
    getTopScoresLeaderboard,
    getTopEarnersLeaderboard,
    getTopStreaksLeaderboard,
    getUserScoreRank,
    getUserEarnerRank,
    getUserStreakRank,

    // Contract stats functions
    getContractStats,
    refetchContractStats,

    // Global functions
    getGlobalStats,
    compareUsers,

    // Admin functions
    topUpContract,
    adminEmergencyDrain,
    adminCleanupExpired,

    // Utility functions
    switchToCorrectNetwork,
    resetMessages,
    showSuccess,
    showError,

    // Data refresh functions
    refetchUserInfo,
    refetchActiveQuizTakers,

    // Computed values
    canTakeQuiz: userInfo?.canQuiz || false,
    hasReachedDailyLimit: userInfo ? userInfo.dailyCount >= Number(maxDailyQuizzes || 0n) : false,
    timeUntilNextQuiz: userInfo ? Math.max(0, userInfo.nextQuizTime - Math.floor(Date.now() / 1000)) : 0,
    contractCanOperate: contractStats?.operational || false,
    
    // Formatters
    formatEther: (value: bigint) => formatEther(value),
    parseEther: (value: string) => parseEther(value)
  };
};

export default useQuizelo;
