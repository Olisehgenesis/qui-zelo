'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface TransactionModalProps {
  isVisible: boolean;
  status: 'pending' | 'success' | 'error';
  txHash: string;
  onClose: () => void;
}

export const TransactionModal = ({ isVisible, status, txHash, onClose }: TransactionModalProps) => {
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="retro-card-group relative">
          <div className="retro-pattern-overlay" />
          <motion.div 
            className="retro-card bg-white p-6 sm:p-8 w-full max-w-sm mx-4 z-[2]"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className={`retro-title-header ${
              status === 'success' ? 'bg-[#10b981]' : 
              status === 'error' ? 'bg-[#ef4444]' : 
              'bg-[#7C65C1]'
            }`}>
              <span>
                {status === 'pending' ? '⚡ Processing Magic' : 
                 status === 'success' ? '🎉 Success!' : 
                 '❌ Oops!'}
              </span>
            </div>
            
            <div className="px-[1.5em] py-[1.5em] text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6 ${
                status === 'success' ? 'bg-[#10b981]' : 
                status === 'error' ? 'bg-[#ef4444]' : 
                'bg-[#7C65C1]'
              }`}>
                {status === 'pending' ? (
                  <LoadingSpinner size={8} color="text-white" />
                ) : status === 'success' ? (
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                ) : (
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </div>
              
              {status === 'pending' && (
                <p className="text-[#050505] mb-4 sm:mb-6 text-sm sm:text-base animate-pulse font-semibold">
                  🌟 Your transaction is being processed on the blockchain...
                </p>
              )}

              {status === 'success' && (
                <p className="text-[#050505] mb-4 sm:mb-6 text-sm sm:text-base font-semibold">
                  🚀 Your quiz quest has begun! Ready to earn some CELO? 
                </p>
              )}

              {txHash && (
                <div className="retro-info-box mb-4 sm:mb-6 bg-[#f0fdf4]">
                  <p className="text-xs text-[#050505] mb-1 font-bold">🔗 Transaction Hash</p>
                  <p className="font-mono text-xs text-[#050505] break-all font-semibold">{txHash}</p>
                </div>
              )}

              {status !== 'pending' && (
                <button
                  onClick={onClose}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em] flex items-center justify-center space-x-3"
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                  <span className="text-white">✨ Continue to Quiz</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

