import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from 'wagmi';
import { Address, erc20Abi, parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { isMiniPay, getFeeCurrencyForMiniPay } from '~/lib/minipay';

interface UseERC20TokenOptions {
  tokenAddress?: Address;
  spenderAddress?: Address;
  selectedToken?: string | null; // Selected token for fee currency in MiniPay
}

export const useERC20Token = (options: UseERC20TokenOptions = {}) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [decimals, setDecimals] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get token decimals
  const getDecimals = useCallback(async (token: Address): Promise<number> => {
    if (!publicClient) return 18;
    
    try {
      const decimals = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'decimals',
      }) as number;
      
      setDecimals(decimals);
      return decimals;
    } catch (error) {
      console.error('Failed to get token decimals:', error);
      setDecimals(18); // Default to 18
      return 18;
    }
  }, [publicClient]);

  // Get token balance
  const getBalance = useCallback(async (token: Address, userAddress?: Address): Promise<bigint> => {
    if (!publicClient) return 0n;
    
    const user = userAddress || address;
    if (!user) return 0n;

    try {
      const balance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [user as Address],
      }) as bigint;
      
      setBalance(balance);
      return balance;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      setBalance(0n);
      return 0n;
    }
  }, [publicClient, address]);

  // Get token allowance
  const getAllowance = useCallback(async (
    token: Address, 
    owner: Address, 
    spender: Address
  ): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      const allowance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      }) as bigint;
      
      setAllowance(allowance);
      return allowance;
    } catch (error) {
      console.error('Failed to get token allowance:', error);
      setAllowance(0n);
      return 0n;
    }
  }, [publicClient]);

  // Approve token - uses selected token as fee currency for MiniPay
  const approve = useCallback(async (
    token: Address,
    spender: Address,
    amount: bigint
  ): Promise<{ success: boolean; hash?: `0x${string}`; error?: Error }> => {
    if (!isConnected || !address) {
      return { success: false, error: new Error('Wallet not connected') };
    }

    setIsLoading(true);
    
    try {
      // Get fee currency for MiniPay - use the selected token
      const feeCurrency = isMiniPay() 
        ? getFeeCurrencyForMiniPay(options.selectedToken || null)
        : undefined;

      // If MiniPay and feeCurrency is needed, use sendTransactionAsync
      if (feeCurrency) {
        const encodedData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount],
        });

        const txHash = await sendTransactionAsync({
          to: token,
          data: encodedData,
          feeCurrency: feeCurrency as `0x${string}`,
        } as Parameters<typeof sendTransactionAsync>[0]);

        return { success: true, hash: txHash };
      } else {
        // Use writeContract for non-MiniPay wallets
        writeContract({
          address: token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount],
        });

        // Return success - the hash will be available via the hook's hash state
        // The transaction confirmation is handled by useWaitForTransactionReceipt
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to approve token:', error);
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, writeContract, sendTransactionAsync, options.selectedToken]);

  // Check if approval is sufficient
  const hasSufficientApproval = useCallback((
    requiredAmount: bigint,
    currentAllowance?: bigint
  ): boolean => {
    const allowanceToCheck = currentAllowance ?? allowance ?? 0n;
    return allowanceToCheck >= requiredAmount;
  }, [allowance]);

  // Format amount with decimals
  const formatAmount = useCallback((amount: bigint, tokenDecimals?: number): string => {
    const decimalsToUse = tokenDecimals ?? decimals ?? 18;
    return formatUnits(amount, decimalsToUse);
  }, [decimals]);

  // Parse amount with decimals
  const parseAmount = useCallback((amount: string, tokenDecimals?: number): bigint => {
    const decimalsToUse = tokenDecimals ?? decimals ?? 18;
    return parseUnits(amount, decimalsToUse);
  }, [decimals]);

  // Load all token info
  const loadTokenInfo = useCallback(async (
    token: Address,
    owner?: Address,
    spender?: Address
  ) => {
    if (!publicClient) return;

    setIsLoading(true);
    try {
      const ownerAddress = owner || address;
      const spenderAddress = spender || options.spenderAddress;

      await Promise.all([
        getDecimals(token),
        ownerAddress && getBalance(token, ownerAddress),
        ownerAddress && spenderAddress && getAllowance(token, ownerAddress, spenderAddress),
      ]);
    } catch (error) {
      console.error('Failed to load token info:', error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, options.spenderAddress, getDecimals, getBalance, getAllowance]);

  return {
    // State
    decimals,
    balance,
    allowance,
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
    
    // Actions
    approve,
    getDecimals,
    getBalance,
    getAllowance,
    loadTokenInfo,
    
    // Utilities
    hasSufficientApproval,
    formatAmount,
    parseAmount,
  };
};

