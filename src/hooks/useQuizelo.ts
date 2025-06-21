import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, formatEther, parseEther } from 'viem';
import { 
  useAccount, 
  usePublicClient, 
  useWalletClient, 
  useSendTransaction, 
  useChainId,
  useSwitchChain,
  useReadContract,
} from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { quizABI } from '../abi/quizABI';

const QUIZELO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS as `0x${string}`;
const env = process.env.NEXT_PUBLIC_ENV;

// If env is dev, use alfajores instead of celo in clients
const targetChainId = env === 'dev' ? 44787 : 42220;

// Types matching the actual contract
interface UserInfo {
  dailyCount: number;
  lastQuizTime: number;
  nextQuizTime: number;
  wonToday: boolean;
  canQuiz: boolean;
}

interface QuizSession {
  user: string;
  startTime: number;
  expiryTime: number;
  active: boolean;
  claimed: boolean;
  timeRemaining: number;
}

interface ContractStats {
  balance: bigint;
  activeQuizCount: number;
  minBalance: bigint;
  operational: boolean;
}

// Custom hook for contract transactions
const useContractTransaction = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();
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
      if (!walletClient) throw new Error('Wallet not connected');

      // Always switch to correct network before executing transaction
      if (currentChainId !== targetChainId) {
        console.log('🔄 Switching to correct network...');
        await switchChain({ chainId: targetChainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Send transaction
      const txHash = await sendTransactionAsync({
        to: QUIZELO_CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: quizABI,
          functionName,
          args,
        }),
        value,
      });

      if (!txHash) throw new Error('Transaction failed to send');

      // Wait for confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        if (receipt.status === 'success') {
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
  }, [sendTransactionAsync, walletClient, publicClient, currentChainId, switchChain]);

  return { executeTransaction };
};

export const useQuizelo = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { executeTransaction } = useContractTransaction();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Quiz state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [activeQuizTakers, setActiveQuizTakers] = useState<string[]>([]);
  const [currentQuizSession, setCurrentQuizSession] = useState<QuizSession | null>(null);

  console.log('currentQuizSession', setCurrentQuizSession);

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

  const { data: contractStatsData, refetch: refetchContractStats } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'getContractStats'
  });

  const { data: activeQuizTakersData, refetch: refetchActiveQuizTakers } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS,
    abi: quizABI,
    functionName: 'getCurrentQuizTakers'
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

  // Main contract interaction functions
  const startQuiz = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return { success: false, sessionId: null };
    }

    if (!quizFee) {
      showError('Quiz fee not loaded yet');
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
      let sessionId: string | null = null;

      const result = await executeTransaction({
        functionName: 'startQuiz',
        args: [],
        value: quizFee as bigint,
        onSuccess: (txHash, receipt) => {
          setTxHash(txHash);
          showSuccess('🎯 Quiz started successfully!');
          
          // Extract sessionId from receipt
          sessionId = extractSessionIdFromReceipt(receipt);
          
          // Refresh data
          refetchUserInfo();
          refetchContractStats();
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
    if (!address) {
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
            args: [sessionId]
          });

          const typedSession = session as [string, bigint, bigint, boolean, boolean, bigint];

          console.log('📝 Validating session before claim:', {
            sessionId,
            user: typedSession[0],
            startTime: typedSession[1],
            expiryTime: typedSession[2],
            active: typedSession[3],
            claimed: typedSession[4],
            timeRemaining: typedSession[5]
          });

          if (!typedSession[3]) { // active
            showError('This quiz session is no longer active');
            return;
          }

          if (typedSession[4]) { // claimed
            showError('This quiz has already been claimed');
            return;
          }

          if (typedSession[0].toLowerCase() !== address.toLowerCase()) {
            showError('This quiz session belongs to a different user');
            return;
          }

          const now = Math.floor(Date.now() / 1000);
          if (Number(typedSession[2]) < now) { // expiryTime
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
        args: [sessionId, score],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess(`💰 Quiz completed! Score: ${score}%`);
          // Refresh data
          refetchUserInfo();
          refetchContractStats();
          refetchActiveQuizTakers();
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
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'cleanupExpiredQuiz',
        args: [sessionId],
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
  const topUpContract = async (amount: bigint) => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'topUpContract',
        args: [],
        value: amount,
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('💰 Contract topped up successfully!');
          refetchContractStats();
        },
        onError: (error) => {
          showError('Failed to top up contract: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adminEmergencyDrain = async () => {
    if (!address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'adminEmergencyDrain',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🚨 Emergency drain completed!');
          refetchContractStats();
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
    if (!address) {
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
      const [user, startTime, expiryTime, active, claimed, timeRemaining] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'getQuizSession',
        args: [sessionId]
      }) as [string, bigint, bigint, boolean, boolean, bigint];

      return {
        user,
        startTime: Number(startTime),
        expiryTime: Number(expiryTime),
        active,
        claimed,
        timeRemaining: Number(timeRemaining)
      };
    } catch (err) {
      console.error('Failed to fetch quiz session:', err);
      return null;
    }
  };

  // Calculate potential reward
  const calculatePotentialReward = async (userAddress: string, score: number): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      const reward = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'calculatePotentialReward',
        args: [userAddress, score]
      }) as bigint;

      return reward;
    } catch (err) {
      console.error('Failed to calculate potential reward:', err);
      return 0n;
    }
  };

  // Check if contract can operate
  const canOperateQuizzes = async (): Promise<boolean> => {
    if (!publicClient) return false;

    try {
      const canOperate = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS,
        abi: quizABI,
        functionName: 'canOperateQuizzes'
      }) as boolean;

      return canOperate;
    } catch (err) {
      console.error('Failed to check if contract can operate:', err);
      return false;
    }
  };

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

  useEffect(() => {
    if (contractStatsData) {
      const [balance, activeQuizCount, minBalance, operational] = contractStatsData as [bigint, bigint, bigint, boolean];
      setContractStats({
        balance,
        activeQuizCount: Number(activeQuizCount),
        minBalance,
        operational
      });
    }
  }, [contractStatsData]);

  useEffect(() => {
    if (activeQuizTakersData) {
      setActiveQuizTakers(activeQuizTakersData as string[]);
    }
  }, [activeQuizTakersData]);

  // Auto-refresh data
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      refetchUserInfo();
      refetchContractStats();
      refetchActiveQuizTakers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [address, refetchUserInfo, refetchContractStats, refetchActiveQuizTakers]);

  return {
    // State
    address,
    isLoading,
    error,
    success,
    txHash,
    userInfo,
    contractStats,
    activeQuizTakers,
    currentQuizSession,
    currentChainId,
    targetChainId,
    isConnected: !!address,
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
    refetchContractStats,
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