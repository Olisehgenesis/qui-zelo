'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Play } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface QuizInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStart: () => void;
  quizFee: string;
  potentialWinnings: string;
  isLoading: boolean;
}

export const QuizInfoModal = ({ 
  isVisible, 
  onClose, 
  onStart, 
  quizFee, 
  potentialWinnings,
  isLoading 
}: QuizInfoModalProps) => {
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
            <div className="retro-title-header">
              <span>🎮 Ready to Quest?</span>
            </div>
            
            <div className="px-[1.5em] py-[1.5em]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C65C1] rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              <div className="retro-info-box mb-4 bg-[#fffbeb]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#050505]">💰 Entry Fee</span>
                  <span className="text-sm font-black text-[#f59e0b]">{quizFee} CELO</span>
                </div>
                <p className="text-xs text-[#050505] font-semibold">This amount will be deducted from your wallet</p>
              </div>
              
              <div className="retro-info-box mb-6 bg-[#f0fdf4]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#050505]">🏆 Potential Winnings</span>
                  <span className="text-sm font-black text-[#10b981]">{potentialWinnings} CELO</span>
                </div>
                <p className="text-xs text-[#050505] font-semibold">Win by scoring 60% or higher!</p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={onStart}
                  disabled={isLoading}
                  className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 sm:py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center space-x-3 uppercase tracking-[0.05em]"
                >
                  {isLoading ? (
                    <LoadingSpinner size={6} color="text-white" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 text-white" />
                      <span className="text-white">🚀 Start Quest</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full text-[#6b7280] py-2 text-sm hover:text-[#050505] transition-colors font-semibold"
                >
                  ⏰ Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

