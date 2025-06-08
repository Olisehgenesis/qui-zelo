import { useState, useEffect, useCallback } from 'react';
import { formatEther, parseEther } from 'viem';
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
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { Interface } from 'ethers';
import { quizABI } from '../abi/quizABI';

const QUIZELO_CONTRACT_ADDRESS = import.meta.env.VITE_QUIZELO_CONTRACT_ADDRESS as `0x${string}`;
const env = import.meta.env.VITE_ENV;

// If env is dev, use alfajores instead of celo in clients
const targetChainId = env === 'dev' ? 44787 : 42220;

// Centralized Divvi configuration
const DIVVI_CONFIG = {
  consumer: '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as `0x${string}`,
  providers: [
    '0x0423189886d7966f0dd7e7d256898daeee625dca',
    '0xc95876688026be9d6fa7a7c33328bd013effa2bb', 
    '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
  ] as `0x${string}`[]
};

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

// Custom hook for Divvi-enabled transactions
const useDivviTransaction = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ 
    chainId: env === 'dev' ? celoAlfajores.id : celo.id
  });
  const currentChainId = useChainId();
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

      // Always switch to correct network before executing transaction
      if (currentChainId !== targetChainId) {
        console.log('🔄 Switching to correct network...');
        await switchChain({ chainId: targetChainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create interface and encode function data
      const quizeloInterface = new Interface(quizABI);
      const encodedData = quizeloInterface.encodeFunctionData(functionName, args);

      // Get Divvi data suffix
      const dataSuffix = getDataSuffix(DIVVI_CONFIG);
      const finalData = encodedData + dataSuffix;

      // Send transaction with Dvvi integration
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
  }, [sendTransactionAsync, walletClient, publicClient, currentChainId, switchChain]);

  return { executeWithDivvi };
};

export const useQuizelo = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { executeWithDivvi } = useDivviTransaction();

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
  console.log(setCurrentQuizSession)

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
      } catch (error) {
        showError('Please switch to the correct network first');
        return { success: false, sessionId: null };
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      let sessionId: string | null = null;
      let success = false;

      await executeWithDivvi({
        functionName: 'startQuiz',
        args: [],
        value: quizFee as bigint,
        onSuccess: async (txHash) => {
          setTxHash(txHash);
          showSuccess('🎯 Quiz started successfully!');
          
          // Wait for transaction receipt and extract sessionId from event
          if (publicClient) {
            try {
              const receipt = await publicClient.waitForTransactionReceipt({ 
                hash: txHash as `0x${string}` 
              });
              
              console.log('📝 Transaction receipt:', receipt);
              
              // Find QuizStarted event in logs
              const quizStartedEvent = receipt.logs.find(log => 
                log.topics[0] === '0x' + quizABI.find(item => 
                  item.type === 'event' && item.name === 'QuizStarted'
                )?.inputs?.map(input => input.type).join(',')
              );

              if (quizStartedEvent) {
                console.log('📝 Found QuizStarted event:', quizStartedEvent);
                // The sessionId is in the first topic (indexed parameter)
                sessionId = quizStartedEvent.topics[1] as `0x${string}`;
                console.log('📝 Extracted sessionId from event topic:', sessionId);
              } else {
                console.warn('⚠️ QuizStarted event not found in logs');
              }

              if (sessionId) {
                // Validate the session
                const session = await publicClient.readContract({
                  address: QUIZELO_CONTRACT_ADDRESS,
                  abi: quizABI,
                  functionName: 'getQuizSession',
                  args: [sessionId]
                });
                console.log('📝 Session details:', session);
                
             
              }
            } catch (error) {
              console.error('❌ Error extracting sessionId:', error);
            }
          }

          // Refresh data
          refetchUserInfo();
          refetchContractStats();
          refetchActiveQuizTakers();
          success = true;
        },
        onError: (error) => {
          showError('Failed to start quiz: ' + error.message);
          success = false;
        }
      });

      return { success, sessionId };
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
      } catch (error) {
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

          console.log('📝 Validating session before claim:', {
            sessionId,
            user: (session as any)[0],
            startTime: (session as any)[1],
            expiryTime: (session as any)[2],
            active: (session as any)[3],
            claimed: (session as any)[4],
            timeRemaining: (session as any)[5]
          });

          if (!(session as any)[3]) { // active
            showError('This quiz session is no longer active');
            return;
          }

          if ((session as any)[4]) { // claimed
            showError('This quiz has already been claimed');
            return;
          }

          if ((session as any)[0].toLowerCase() !== address.toLowerCase()) {
            showError('This quiz session belongs to a different user');
            return;
          }

          const now = Math.floor(Date.now() / 1000);
          if (Number((session as any)[2]) < now) { // expiryTime
            showError('This quiz session has expired');
            return;
          }
        } catch (error) {
          console.error('❌ Error validating session:', error);
          showError('Failed to validate quiz session');
          return;
        }
      }

      await executeWithDivvi({
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
      await executeWithDivvi({
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
      await executeWithDivvi({
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
      await executeWithDivvi({
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
      await executeWithDivvi({
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
    } catch (error) {
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