'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Address } from 'viem';
import { celo } from 'viem/chains';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  RefreshCw, 
  TrendingDown,
  CheckCircle,
  Loader2,
  X,
  Info,
} from 'lucide-react';
import { useQuizelo } from '../../hooks/useQuizelo';
import { useERC20Token } from '../../hooks/useERC20Token';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const QUIZELO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS as `0x${string}` | undefined;

// Hardcoded supported tokens
const SUPPORTED_TOKENS = [
  "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
  "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", // USDT
  "0x471EcE3750Da237f93B8E339c536989b8978a438", // CELO
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // USDC
] as const;

const getTokenInfo = (address: string) => {
  if (!address) return { name: 'Select Token', symbol: '---', icon: '💵', color: '#6b7280' };
  
  const normalized = address.toLowerCase().trim();
  const tokenMap: Record<string, { name: string; symbol: string; icon: string; color: string }> = {
    '0x765de816845861e75a25fca122bb6898b8b1282a': {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '💵',
      color: '#10b981',
    },
    '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e': {
      name: 'USDT',
      symbol: 'USDT',
      icon: '💚',
      color: '#059669',
    },
    '0x471ece3750da237f93b8e339c536989b8978a438': {
      name: 'Celo',
      symbol: 'CELO',
      icon: '🌱',
      color: '#7C65C1',
    },
    '0xceba9300f2b948710d2653dd7b07f33a8b32118c': {
      name: 'USD Coin',
      symbol: 'USDC',
      icon: '💙',
      color: '#2563eb',
    },
  };
  
  const tokenInfo = tokenMap[normalized];
  if (tokenInfo) return tokenInfo;
  
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return { name: shortAddress, symbol: 'TOKEN', icon: '💵', color: '#6b7280' };
};

