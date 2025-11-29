'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Trophy, ChevronRight } from 'lucide-react';

interface QuestionResult {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  userAnswer: string;
  isLastQuestion: boolean;
}

interface QuestionResultModalProps {
  result: QuestionResult;
  correctAnswer: string;
  userAnswer: string;
  onContinue: () => void;
  isLastQuestion: boolean;
}

export const QuestionResultModal = ({ 
  result, 
  correctAnswer, 
  userAnswer, 
  onContinue, 
  isLastQuestion 
}: QuestionResultModalProps) => {
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
            className="retro-card bg-white p-6 sm:p-8 w-full max-w-md mx-4 z-[2]"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="relative text-center">
              <div 
                className={`w-20 h-20 mx-auto mb-6 rounded-[0.4em] flex items-center justify-center border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] ${
                  result.isCorrect 
                    ? 'bg-[#10b981]' 
                    : 'bg-[#f59e0b]'
                }`}
              >
                {result.isCorrect ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : (
                  <X className="w-10 h-10 text-white" />
                )}
              </div>
              
              <h3 className={`text-2xl font-black mb-4 ${
                result.isCorrect ? 'text-[#10b981]' : 'text-[#f59e0b]'
              }`}>
                {result.isCorrect ? '🎉 Excellent!' : '🎯 Close One!'}
              </h3>
              
              <div className={`retro-info-box mb-6 ${
                result.isCorrect 
                  ? 'bg-[#f0fdf4]' 
                  : 'bg-[#fffbeb]'
              }`}>
                {!result.isCorrect && (
                  <p className="text-sm text-[#050505] mb-2 font-semibold">
                    <span className="font-bold">❌ Your answer:</span> {userAnswer}
                  </p>
                )}
                <p className="text-sm text-[#050505] mb-3 font-semibold">
                  <span className="font-bold">✅ Correct answer:</span> {correctAnswer}
                </p>
                <p className="text-sm text-[#050505] leading-relaxed font-semibold">
                  💡 {result.explanation}
                </p>
              </div>
              
              <button
                onClick={onContinue}
                className={`w-full py-4 rounded-[0.4em] font-bold text-white text-lg transition-all border-[0.2em] border-[#050505] uppercase tracking-[0.05em] ${
                  result.isCorrect
                    ? 'bg-[#10b981] hover:bg-[#059669] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000]'
                    : 'bg-[#f59e0b] hover:bg-[#d97706] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000]'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {isLastQuestion ? (
                    <>
                      <Trophy className="w-5 h-5 text-white" />
                      <span className="text-white">🏆 View Results</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5 text-white" />
                      <span className="text-white">⚡ Continue Quest</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

