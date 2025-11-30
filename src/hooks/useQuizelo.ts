import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, formatEther, parseEther, Address } from 'viem';
import { 
  useAccount, 
  usePublicClient,  
  useSendTransaction, 
  useChainId,
  useSwitchChain,
  useReadContract,
} from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { quizABI } from '../abi/quizABI';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';
import { erc20Abi } from 'viem';
import { isMiniPay, getFeeCurrencyForMiniPay } from '~/lib/minipay';

const QUIZELO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS as `0x${string}` | undefined;
const env = process.env.NEXT_PUBLIC_ENV;

// Validate contract address is set
if (!QUIZELO_CONTRACT_ADDRESS && typeof window !== 'undefined') {
  console.warn('⚠️ NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS is not set in environment variables');
}

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
const useContractTransaction = (selectedToken: string | null) => {
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

      // Get fee currency for MiniPay - use the selected token
      // The selected token should be used as fee currency for all transactions
      const feeCurrency = isMiniPay() 
        ? getFeeCurrencyForMiniPay(selectedToken)
        : undefined;

      // Send transaction with Divvi referral tag
      // MiniPay supports feeCurrency parameter
      if (!QUIZELO_CONTRACT_ADDRESS) {
        throw new Error('Contract address not configured');
      }

      const txHash = await sendTransactionAsync({
        to: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
  }, [sendTransactionAsync, isConnected, address, publicClient, switchChain, currentChainId, selectedToken]);

  return { executeTransaction };
};

