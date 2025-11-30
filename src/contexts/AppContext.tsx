'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Error types
export type ErrorType = 'error' | 'warning' | 'info' | 'success';

export interface AppError {
  id: string;
  message: string;
  type: ErrorType;
  timestamp: number;
  dismissible?: boolean;
}

interface AppContextType {
  errors: AppError[];
  addError: (message: string, type?: ErrorType, dismissible?: boolean) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  contractStatus: {
    isOperational: boolean;
    balance: bigint | null;
    minBalance: bigint | null;
    activeQuizCount: number | null;
    totalQuizzes: number | null;
    totalRewards: bigint | null;
    totalFees: bigint | null;
    isLoading: boolean;
    error: string | null;
  };
  setContractStatus: (status: Partial<AppContextType['contractStatus']>) => void;
  accountStatus: {
    isConnected: boolean;
    address: string | null;
    chainId: number | null;
    userInfo: {
      dailyCount: number;
      lastQuiz: number;
      nextQuizTime: number;
      wonToday: boolean;
      canQuiz: boolean;
    } | null;
    userStats: {
      totalQuizzes: number;
      totalEarnings: bigint;
      bestScore: number;
      averageScore: number;
      currentStreak: number;
      longestStreak: number;
      totalWins: number;
      lastActivity: number;
    } | null;
    isLoading: boolean;
    error: string | null;
  };
  setAccountStatus: (status: Partial<AppContextType['accountStatus']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [contractStatus, setContractStatusState] = useState<AppContextType['contractStatus']>({
    isOperational: false,
    balance: null,
    minBalance: null,
    activeQuizCount: null,
    totalQuizzes: null,
    totalRewards: null,
    totalFees: null,
    isLoading: false,
    error: null,
  });
  const [accountStatus, setAccountStatusState] = useState<AppContextType['accountStatus']>({
    isConnected: false,
    address: null,
    chainId: null,
    userInfo: null,
    userStats: null,
    isLoading: false,
    error: null,
  });

  const addError = useCallback((message: string, type: ErrorType = 'error', dismissible: boolean = true) => {
    const error: AppError = {
      id: `error-${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: Date.now(),
      dismissible,
    };
    setErrors((prev) => [...prev, error]);

    // Auto-dismiss after 5 seconds for non-critical errors
    if (dismissible && type !== 'error') {
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== error.id));
      }, 5000);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const setContractStatus = useCallback((status: Partial<AppContextType['contractStatus']>) => {
    setContractStatusState((prev) => ({ ...prev, ...status }));
  }, []);

  const setAccountStatus = useCallback((status: Partial<AppContextType['accountStatus']>) => {
    setAccountStatusState((prev) => ({ ...prev, ...status }));
  }, []);

  const getErrorColor = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return 'bg-[#fef2f2] border-[#ef4444] text-[#ef4444]';
      case 'warning':
        return 'bg-[#fffbeb] border-[#f59e0b] text-[#f59e0b]';
      case 'info':
        return 'bg-[#eff6ff] border-[#2563eb] text-[#2563eb]';
      case 'success':
        return 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]';
      default:
        return 'bg-[#fef2f2] border-[#ef4444] text-[#ef4444]';
    }
  };

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <AlertCircle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <AppContext.Provider
      value={{
        errors,
        addError,
        removeError,
        clearErrors,
        contractStatus,
        setContractStatus,
        accountStatus,
        setAccountStatus,
      }}
    >
      {children}
      
      {/* Global Error Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
        <AnimatePresence>
          {errors.map((error) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              className={`retro-card-group relative ${getErrorColor(error.type)}`}
            >
              <div className="retro-pattern-overlay" />
              <div className="retro-card bg-white p-4 relative z-[2] border-2">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getErrorIcon(error.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#050505] break-words">
                      {error.message}
                    </p>
                  </div>
                  {error.dismissible && (
                    <button
                      onClick={() => removeError(error.id)}
                      className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
                      aria-label="Dismiss error"
                    >
                      <X className="w-4 h-4 text-[#050505]" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
};

