'use client';

import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { CheckCircle, XCircle, Loader2, Wallet, FileText } from 'lucide-react';
import { formatEther } from 'viem';

export const StatusDisplay: React.FC = () => {
  const { contractStatus, accountStatus } = useAppContext();

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-xs">
      {/* Account Status */}
      <div className="retro-card-group relative">
        <div className="retro-pattern-overlay" />
        <div className="retro-card bg-white p-3 relative z-[2] border-2">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                {accountStatus.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#7C65C1]" />
                ) : accountStatus.isConnected ? (
                  <CheckCircle className="w-3 h-3 text-[#10b981]" />
                ) : (
                  <XCircle className="w-3 h-3 text-[#ef4444]" />
                )}
                <span className="text-xs font-bold text-[#050505]">
                  {accountStatus.isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {accountStatus.address && (
                <p className="text-[10px] text-[#666] font-mono truncate mt-1">
                  {accountStatus.address.slice(0, 6)}...{accountStatus.address.slice(-4)}
                </p>
              )}
              {accountStatus.userInfo && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[10px] text-[#666]">
                    Daily: {accountStatus.userInfo.dailyCount}/3
                  </p>
                  {accountStatus.userInfo.nextQuizTime > 0 && (
                    <p className="text-[10px] text-[#666]">
                      Next: {Math.max(0, Math.floor((accountStatus.userInfo.nextQuizTime - Date.now() / 1000) / 60))}m
                    </p>
                  )}
                </div>
              )}
              {accountStatus.error && (
                <p className="text-[10px] text-[#ef4444] mt-1">{accountStatus.error}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Status */}
      {contractStatus.balance !== null && (
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <div className="retro-card bg-white p-3 relative z-[2] border-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {contractStatus.isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#7C65C1]" />
                  ) : contractStatus.isOperational ? (
                    <CheckCircle className="w-3 h-3 text-[#10b981]" />
                  ) : (
                    <XCircle className="w-3 h-3 text-[#ef4444]" />
                  )}
                  <span className="text-xs font-bold text-[#050505]">
                    {contractStatus.isOperational ? 'Operational' : 'Not Operational'}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {contractStatus.balance !== null && (
                    <p className="text-[10px] text-[#666]">
                      Balance: {formatEther(contractStatus.balance)} tokens
                    </p>
                  )}
                  {contractStatus.activeQuizCount !== null && (
                    <p className="text-[10px] text-[#666]">
                      Active: {contractStatus.activeQuizCount} quizzes
                    </p>
                  )}
                  {contractStatus.totalQuizzes !== null && (
                    <p className="text-[10px] text-[#666]">
                      Total: {contractStatus.totalQuizzes} quizzes
                    </p>
                  )}
                </div>
                {contractStatus.error && (
                  <p className="text-[10px] text-[#ef4444] mt-1">{contractStatus.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