export const useQuizelo = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: env === 'dev' ? celoAlfajores.id : celo.id });
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync: sendTransactionAsyncForApprove } = useSendTransaction();

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

  // Initialize contract transaction hook with selectedToken
  const { executeTransaction } = useContractTransaction(selectedToken);

  // Contract read hooks for constants
  const { data: minQuizFee } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'MIN_QUIZ_FEE',
    query: {
      enabled: !!QUIZELO_CONTRACT_ADDRESS,
    }
  });

  const { data: quizDuration } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'QUIZ_DURATION',
    query: {
      enabled: !!QUIZELO_CONTRACT_ADDRESS,
    }
  });

  const { data: cooldownPeriod } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'COOLDOWN_PERIOD',
    query: {
      enabled: !!QUIZELO_CONTRACT_ADDRESS,
    }
  });

  const { data: maxDailyQuizzes } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'MAX_DAILY_QUIZZES',
    query: {
      enabled: !!QUIZELO_CONTRACT_ADDRESS,
    }
  });

  const { data: minContractBalance } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'MIN_CONTRACT_BALANCE',
    query: {
      enabled: !!QUIZELO_CONTRACT_ADDRESS,
    }
  });

  // Contract read hooks for user data
  const { data: userInfoData, refetch: refetchUserInfo } = useReadContract({
    address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
    abi: quizABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!QUIZELO_CONTRACT_ADDRESS }
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
          if (QUIZELO_CONTRACT_ADDRESS && log.address?.toLowerCase() === QUIZELO_CONTRACT_ADDRESS.toLowerCase()) {
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

  // Get supported tokens - public function, doesn't require wallet connection
  const getSupportedTokens = useCallback(async (): Promise<string[]> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) {
      return [];
    }
    
    try {
      const tokens = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getSupportedTokens',
      }) as string[];
      
      if (Array.isArray(tokens) && tokens.length > 0) {
        setSupportedTokens(tokens);
        if (!selectedToken) {
          setSelectedToken(tokens[0]);
        }
        return tokens;
      }
      
      return [];
    } catch (err) {
      // Only log unexpected errors, not network/contract issues
      const error = err as Error;
      if (error?.message && 
          !error.message.includes('HTTP request failed') && 
          !error.message.includes('wallet is not yet connected') &&
          !error.message.includes('ContractFunctionExecutionError')) {
        console.warn('Failed to fetch supported tokens:', error.message);
      }
      return [];
    }
  }, [publicClient, selectedToken]);

  // Check if token is supported
  const isTokenSupported = useCallback(async (token: string): Promise<boolean> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return false;
    try {
      return await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'isTokenSupported',
        args: [token as Address],
      }) as boolean;
    } catch (err) {
      console.error('Failed to check token support:', err);
      return false;
    }
  }, [publicClient]);

  // Approve ERC20 token - uses selected token as fee currency for MiniPay
  const approveToken = useCallback(async (token: Address, amount: bigint, useMax = false): Promise<{ success: boolean; hash?: string; error?: Error }> => {
    if (!address || !publicClient || !QUIZELO_CONTRACT_ADDRESS) {
      return { success: false, error: new Error('Wallet or contract not available') };
    }
    
    try {
      // Use MaxUint256 for unlimited approval if useMax is true, otherwise use the specific amount
      const amountToApprove = useMax ? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') : amount;
      
      // Encode approve function data
      const encodedData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [QUIZELO_CONTRACT_ADDRESS as `0x${string}`, amountToApprove],
      });

      // Get fee currency for MiniPay - use the selected token
      const feeCurrency = isMiniPay() 
        ? getFeeCurrencyForMiniPay(selectedToken)
        : undefined;

      // Use sendTransactionAsync to support feeCurrency parameter for MiniPay
      const txHash = await sendTransactionAsyncForApprove({
        to: token,
        data: encodedData,
        ...(feeCurrency && { feeCurrency: feeCurrency as `0x${string}` }),
      } as Parameters<typeof sendTransactionAsyncForApprove>[0]);
      
      if (!txHash) {
        return { success: false, error: new Error('Transaction hash not received') };
      }
      
      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === 'success') {
          return { success: true, hash: txHash };
        } else {
          return { success: false, error: new Error('Transaction failed') };
        }
      }
      
      return { success: true, hash: txHash };
    } catch (err) {
      console.error('Failed to approve token:', err);
      const error = err as Error;
      // Handle user rejection
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        return { success: false, error: new Error('User rejected the transaction') };
      }
      return { success: false, error: error };
    }
  }, [address, publicClient, selectedToken, sendTransactionAsyncForApprove]);

  // Check token allowance
  const checkTokenAllowance = useCallback(async (token: Address, owner: Address): Promise<bigint> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0n;
    try {
      return await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, QUIZELO_CONTRACT_ADDRESS as `0x${string}`],
      }) as bigint;
    } catch (err) {
      console.error('Failed to check token allowance:', err);
      return 0n;
    }
  }, [publicClient]);

  // Main contract interaction functions
  const startQuiz = async (token: string, betAmount: bigint, onApprovalNeeded?: () => void, onApprovalComplete?: (hash?: string) => void) => {
    // Early validation checks
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return { success: false, sessionId: null };
    }

    if (!minQuizFee) {
      showError('Minimum quiz fee not loaded yet');
      return { success: false, sessionId: null };
    }

    if (!token) {
      showError('No token selected. Please select a payment token.');
      return { success: false, sessionId: null };
    }

    // Validate bet amount - the displayed entry fee (0.05) should be sent as-is
    // MIN_QUIZ_FEE from contract is 0.005 tokens, so 0.05 is valid
    // The contract will handle the final validation, we just do a basic check here
    // Note: The contract's MIN_QUIZ_FEE is 5 * 1e15 (0.005 with 18 decimals)
    // For 18-decimal tokens: 0.05 = 5e16 >= 5e15 ✓
    // For 6-decimal tokens: The contract comparison might fail, but we send what's displayed
    // Basic validation: betAmount should be positive
    if (betAmount <= 0n) {
      showError('Bet amount must be greater than zero');
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
      const tokenAddress = token as Address;
      const allowance = await checkTokenAllowance(tokenAddress, address);
      if (allowance < betAmount) {
        // Notify that approval is needed
        onApprovalNeeded?.();
        showSuccess('🔓 Please approve token in your wallet...');
        
        const approved = await approveToken(tokenAddress, betAmount);
        if (!approved.success) {
          showError(approved.error?.message || 'Failed to approve token. Please try again.');
          return { success: false, sessionId: null };
        }
        
        // Notify that approval is complete with transaction hash
        onApprovalComplete?.(approved.hash);
        if (approved.hash) {
          setTxHash(approved.hash);
        }
        showSuccess('✅ Token approved! Starting quiz...');
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      let sessionId: string | null = null;

      const result = await executeTransaction({
        functionName: 'startQuiz',
        args: [tokenAddress, betAmount],
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
      if (publicClient && QUIZELO_CONTRACT_ADDRESS) {
        try {
          const session = await publicClient.readContract({
            address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Step 1: Check current allowance
      const allowance = await checkTokenAllowance(token, address);
      
      // Step 2: Approve if needed (use unlimited approval for better UX)
      if (allowance < amount) {
        showSuccess('🔓 Step 1/2: Approving token... Please confirm in your wallet.');
        setTxHash(''); // Clear previous hash
        
        const approveResult = await approveToken(token, amount, true); // Use unlimited approval
        
        if (!approveResult.success) {
          if (approveResult.error?.message?.includes('User rejected')) {
            showError('Approval was cancelled. Please try again.');
          } else {
            showError(`Failed to approve token: ${approveResult.error?.message || 'Unknown error'}`);
          }
          setIsLoading(false);
          return;
        }
        
        if (approveResult.hash) {
          setTxHash(approveResult.hash);
        }
        
        showSuccess('✅ Step 1/2: Approval confirmed! Proceeding to top up...');
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 3: Execute top up transaction
      showSuccess('💰 Step 2/2: Topping up contract... Please confirm in your wallet.');
      setTxHash(''); // Clear approval hash, will be set by executeTransaction
      
      await executeTransaction({
        functionName: 'topUpContract',
        args: [token, amount],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('✅ Contract topped up successfully!');
          refetchContractStats(token);
        },
        onError: (error) => {
          showError('Failed to top up contract: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Top up error:', error);
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        showError('Transaction was cancelled. Please try again.');
      } else {
        showError('Failed to top up contract: ' + errorMessage);
      }
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

  const addSupportedToken = async (token: Address) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'addSupportedToken',
        args: [token],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('✅ Token added successfully!');
          getSupportedTokens();
        },
        onError: (error) => {
          showError('Failed to add token: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeSupportedToken = async (token: Address) => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'removeSupportedToken',
        args: [token],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('✅ Token removed successfully!');
          getSupportedTokens();
        },
        onError: (error) => {
          showError('Failed to remove token: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adminResetLeaderboards = async () => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      await executeTransaction({
        functionName: 'adminResetLeaderboards',
        args: [],
        onSuccess: (txHash) => {
          setTxHash(txHash);
          showSuccess('🔄 Leaderboards reset successfully!');
        },
        onError: (error) => {
          showError('Failed to reset leaderboards: ' + error.message);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quiz session details
  const getQuizSession = async (sessionId: string): Promise<QuizSession | null> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return null;

    try {
      const [user, paymentToken, startTime, expiryTime, active, claimed, score, reward, timeRemaining] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
  const calculatePotentialReward = useCallback(async (score: number, betAmount: bigint): Promise<bigint> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0n;

    try {
      const reward = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'calculatePotentialReward',
        args: [BigInt(score), betAmount],
      }) as bigint;

      return reward;
    } catch (err) {
      console.error('Failed to calculate potential reward:', err);
      return 0n;
    }
  }, [publicClient]);

  // Check if contract can operate
  const canOperateQuizzes = useCallback(async (token: Address): Promise<boolean> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return false;

    try {
      const canOperate = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) {
      return null;
    }

    if (!isConnected || !address) {
      // Silently return null if wallet not connected - this is expected
      return null;
    }

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log unexpected errors, not connection issues
      const error = err as Error;
      if (error?.message && !error.message.includes('wallet is not yet connected') && !error.message.includes('HTTP request failed')) {
        console.warn('Failed to fetch user stats:', error.message);
      }
      return null;
    }
  }, [publicClient, isConnected, address]);

  // Get user quiz history
  const getUserQuizHistory = useCallback(async (userAddress: Address, limit: number = 0): Promise<QuizHistory[]> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return [];

    if (!isConnected || !address) {
      // Silently return empty array if wallet not connected
      return [];
    }

    try {
      const history = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log error if it's not a network/contract issue or connection issue
      const error = err as Error;
      if (error?.message && 
          !error.message.includes('HTTP request failed') && 
          !error.message.includes('wallet is not yet connected')) {
        console.warn('Failed to fetch user quiz history:', error.message);
      }
      return [];
    }
  }, [publicClient, isConnected, address]);

  // Get leaderboards
  const getTopScoresLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) {
      console.warn('Public client not available');
      return [];
    }

    if (!QUIZELO_CONTRACT_ADDRESS) {
      console.warn('Contract address not configured');
      return [];
    }

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log error if it's not a network/contract issue
      const error = err as Error;
      if (error.message && !error.message.includes('HTTP request failed')) {
        console.error('Failed to fetch top scores leaderboard:', err);
      }
      return [];
    }
  }, [publicClient]);

  const getTopEarnersLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) {
      console.warn('Public client not available');
      return [];
    }

    if (!QUIZELO_CONTRACT_ADDRESS) {
      console.warn('Contract address not configured');
      return [];
    }

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log error if it's not a network/contract issue
      const error = err as Error;
      if (error.message && !error.message.includes('HTTP request failed')) {
        console.error('Failed to fetch top earners leaderboard:', err);
      }
      return [];
    }
  }, [publicClient]);

  const getTopStreaksLeaderboard = useCallback(async (limit: number = 0): Promise<LeaderboardEntry[]> => {
    if (!publicClient) {
      console.warn('Public client not available');
      return [];
    }

    if (!QUIZELO_CONTRACT_ADDRESS) {
      console.warn('Contract address not configured');
      return [];
    }

    try {
      const entries = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log error if it's not a network/contract issue
      const error = err as Error;
      if (error.message && !error.message.includes('HTTP request failed')) {
        console.error('Failed to fetch top streaks leaderboard:', err);
      }
      return [];
    }
  }, [publicClient]);

  // Get user ranks - these are public functions, don't require connection
  const getUserScoreRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getUserScoreRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      const error = err as Error;
      if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('wallet is not yet connected')) {
        console.warn('Failed to fetch user score rank:', error.message);
      }
      return 0;
    }
  }, [publicClient]);

  const getUserEarnerRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getUserEarnerRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      const error = err as Error;
      if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('wallet is not yet connected')) {
        console.warn('Failed to fetch user earner rank:', error.message);
      }
      return 0;
    }
  }, [publicClient]);

  const getUserStreakRank = useCallback(async (userAddress: Address): Promise<number> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0;

    try {
      const rank = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getUserStreakRank',
        args: [userAddress],
      }) as bigint;

      return Number(rank);
    } catch (err) {
      const error = err as Error;
      if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('wallet is not yet connected')) {
        console.warn('Failed to fetch user streak rank:', error.message);
      }
      return 0;
    }
  }, [publicClient]);

  // Get contract stats for a token
  const getContractStats = useCallback(async (token: Address): Promise<ContractStats | null> => {
    if (!publicClient) {
      console.warn('Public client not available');
      return null;
    }

    if (!QUIZELO_CONTRACT_ADDRESS) {
      console.warn('Contract address not configured');
      return null;
    }

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Only log error if it's not a network/contract issue
      const error = err as Error;
      if (error.message && !error.message.includes('HTTP request failed')) {
        console.error('Failed to fetch contract stats:', err);
      }
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
    if (!address || !isConnected) {
      // Reset stats when disconnected
      setUserStats(null);
      return;
    }
    
    try {
      const stats = await getUserStats(address as Address);
      if (stats) {
        setUserStats(stats);
      }
    } catch (err) {
      // Silently handle errors - they're already handled in getUserStats
      console.warn('Failed to refetch user stats:', err);
    }
  }, [address, isConnected, getUserStats]);

  // Refetch active quiz takers
  const refetchActiveQuizTakers = useCallback(async () => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return;
    try {
      const takers = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getCurrentQuizTakers',
      }) as string[];
      
      // Only update if the data actually changed to prevent infinite loops
      setActiveQuizTakers((prev) => {
        const prevStr = JSON.stringify(prev);
        const newStr = JSON.stringify(takers);
        if (prevStr !== newStr) {
          return takers;
        }
        return prev;
      });
    } catch (err) {
      const error = err as Error;
      if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('wallet is not yet connected')) {
        console.warn('Failed to fetch active quiz takers:', error.message);
      }
    }
  }, [publicClient]);

  // Get global stats
  const getGlobalStats = useCallback(async (): Promise<GlobalStats | null> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) {
      return null;
    }

    try {
      const stats = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Silently handle errors - network issues are expected
      const error = err as Error;
      if (error?.message && !error.message.includes('HTTP request failed') && !error.message.includes('Cannot read properties')) {
        console.warn('Failed to fetch global stats:', error.message);
      }
      return null;
    }
  }, [publicClient]);

  // Get contract token balance
  const getTokenBalance = useCallback(async (token: Address): Promise<bigint> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return 0n;

    try {
      return await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: quizABI,
        functionName: 'getTokenBalance',
        args: [token],
      }) as bigint;
    } catch (err) {
      const error = err as Error;
      if (error.message && !error.message.includes('HTTP request failed')) {
        console.error('Failed to fetch token balance:', err);
      }
      return 0n;
    }
  }, [publicClient]);

  // Get user's token balance (from their wallet)
  const getUserTokenBalance = useCallback(async (token: Address, userAddress?: Address): Promise<bigint> => {
    if (!publicClient) return 0n;
    const user = userAddress || address;
    if (!user) return 0n;

    try {
      return await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [user as Address],
      }) as bigint;
    } catch (err) {
      console.error('Failed to fetch user token balance:', err);
      return 0n;
    }
  }, [publicClient, address]);

  // Compare users
  const compareUsers = useCallback(async (user1: Address, user2: Address): Promise<[UserStats | null, UserStats | null]> => {
    if (!publicClient || !QUIZELO_CONTRACT_ADDRESS) return [null, null];

    try {
      const [stats1, stats2] = await publicClient.readContract({
        address: QUIZELO_CONTRACT_ADDRESS as `0x${string}`,
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
      // Handle both tuple (array) and struct (object) formats
      let dailyCount: bigint;
      let lastQuiz: bigint;
      let nextQuizTime: bigint;
      let wonToday: boolean;
      let canQuiz: boolean;

      if (Array.isArray(userInfoData)) {
        // Tuple format: [dailyCount, lastQuiz, nextQuizTime, wonToday, canQuiz]
        [dailyCount, lastQuiz, nextQuizTime, wonToday, canQuiz] = userInfoData as [bigint, bigint, bigint, boolean, boolean];
      } else {
        // Struct format: { dailyCount, lastQuiz, nextQuizTime, wonToday, canQuiz }
        const data = userInfoData as { dailyCount: bigint; lastQuiz: bigint; nextQuizTime: bigint; wonToday: boolean; canQuiz: boolean };
        dailyCount = data.dailyCount;
        lastQuiz = data.lastQuiz;
        nextQuizTime = data.nextQuizTime;
        wonToday = data.wonToday;
        canQuiz = data.canQuiz;
      }

      setUserInfo({
        dailyCount: Number(dailyCount),
        lastQuizTime: Number(lastQuiz),
        nextQuizTime: Number(nextQuizTime),
        wonToday: Boolean(wonToday),
        canQuiz
      });
    }
  }, [userInfoData]);

  // Load supported tokens on mount - with error handling
  useEffect(() => {
    // Only load if contract address is configured
    if (QUIZELO_CONTRACT_ADDRESS && publicClient) {
      getSupportedTokens().catch((err) => {
        // Silently handle errors - they're expected if contract isn't deployed or RPC is down
        console.warn('Failed to load supported tokens:', err);
      });
    }
  }, [getSupportedTokens, publicClient]);

  // Auto-refresh data periodically - only when connected
  useEffect(() => {
    if (!address || !isConnected) {
      // Clear user-specific data when disconnected
      setUserStats(null);
      setUserInfo(null);
      return;
    }

    // Initial load
    const loadData = async () => {
      try {
        await Promise.all([
          refetchUserInfo().catch(() => null),
          selectedToken ? refetchContractStats(selectedToken as Address).catch(() => null) : Promise.resolve(),
          refetchActiveQuizTakers().catch(() => null),
          refetchUserStats().catch(() => null),
        ]);
      } catch (err) {
        // Silently handle errors
        console.warn('Failed to load initial data:', err);
      }
    };

    loadData();

    // Set up periodic refresh
    const interval = setInterval(() => {
      if (address && isConnected) {
        refetchUserInfo().catch(() => null);
        if (selectedToken) {
          refetchContractStats(selectedToken as Address).catch(() => null);
        }
        refetchActiveQuizTakers().catch(() => null);
        refetchUserStats().catch(() => null);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [address, isConnected, selectedToken, refetchUserInfo, refetchContractStats, refetchActiveQuizTakers, refetchUserStats]);

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
    minQuizFee,
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
    getUserTokenBalance,

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
    addSupportedToken,
    removeSupportedToken,
    adminResetLeaderboards,

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