export const AdminPage = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const quizelo = useQuizelo();
  
  // State
  const [topUpToken, setTopUpToken] = useState<string>('');
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [drainToken, setDrainToken] = useState<string>('');
  const [newTokenAddress, setNewTokenAddress] = useState<string>('');
  const [removeTokenAddress, setRemoveTokenAddress] = useState<string>('');
  const [showTokenDetailsModal, setShowTokenDetailsModal] = useState<boolean>(false);
  
  // Use ERC20 hook for the selected token - pass selectedToken for fee currency
  const erc20Token = useERC20Token({
    tokenAddress: topUpToken as Address | undefined,
    spenderAddress: QUIZELO_CONTRACT_ADDRESS,
    selectedToken: quizelo.selectedToken, // Use selected token as fee currency
  });

  // Load contract stats on mount
  useEffect(() => {
    if (isConnected && quizelo.refetchContractStats && SUPPORTED_TOKENS.length > 0) {
      quizelo.refetchContractStats(SUPPORTED_TOKENS[0] as Address);
    }
  }, [isConnected, quizelo.refetchContractStats, quizelo]);

  // Load token info when token is selected
  useEffect(() => {
    if (topUpToken && address && QUIZELO_CONTRACT_ADDRESS) {
      erc20Token.loadTokenInfo(
        topUpToken as Address,
        address,
        QUIZELO_CONTRACT_ADDRESS
      );
    }
  }, [topUpToken, address, erc20Token]);


  const handleTopUp = async () => {
    if (!topUpToken || !topUpAmount) return;
    
    try {
      const amount = erc20Token.parseAmount(topUpAmount);
      await quizelo.topUpContract(topUpToken as Address, amount);
      setTopUpAmount('');
    } catch (error) {
      console.error('Top up error:', error);
    }
  };

  const handleEmergencyDrain = async () => {
    if (!drainToken) return;
    await quizelo.adminEmergencyDrain(drainToken as Address);
  };

  const handleCleanupExpired = async () => {
    await quizelo.adminCleanupExpired();
  };

  const handleAddToken = async () => {
    if (!newTokenAddress) return;
    await quizelo.addSupportedToken(newTokenAddress as Address);
    setNewTokenAddress('');
  };

  const handleRemoveToken = async () => {
    if (!removeTokenAddress) return;
    await quizelo.removeSupportedToken(removeTokenAddress as Address);
    setRemoveTokenAddress('');
  };

  const handleResetLeaderboards = async () => {
    await quizelo.adminResetLeaderboards();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="retro-card-group relative max-w-md w-full">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-8 text-center relative z-[2]">
            <Wallet className="w-16 h-16 text-[#7C65C1] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#050505] mb-4">🔒 Admin Access</h2>
            <p className="text-[#6b7280] font-semibold mb-6">
              Please connect your wallet to access admin functions
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (chainId !== celo.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="retro-card-group relative max-w-md w-full">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-8 text-center relative z-[2]">
            <AlertTriangle className="w-16 h-16 text-[#f59e0b] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#050505] mb-4">⚠️ Wrong Network</h2>
            <p className="text-[#6b7280] font-semibold mb-6">
              Please switch to Celo network to access admin functions
            </p>
            <button
              onClick={() => quizelo.switchToCorrectNetwork()}
              className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
            >
              🔄 Switch to Celo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <div className="flex items-center justify-between mb-4 pb-4 border-b-4 border-[#050505]">
              <div>
                <h1 className="text-3xl font-black text-[#050505] mb-2">⚙️ Admin Panel</h1>
                <p className="text-sm text-[#6b7280] font-semibold">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-[#10b981] px-3 py-2 rounded-[0.3em] border-[0.2em] border-[#050505]">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-xs font-black text-white">ADMIN</span>
              </div>
            </div>

            {/* Contract Stats */}
            <div className="space-y-3">
              {quizelo.contractStats ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                      <p className="text-xs font-bold text-[#6b7280] mb-1">Status</p>
                      <p className={`text-lg font-black ${quizelo.contractStats.operational ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {quizelo.contractStats.operational ? '✅ Operational' : '❌ Not Operational'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                      <p className="text-xs font-bold text-[#6b7280] mb-1">Active Quizzes</p>
                      <p className="text-lg font-black text-[#050505]">{quizelo.contractStats.activeQuizCount}</p>
                    </div>
                  </div>
                  
                  {!quizelo.contractStats.operational && (
                    <div className="p-3 bg-[#fef2f2] rounded-[0.3em] border-[0.15em] border-[#ef4444]">
                      <p className="text-xs font-black text-[#ef4444] mb-2">⚠️ Contract Not Operational</p>
                      <div className="space-y-1 text-xs text-[#6b7280]">
                        <p>Current Balance: {quizelo.contractStats.balance ? quizelo.formatEther(quizelo.contractStats.balance) : '0'} tokens</p>
                        <p>Minimum Required: {quizelo.contractStats.minBalance ? quizelo.formatEther(quizelo.contractStats.minBalance) : quizelo.minContractBalance ? quizelo.formatEther(quizelo.minContractBalance as bigint) : '0'} tokens</p>
                        <p className="font-black text-[#ef4444] mt-2">💡 Top up the contract to make it operational</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505] text-center">
                  <p className="text-sm text-[#6b7280]">Loading contract stats...</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  if (SUPPORTED_TOKENS.length > 0) {
                    quizelo.refetchContractStats(SUPPORTED_TOKENS[0] as Address);
                  }
                }}
                disabled={quizelo.isLoading}
                className="w-full py-2 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] font-bold border-[0.15em] border-[#050505] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Contract Stats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Up Contract */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <Coins className="w-5 h-5 text-[#7C65C1]" />
              <span>💰 Top Up Contract</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Add funds to the contract. Approval and top-up will be handled automatically.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-[#050505] mb-2">Select Token</label>
                <select
                  value={topUpToken}
                  onChange={(e) => setTopUpToken(e.target.value)}
                  className="w-full p-3 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white font-semibold"
                >
                  <option value="">Select a token...</option>
                  {SUPPORTED_TOKENS.map((token) => {
                    const tokenInfo = getTokenInfo(token);
                    return (
                      <option key={token} value={token}>
                        {tokenInfo.icon} {tokenInfo.name} ({tokenInfo.symbol})
                      </option>
                    );
                  })}
                </select>
              </div>

              {topUpToken && (
                <div className="p-3 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505] space-y-3">
                  {/* Balance Check */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#050505]">Your Balance:</span>
                    {erc20Token.isLoading ? (
                      <LoadingSpinner size={4} color="text-[#7C65C1]" />
                    ) : (
                      <span className="text-sm font-black text-[#050505]">
                        {erc20Token.balance ? erc20Token.formatAmount(erc20Token.balance) : '0'} {getTokenInfo(topUpToken).symbol}
                      </span>
                    )}
                  </div>

                  {/* Button to view token details */}
                  <button
                    onClick={() => {
                      // Refresh allowance before showing modal
                      if (topUpToken && address && QUIZELO_CONTRACT_ADDRESS) {
                        erc20Token.getAllowance(
                          topUpToken as Address,
                          address,
                          QUIZELO_CONTRACT_ADDRESS
                        );
                      }
                      setShowTokenDetailsModal(true);
                    }}
                    className="w-full py-2 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.3em] font-bold border-[0.15em] border-[#050505] transition-all flex items-center justify-center space-x-2 text-sm"
                  >
                    <Info className="w-4 h-4" />
                    <span>View Token Details & Allowance</span>
                  </button>
                  
                  {erc20Token.balance === 0n && !erc20Token.isLoading && (
                    <div className="mt-2 p-2 bg-[#fef2f2] rounded-[0.2em] border-[0.1em] border-[#ef4444]">
                      <p className="text-xs font-black text-[#ef4444]">
                        ⚠️ You don&apos;t have any {getTokenInfo(topUpToken).symbol} tokens. You need tokens to top up the contract.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-[#050505] mb-2">Amount</label>
                <input
                  type="text"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white font-semibold"
                />
              </div>

              <button
                onClick={handleTopUp}
                disabled={quizelo.isLoading}
                className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.3em_0.3em_0_#000000]"
              >
                {quizelo.isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{quizelo.success || 'Processing...'}</span>
                  </span>
                ) : (
                  '💰 Approve & Top Up Contract'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Drain */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-[#ef4444]" />
              <span>🚨 Emergency Drain</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Drain all funds from contract for a specific token (Admin only)
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-[#050505] mb-2">Select Token</label>
                <select
                  value={drainToken}
                  onChange={(e) => setDrainToken(e.target.value)}
                  className="w-full p-3 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white font-semibold"
                >
                  <option value="">Select a token...</option>
                  {SUPPORTED_TOKENS.map((token) => {
                    const tokenInfo = getTokenInfo(token);
                    return (
                      <option key={token} value={token}>
                        {tokenInfo.icon} {tokenInfo.name} ({tokenInfo.symbol})
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={handleEmergencyDrain}
                disabled={quizelo.isLoading}
                className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quizelo.isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  '🚨 Emergency Drain'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Cleanup Expired */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-[#f59e0b]" />
              <span>🧹 Cleanup Expired Quizzes</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Remove all expired quiz sessions from the contract
            </p>
            
            <button
              onClick={handleCleanupExpired}
              disabled={quizelo.isLoading}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quizelo.isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                '🧹 Cleanup Expired'
              )}
            </button>
          </div>
        </div>

        {/* Add Supported Token */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-[#10b981]" />
              <span>➕ Add Supported Token</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Add a new ERC20 token to the supported tokens list
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-[#050505] mb-2">Token Address</label>
                <input
                  type="text"
                  value={newTokenAddress}
                  onChange={(e) => setNewTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white font-mono text-sm"
                />
              </div>

              <button
                onClick={handleAddToken}
                disabled={quizelo.isLoading}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quizelo.isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  '➕ Add Token'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Remove Supported Token */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-[#ef4444]" />
              <span>🗑️ Remove Supported Token</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Remove a token from the supported tokens list
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-[#050505] mb-2">Token Address</label>
                <input
                  type="text"
                  value={removeTokenAddress}
                  onChange={(e) => setRemoveTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 rounded-[0.3em] border-[0.15em] border-[#050505] bg-white font-mono text-sm"
                />
              </div>

              <button
                onClick={handleRemoveToken}
                disabled={quizelo.isLoading}
                className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quizelo.isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  '🗑️ Remove Token'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Leaderboards */}
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-6 relative z-[2]">
            <h2 className="text-xl font-black text-[#050505] mb-4 flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-[#7C65C1]" />
              <span>🔄 Reset Leaderboards</span>
            </h2>
            <p className="text-sm text-[#6b7280] font-semibold mb-4">
              Reset all leaderboard data (scores, earners, streaks)
            </p>
            
            <button
              onClick={handleResetLeaderboards}
              disabled={quizelo.isLoading}
              className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quizelo.isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                '🔄 Reset Leaderboards'
              )}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {quizelo.error && (
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-[#fef2f2] p-4 border-[0.2em] border-[#ef4444] relative z-[2]">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                <p className="text-sm font-black text-[#050505]">⚠️ {quizelo.error}</p>
              </div>
            </div>
          </div>
        )}

        {quizelo.success && (
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-[#f0fdf4] p-4 border-[0.2em] border-[#10b981] relative z-[2]">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-[#10b981]" />
                <p className="text-sm font-black text-[#050505]">✨ {quizelo.success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {quizelo.txHash && (
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-[#eff6ff] p-4 border-[0.2em] border-[#2563eb] relative z-[2]">
              <p className="text-xs font-bold text-[#6b7280] mb-1">Transaction Hash</p>
              <p className="font-mono text-sm text-[#050505] break-all">{quizelo.txHash}</p>
            </div>
          </div>
        )}
      </div>

      {/* Token Details Modal */}
      <AnimatePresence>
        {showTokenDetailsModal && topUpToken && (
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTokenDetailsModal(false)}
          >
            <div className="retro-card-group relative">
              <div className="retro-pattern-overlay" />
              <motion.div 
                className="retro-card bg-white p-6 sm:p-8 w-full max-w-md mx-4 z-[2]"
                initial={{ scale: 0.8, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: -50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="retro-title-header flex items-center justify-between">
                  <span>💰 Token Details & Allowance</span>
                  <button
                    onClick={() => setShowTokenDetailsModal(false)}
                    className="p-1.5 hover:bg-white/20 rounded-[0.3em] transition-all"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <div className="px-[1.5em] py-[1.5em] space-y-4">
                  {topUpToken && (
                    <>
                      <div className="space-y-3">
                        <div className="p-3 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                          <p className="text-xs font-bold text-[#6b7280] mb-1">Token Address</p>
                          <p className="font-mono text-sm text-[#050505] break-all">{topUpToken}</p>
                        </div>

                        <div className="p-3 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                          <p className="text-xs font-bold text-[#6b7280] mb-1">Token Info</p>
                          <p className="text-sm font-black text-[#050505]">
                            {getTokenInfo(topUpToken).icon} {getTokenInfo(topUpToken).name} ({getTokenInfo(topUpToken).symbol})
                          </p>
                        </div>

                        <div className="p-3 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-[#6b7280]">Your Balance</p>
                            {erc20Token.isLoading ? (
                              <LoadingSpinner size={4} color="text-[#7C65C1]" />
                            ) : (
                              <span className="text-sm font-black text-[#050505]">
                                {erc20Token.balance ? erc20Token.formatAmount(erc20Token.balance) : '0'} {getTokenInfo(topUpToken).symbol}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-[#f7f7f7] rounded-[0.3em] border-[0.15em] border-[#050505]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-[#6b7280]">Current Allowance</p>
                            {erc20Token.isLoading ? (
                              <LoadingSpinner size={4} color="text-[#7C65C1]" />
                            ) : (
                              <span className="text-sm font-black text-[#050505]">
                                {erc20Token.allowance !== null 
                                  ? erc20Token.allowance === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
                                    ? `Unlimited ${getTokenInfo(topUpToken).symbol}`
                                    : `${erc20Token.formatAmount(erc20Token.allowance)} ${getTokenInfo(topUpToken).symbol}`
                                  : `0 ${getTokenInfo(topUpToken).symbol}`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6b7280] mt-1">
                            Spender: {QUIZELO_CONTRACT_ADDRESS?.slice(0, 6)}...{QUIZELO_CONTRACT_ADDRESS?.slice(-4)}
                          </p>
                        </div>

                        {topUpAmount && erc20Token.allowance !== null && erc20Token.decimals && (
                          <div className={`p-3 rounded-[0.3em] border-[0.15em] ${
                            erc20Token.hasSufficientApproval(erc20Token.parseAmount(topUpAmount), erc20Token.allowance)
                              ? 'bg-[#f0fdf4] border-[#10b981]'
                              : 'bg-[#fef2f2] border-[#ef4444]'
                          }`}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-[#6b7280]">Required for Top Up</p>
                              <span className={`text-sm font-black ${
                                erc20Token.hasSufficientApproval(erc20Token.parseAmount(topUpAmount), erc20Token.allowance)
                                  ? 'text-[#10b981]'
                                  : 'text-[#ef4444]'
                              }`}>
                                {topUpAmount} {getTokenInfo(topUpToken).symbol}
                                {erc20Token.hasSufficientApproval(erc20Token.parseAmount(topUpAmount), erc20Token.allowance) ? ' ✅' : ' ⚠️'}
                              </span>
                            </div>
                            {!erc20Token.hasSufficientApproval(erc20Token.parseAmount(topUpAmount), erc20Token.allowance) && (
                              <p className="text-xs text-[#ef4444] mt-1">
                                Approval needed before top-up
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (topUpToken && address && QUIZELO_CONTRACT_ADDRESS) {
                            erc20Token.loadTokenInfo(
                              topUpToken as Address,
                              address,
                              QUIZELO_CONTRACT_ADDRESS
                            );
                            erc20Token.getAllowance(
                              topUpToken as Address,
                              address,
                              QUIZELO_CONTRACT_ADDRESS
                            );
                          }
                        }}
                        disabled={erc20Token.isLoading}
                        className="w-full py-3 bg-[#7C65C1] hover:bg-[#6952A3] text-white rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {erc20Token.isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Refreshing...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5" />
                            <span>Refresh Allowance</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

