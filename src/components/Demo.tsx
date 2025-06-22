import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Trophy, 
  User, 
  Play, 
  Wallet, 
  X, 
  Clock, 
  Coins, 
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Sparkles,
  Brain,
  RefreshCw,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { celo } from 'viem/chains';
import { useSwitchChain, useChainId, useAccount, useConnect } from 'wagmi';

import { injected } from 'wagmi/connectors';
import { sdk } from '@farcaster/frame-sdk';

// Import your hooks
import { useQuizelo } from '../hooks/useQuizelo';
import { useTopics, TopicWithMetadata } from '../hooks/useTopics';
import { useAI } from '../hooks/useAI';
import { useLeaderboard } from '../hooks/useLeaderboard';
import farcasterFrame from '@farcaster/frame-wagmi-connector';

interface ScoreResult {
  percentage: number;
  correct: number;
  total: number;
}

interface QuestionResult {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  userAnswer: string;
  isLastQuestion: boolean;
}

// Add interfaces for component props
interface QuizInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStart: () => void;
  quizFee: string;
  potentialWinnings: string;
  isLoading: boolean;
}

interface QuizGenerationModalProps {
  isVisible: boolean;
  topic: TopicWithMetadata | null;
}

interface TransactionModalProps {
  isVisible: boolean;
  status: 'pending' | 'success' | 'error';
  txHash: string;
  onClose: () => void;
}

interface NetworkCheckModalProps {
  showNetworkModal: boolean;
  isSwitchingNetwork: boolean;
  networkError: string;
  switchToCelo: () => void;
  setShowNetworkModal: (show: boolean) => void;
}

// Enhanced Loading Animation with floating particles
const LoadingSpinner = ({ size = 6, color = 'text-amber-600' }) => (
  <div className="relative">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Loader2 className={`w-${size} h-${size} ${color}`} />
    </motion.div>
    {/* Floating particles */}
    <motion.div 
      className="absolute inset-0"
      animate={{ 
        rotate: [0, 360],
        scale: [1, 1.2, 1]
      }}
      transition={{ 
        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <Star className={`w-${Math.max(3, size-2)} h-${Math.max(3, size-2)} ${color} opacity-40`} />
    </motion.div>
  </div>
);

// Enhanced Horizontal Timer with cooler effects
const HorizontalTimer = ({ timeLeft, totalTime = 15 }: { timeLeft: number, totalTime?: number }) => {
  const progress = (timeLeft / totalTime) * 100;
  
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'from-red-400 to-orange-500';
    if (timeLeft <= 7) return 'from-orange-400 to-amber-500';
    return 'from-emerald-400 to-teal-500';
  };

  const getTimerGlow = () => {
    if (timeLeft <= 3) return 'shadow-red-300/50';
    if (timeLeft <= 7) return 'shadow-orange-300/50';
    return 'shadow-emerald-300/50';
  };

  return (
    <motion.div 
      className="w-full mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Timer display */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ rotate: timeLeft <= 5 ? [0, -10, 10, 0] : 0 }}
            transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Infinity : 0 }}
          >
            <Clock className="w-4 h-4 text-stone-600" />
          </motion.div>
          <span className="text-sm font-bold text-stone-700">Time Left</span>
        </div>
        <motion.span 
          className={`font-black text-xl ${timeLeft <= 5 ? 'text-red-500' : 'text-stone-800'}`}
          animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3, repeat: timeLeft <= 5 ? Infinity : 0 }}
        >
          {timeLeft}s
        </motion.span>
      </div>
      
      {/* Progress bar container */}
      <div className="relative w-full bg-stone-200/80 rounded-full h-4 overflow-hidden shadow-inner backdrop-blur-sm">
        <motion.div 
          className={`h-full bg-gradient-to-r ${getTimerColor()} rounded-full shadow-lg ${getTimerGlow()} relative overflow-hidden`}
          style={{ width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Animated shine effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{ x: [-100, 200] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Pulsing effect when time is low */}
          {timeLeft <= 5 && (
            <motion.div 
              className="absolute inset-0 bg-red-400/50"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
      
      {/* Warning text for low time */}
      <AnimatePresence>
        {timeLeft <= 5 && (
          <motion.div 
            className="text-center mt-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.span 
              className="text-red-500 font-bold text-sm flex items-center justify-center space-x-2"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Time running out!</span>
              <Sparkles className="w-4 h-4" />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced Question Result Component with particle effects
const QuestionResult = ({ result, correctAnswer, userAnswer, onContinue, isLastQuestion }: { result: QuestionResult, correctAnswer: string, userAnswer: string, onContinue: () => void, isLastQuestion: boolean }) => {
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className={`bg-gradient-to-br from-stone-50 to-amber-50/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl border-2 ${
            result.isCorrect ? 'border-emerald-300/60' : 'border-orange-300/60'
          } relative overflow-hidden`}
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          
          {/* Floating particles for correct answers */}
          {result.isCorrect && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${
                    i % 3 === 0 ? 'bg-amber-400' : i % 3 === 1 ? 'bg-emerald-400' : 'bg-blue-400'
                  }`}
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${10 + Math.random() * 80}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </>
          )}
          
          <div className="relative text-center">
            {/* Enhanced result icon */}
            <motion.div 
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-2xl ${
                result.isCorrect 
                  ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500' 
                  : 'bg-gradient-to-br from-orange-400 via-amber-500 to-red-500'
              }`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {result.isCorrect ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <X className="w-10 h-10 text-white" />
                </motion.div>
              )}
            </motion.div>
            
            {/* Enhanced result title */}
            <motion.h3 
              className={`text-2xl font-black mb-4 ${
                result.isCorrect ? 'text-emerald-700' : 'text-orange-700'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {result.isCorrect ? '🎉 Excellent!' : '🎯 Close One!'}
            </motion.h3>
            
            {/* Enhanced answer feedback */}
            <motion.div 
              className={`p-4 rounded-2xl mb-6 border-2 backdrop-blur-sm ${
                result.isCorrect 
                  ? 'bg-emerald-50/80 border-emerald-200/60' 
                  : 'bg-orange-50/80 border-orange-200/60'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {!result.isCorrect && (
                <p className="text-sm text-stone-600 mb-2">
                  <span className="font-bold">Your answer:</span> {userAnswer}
                </p>
              )}
              <p className="text-sm text-stone-600 mb-3">
                <span className="font-bold">Correct answer:</span> {correctAnswer}
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                {result.explanation}
              </p>
            </motion.div>
            
            {/* Enhanced continue button */}
            <motion.button
              onClick={onContinue}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all shadow-lg ${
                result.isCorrect
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:shadow-emerald-300/50'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:shadow-orange-300/50'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center space-x-2">
                {isLastQuestion ? (
                  <>
                    <Trophy className="w-5 h-5" />
                    <span>View Results</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-5 h-5" />
                    <span>Continue Quest</span>
                  </>
                )}
              </div>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Enhanced Quiz Info Modal with better animations
const QuizInfoModal = ({ 
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
        className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-gradient-to-br from-stone-50 to-amber-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-amber-200/60 relative overflow-hidden"
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Animated background elements */}
          <motion.div 
            className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-amber-300/30 to-orange-300/30 rounded-full"
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ rotate: { duration: 10, repeat: Infinity }, scale: { duration: 3, repeat: Infinity } }}
          />
          
          <div className="relative text-center">
            <motion.div 
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>
            
            <motion.h3 
              className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              🎮 Ready to Quest?
            </motion.h3>
            
            {/* Enhanced Fee Warning */}
            <motion.div 
              className="bg-gradient-to-r from-orange-50/80 to-red-50/80 rounded-xl p-4 mb-4 border border-orange-200/60 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-600">💰 Entry Fee</span>
                <span className="text-sm font-black text-orange-700">{quizFee} CELO</span>
              </div>
              <p className="text-xs text-stone-500">This amount will be deducted from your wallet</p>
            </motion.div>
            
            {/* Enhanced Potential Winnings */}
            <motion.div 
              className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl p-4 mb-6 border border-emerald-200/60 backdrop-blur-sm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-600">🏆 Potential Winnings</span>
                <span className="text-sm font-black text-emerald-700">{potentialWinnings} CELO</span>
              </div>
              <p className="text-xs text-stone-500">Win by scoring 60% or higher!</p>
            </motion.div>
            
            {/* Enhanced Action Buttons */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={onStart}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <LoadingSpinner size={6} color="text-white" />
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>🚀 Start Quest</span>
                  </>
                )}
              </motion.button>
              
              <motion.button
                onClick={onClose}
                className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                ⏰ Maybe later
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Enhanced Quiz Generation Modal with floating elements
const QuizGenerationModal = ({ isVisible, topic }: QuizGenerationModalProps) => {
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-gradient-to-br from-stone-50 to-amber-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-amber-200/60 relative overflow-hidden"
          initial={{ scale: 0.8, rotate: -5, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.8, rotate: 5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Multiple animated background layers */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-16 h-16 rounded-full opacity-10 ${
                i % 2 === 0 ? 'bg-amber-400' : 'bg-orange-400'
              }`}
              style={{
                top: `${20 + (i * 20)}%`,
                left: `${10 + (i * 20)}%`,
              }}
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 8 + i * 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 3 + i, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          ))}
          
          <div className="relative text-center">
            <motion.div 
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>
            
            <motion.h3 
              className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              🤖 AI Magic in Progress
            </motion.h3>
            
            {/* Enhanced AI Info Box */}
            <motion.div 
              className="bg-gradient-to-r from-amber-50/80 via-orange-50/80 to-red-50/80 rounded-xl p-4 mb-4 border border-amber-200/60 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-stone-700 font-bold text-sm sm:text-base mb-2">
                ✨ Did you know?
              </p>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Each player gets <span className="font-bold text-amber-700">unique questions</span> generated by AI! 
                No two quests are ever the same! 🎯
              </p>
            </motion.div>
            
            <motion.p 
              className="text-stone-600 mb-2 text-sm sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              🎮 Crafting your personalized quest about
            </motion.p>
            
            <motion.p 
              className="font-black text-stone-800 mb-4 sm:mb-6 text-sm sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {topic?.title} ⚡
            </motion.p>
            
            <motion.div 
              className="flex justify-center space-x-3 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-orange-400' : 'bg-red-400'
                  }`}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
            
            <motion.p 
              className="text-xs sm:text-sm text-stone-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🚀 AI is brewing your unique challenge...
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Enhanced Transaction Modal with celebration effects
const TransactionModal = ({ isVisible, status, txHash, onClose }: TransactionModalProps) => {
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-emerald-900/20 to-teal-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-gradient-to-br from-stone-50 to-emerald-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-emerald-200/60 relative overflow-hidden"
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Animated background */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-teal-50/60 to-green-50/60"
            animate={{ opacity: [0.6, 0.8, 0.6] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          
          <div className="relative text-center">
            <motion.div 
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
              animate={status === 'success' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: status === 'success' ? 3 : 0 }}
            >
              {status === 'pending' ? (
                <LoadingSpinner size={8} color="text-white" />
              ) : status === 'success' ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </motion.div>
              ) : (
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              )}
            </motion.div>
            
            <motion.h3 
              className="text-xl sm:text-2xl font-black text-stone-800 mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {status === 'pending' ? '⚡ Processing Magic' : 
               status === 'success' ? '🎉 Success!' : 
               '❌ Oops!'}
            </motion.h3>
            
            {status === 'pending' && (
 <motion.p 
   className="text-stone-600 mb-4 sm:mb-6 text-sm sm:text-base"
   animate={{ opacity: [0.7, 1, 0.7] }}
   transition={{ duration: 2, repeat: Infinity }}
 >
   🌟 Your transaction is being processed on the blockchain...
 </motion.p>
)}

{status === 'success' && (
 <motion.p 
   className="text-stone-600 mb-4 sm:mb-6 text-sm sm:text-base"
   initial={{ opacity: 0, y: 20 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ delay: 0.3 }}
 >
   🚀 Your quiz quest has begun! Ready to earn some CELO? 
 </motion.p>
)}

{txHash && (
 <motion.div 
   className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-xl p-3 mb-4 sm:mb-6 border border-teal-200/60 backdrop-blur-sm"
   initial={{ opacity: 0, scale: 0.9 }}
   animate={{ opacity: 1, scale: 1 }}
   transition={{ delay: 0.4 }}
 >
   <p className="text-xs text-stone-500 mb-1">🔗 Transaction Hash</p>
   <p className="font-mono text-xs text-stone-700 break-all">{txHash}</p>
 </motion.div>
)}

{status !== 'pending' && (
 <motion.button
   onClick={onClose}
   className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
   initial={{ opacity: 0, y: 20 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ delay: 0.5 }}
   whileHover={{ scale: 1.02, y: -2 }}
   whileTap={{ scale: 0.98 }}
 >
   <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 animate-pulse opacity-50"></div>
   <div className="relative flex items-center space-x-3">
     <CheckCircle className="w-6 h-6" />
     <span>✨ Continue to Quiz</span>
   </div>
 </motion.button>
)}
         </div>
       </motion.div>
     </motion.div>
   </AnimatePresence>
 );
};

// Enhanced Network Check Modal
const NetworkCheckModal = ({ 
 showNetworkModal,
 isSwitchingNetwork, 
 networkError, 
 switchToCelo,
 setShowNetworkModal 
}: NetworkCheckModalProps) => {
 if (!showNetworkModal) return null;
 
 return (
   <AnimatePresence>
     <motion.div 
       className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-orange-900/20 to-red-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
     >
       <motion.div 
         className="bg-gradient-to-br from-stone-50 to-orange-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-orange-200/60 relative overflow-hidden"
         initial={{ scale: 0.8, rotate: -3, opacity: 0 }}
         animate={{ scale: 1, rotate: 0, opacity: 1 }}
         exit={{ scale: 0.8, rotate: 3, opacity: 0 }}
         transition={{ type: "spring", stiffness: 300, damping: 25 }}
       >
         {/* Animated background elements */}
         <motion.div 
           className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-orange-300/30 to-red-300/30 rounded-full"
           animate={{ rotate: 360, scale: [1, 1.3, 1] }}
           transition={{ rotate: { duration: 8, repeat: Infinity }, scale: { duration: 4, repeat: Infinity } }}
         />
         <motion.div 
           className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-br from-amber-300/30 to-orange-300/30 rounded-full"
           animate={{ rotate: -360, scale: [1, 1.2, 1] }}
           transition={{ rotate: { duration: 10, repeat: Infinity }, scale: { duration: 3, repeat: Infinity } }}
         />
         
         <div className="relative text-center">
           <motion.div 
             className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
             animate={isSwitchingNetwork ? { rotate: 360 } : { rotate: [0, -10, 10, 0] }}
             transition={{ 
               rotate: isSwitchingNetwork ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 2, repeat: Infinity }
             }}
           >
             {isSwitchingNetwork ? (
               <LoadingSpinner size={8} color="text-white" />
             ) : (
               <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
             )}
           </motion.div>
           
           <motion.h3 
             className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-700 via-red-700 to-pink-700 bg-clip-text text-transparent mb-3"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             {isSwitchingNetwork ? '⚡ Switching Networks' : '🔄 Wrong Network'}
           </motion.h3>
           
           <motion.p 
             className="text-stone-600 text-sm sm:text-base mb-6"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.3 }}
           >
             {isSwitchingNetwork 
               ? '🌟 Switching to Celo network...' 
               : '🎮 Quizelo runs on the Celo network! Please switch to continue your adventure.'
             }
           </motion.p>
           
           {/* Enhanced Network Info */}
           <motion.div 
             className="bg-gradient-to-r from-orange-50/80 to-red-50/80 rounded-xl p-4 mb-6 border border-orange-200/60 backdrop-blur-sm"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4 }}
           >
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs text-stone-500 font-bold">Current Network</span>
               <span className="text-xs text-red-600 font-black">❌ Wrong</span>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-xs text-stone-500 font-bold">Required Network</span>
               <span className="text-xs text-emerald-600 font-black">✅ Celo</span>
             </div>
           </motion.div>
           
           {/* Error Message */}
           {networkError && (
             <motion.div 
               className="bg-gradient-to-r from-red-100/80 to-pink-100/80 border border-red-200/60 rounded-xl p-3 mb-4 backdrop-blur-sm"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.5 }}
             >
               <p className="text-red-700 text-xs font-bold">⚠️ {networkError}</p>
             </motion.div>
           )}
           
           {/* Enhanced Action Buttons */}
           <motion.div 
             className="space-y-3"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6 }}
           >
             <motion.button
               onClick={switchToCelo}
               disabled={isSwitchingNetwork}
               className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
               whileHover={!isSwitchingNetwork ? { scale: 1.02, y: -2 } : {}}
               whileTap={!isSwitchingNetwork ? { scale: 0.98 } : {}}
             >
               <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 animate-pulse opacity-50"></div>
               <div className="relative flex items-center space-x-3">
                 {isSwitchingNetwork ? (
                   <LoadingSpinner size={6} color="text-white" />
                 ) : (
                   <RefreshCw className="w-5 h-5" />
                 )}
                 <span>
                   {isSwitchingNetwork ? '🔄 Switching...' : '🚀 Switch to Celo'}
                 </span>
               </div>
             </motion.button>
             
             {!isSwitchingNetwork && (
               <motion.button
                 onClick={() => setShowNetworkModal(false)}
                 className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
                 whileHover={{ scale: 1.02 }}
               >
                 ⏰ Maybe later
               </motion.button>
             )}
           </motion.div>
           
           {/* Enhanced Help Text */}
           <motion.div 
             className="mt-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200/60 backdrop-blur-sm"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.7 }}
           >
             <p className="text-xs text-blue-700 font-bold">
               💡 Tip: You can also manually switch networks in your wallet settings
             </p>
           </motion.div>
         </div>
       </motion.div>
     </motion.div>
   </AnimatePresence>
 );
 };

const QuizeloApp = () => {
 const [activeTab, setActiveTab] = useState('home');
 const [showConnectWallet, setShowConnectWallet] = useState(false);
 const [showTopicModal, setShowTopicModal] = useState(false);
 const [showProfileDropdown, setShowProfileDropdown] = useState(false);
 const [isInQuiz, setIsInQuiz] = useState(false);
 const [showResults, setShowResults] = useState(false);
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
 const [userAnswers, setUserAnswers] = useState<number[]>([]);
 const [showQuizGeneration, setShowQuizGeneration] = useState(false);
 const [showTransactionModal, setShowTransactionModal] = useState(false);
 const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error'>('pending');
 const [currentTxHash, setCurrentTxHash] = useState('');
 const [timeLeft, setTimeLeft] = useState(15);
 const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
 const [finalScore, setFinalScore] = useState<ScoreResult | null>(null);
 const [showNetworkModal, setShowNetworkModal] = useState(false);
 const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
 const [networkError, setNetworkError] = useState('');
 const [showQuestionResult, setShowQuestionResult] = useState(false);
 const [currentQuestionResult, setCurrentQuestionResult] = useState<QuestionResult | null>(null);
 const [isAnswered, setIsAnswered] = useState(false);
 const [showQuizInfo, setShowQuizInfo] = useState(false);
 const [isTimeUp, setIsTimeUp] = useState(false);
 const [context, setContext] = useState<{
   client?: {
     clientFid?: number;
     safeAreaInsets?: {
       top?: number;
       bottom?: number;
       left?: number;
       right?: number;
     };
   };
   user?: {
     fid?: number;
   };
 }>();
 const [isSDKLoaded, setIsSDKLoaded] = useState(false);
 const [isMiniApp, setIsMiniApp] = useState(false);

 // Your hooks
 const quizelo = useQuizelo();
 const { topics, selectedTopic, selectTopic } = useTopics();
 const { generateQuestions, loading: aiLoading, error: aiError, questions, markAnswer, calculateScore } = useAI();
 const { 
   leaderboard, 
   stats, 
   isLoading: leaderboardLoading, 
   error: leaderboardError,
   getPlayerRank,
   getPlayerStats,
   getTopByEarnings,
   
   formatEarnings,
   formatWinRate,
   formatAddress: formatLeaderboardAddress
 } = useLeaderboard();
 const { switchChain } = useSwitchChain();
 const chainId = useChainId();
 const { address, isConnected } = useAccount();
 const { connect, connectors } = useConnect();

 // Detect if we're in Farcaster
 const isInFarcaster = context?.client?.clientFid !== undefined;

 const handleAnswer = useMemo(() => (answerIndex: number) => {
   if (isAnswered || isTimeUp) return; // Prevent multiple answers
   
   // Batch related state updates to prevent cascading effects
   setIsAnswered(true);
   
   // Use setTimeout to batch the rest of the state updates
   setTimeout(() => {
     const newAnswers = [...userAnswers, answerIndex];
     setUserAnswers(newAnswers);

     // Get result for this question
     const result = markAnswer(currentQuestionIndex, answerIndex);
     const correctAnswer = questions[currentQuestionIndex].options[questions[currentQuestionIndex].correctAnswer];
     const userAnswer = answerIndex >= 0 ? questions[currentQuestionIndex].options[answerIndex] : 'No answer';
     
     setCurrentQuestionResult({
       isCorrect: result?.isCorrect || false,
       explanation: result?.explanation || '',
       correctAnswer,
       userAnswer,
       isLastQuestion: currentQuestionIndex === questions.length - 1
     });
     
     setShowQuestionResult(true);
   }, 0);
 }, [isAnswered, isTimeUp, userAnswers, currentQuestionIndex, questions, markAnswer]);

 // Timer effect for quiz questions
 useEffect(() => {
   let timer: NodeJS.Timeout | undefined;
   
   // Only start timer if quiz is active and question is not answered
   if (isInQuiz && !showResults && !showQuestionResult && !isAnswered && timeLeft > 0) {
     timer = setInterval(() => {
       setTimeLeft(prev => {
         if (prev <= 1) {
           // Handle timeout directly here instead of triggering cascading effects
           if (!isAnswered && !isTimeUp) {
             // Use setTimeout to avoid state update conflicts
             setTimeout(() => {
               handleAnswer(-1);
             }, 0);
           }
           return 0;
         }
         return prev - 1;
       });
     }, 1000);
   }
   
   return () => {
     if (timer) clearInterval(timer);
   };
 }, [isInQuiz, showResults, showQuestionResult, isAnswered, handleAnswer, isTimeUp, timeLeft]);

 // Reset timer when question changes
 useEffect(() => {
   if (isInQuiz && !showResults) {
     setTimeLeft(15);
     setIsTimeUp(false);
     setIsAnswered(false);
   }
 }, [currentQuestionIndex, isInQuiz, showResults]); // Include missing dependencies

 // Check wallet connection on mount and handle disconnection
 useEffect(() => {
   // Check if wallet is already connected

   if (isMiniApp && !isConnected) {
     setShowConnectWallet(false);
     connect({ connector: farcasterFrame() });
   } else if (address && !quizelo.isConnected) {
     // Wallet is connected but quizelo hook hasn't detected it yet
     // This will be handled by the quizelo hook's own useEffect
   } else if (!address && !quizelo.isConnected && !isMiniApp) {
     // No wallet connected and not in mini app, show connect modal
     setShowConnectWallet(true);
   } else if (address && quizelo.isConnected) {
     // Wallet is connected and quizelo hook has detected it
     setShowConnectWallet(false);
     
     // In Farcaster, manually trigger data loading after connection
     if (isMiniApp && isInFarcaster) {
       console.log('Wallet connected in Farcaster, triggering data load...');
       setTimeout(() => {
         quizelo.refetchUserInfo();
         quizelo.refetchContractStats();
         quizelo.refetchActiveQuizTakers();
       }, 1000); // Small delay to ensure connection is stable
     }
   } else if (!address && quizelo.isConnected) {
     // Wallet was disconnected
     setShowConnectWallet(true);
   }
 }, [address, quizelo.isConnected, isMiniApp, isConnected, connect, isInFarcaster, quizelo]);

 const switchToCelo = useCallback(async () => {
   try {
     setIsSwitchingNetwork(true);
     setNetworkError('');
     await switchChain({ chainId: celo.id });
     setShowNetworkModal(false);
   } catch (error) {
     console.error('Failed to switch to Celo network:', error);
     setNetworkError('Failed to switch to Celo network. Please try manually switching in your wallet.');
   } finally {
     setIsSwitchingNetwork(false);
   }
 }, [switchChain]);

 // Check network on connection
 useEffect(() => {
   if (isConnected && chainId !== celo.id) {
     setShowNetworkModal(true);
     // Auto-attempt to switch
     switchToCelo();
   } else if (isConnected && chainId === celo.id) {
     setShowNetworkModal(false);
   }
 }, [isConnected, chainId, switchToCelo]);

 const handleTopicSelect = async (topic: TopicWithMetadata) => {
   selectTopic(topic);
   setShowTopicModal(false);
   
   if (!isConnected) {
     setShowConnectWallet(true);
     return;
   }
   
   // Check if on correct network
   if (chainId !== celo.id) {
     setShowNetworkModal(true);
     await switchToCelo();
     return;
   }

   // Show quiz info modal instead of starting quiz directly
   setShowQuizInfo(true);
 };

 const handleStartQuiz = async () => {
   setShowQuizInfo(false);
   await startQuizFlow();
 };

 const startQuizFlow = async (topic = selectedTopic) => {
   if (!topic) {
     setShowTopicModal(true);
     return;
   }
   
   // Double check network before starting
   if (chainId !== celo.id) {
     setShowNetworkModal(true);
     await switchToCelo();
     return;
   }

   try {
     setShowTransactionModal(true);
     setTransactionStatus('pending');
     
     const result = await quizelo.startQuiz();
     setCurrentTxHash(quizelo.txHash || '');
     
     if (result.success) {
       setQuizSessionId(result.sessionId);
       setTransactionStatus('success');
       
       setTimeout(() => {
         setShowTransactionModal(false);
         setShowQuizGeneration(true);
         
         const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
         generateQuestions(topic, apiKey).then(() => {
           setShowQuizGeneration(false);
           setIsInQuiz(true);
           setShowResults(false);
           setCurrentQuestionIndex(0);
           setUserAnswers([]);
           setTimeLeft(15);
         }).catch(() => {
           setShowQuizGeneration(false);
         });
       }, 2000);
     } else {
       setTransactionStatus('error');
     }
   } catch (error) {
     console.error('Failed to start quiz:', error);
     setTransactionStatus('error');
   }
 };

 const handleContinueToNext = () => {
   setShowQuestionResult(false);
   
   // Batch state updates to prevent cascading effects
   setTimeout(() => {
     setIsAnswered(false);
     setIsTimeUp(false); // Reset time up flag
     
     if (currentQuestionIndex < questions.length - 1) {
       setCurrentQuestionIndex(currentQuestionIndex + 1);
       // Timer will be reset by the useEffect that depends on currentQuestionIndex
     } else {
       // Calculate final score and show results
       const score = calculateScore(userAnswers);
       setFinalScore(score);
       setIsInQuiz(false);
       setShowResults(true);
     }
     
     setCurrentQuestionResult(null);
   }, 0);
 };

 const handleClaimReward = async () => {
   if (!quizSessionId || !finalScore) return;
   
   try {
     await quizelo.claimReward(quizSessionId, finalScore.percentage);
     setShowResults(false);
     setQuizSessionId(null);
     setFinalScore(null);
   } catch (error) {
     console.error('Failed to claim reward:', error);
   }
 };

 const handleRetakeQuiz = () => {
   setShowResults(false);
   setQuizSessionId(null);
   setFinalScore(null);
   setShowTopicModal(true);
 };

 // Enhanced Results Page with particle effects
 const ResultsPage = () => {
   if (!finalScore) return null;

   const getScoreEmoji = (percentage: number) => {
     if (percentage >= 90) return '👑';
     if (percentage >= 80) return '🏆';
     if (percentage >= 70) return '🥇';
     if (percentage >= 60) return '🎯';
     return '💪';
   };

   const getScoreColor = (percentage: number) => {
     if (percentage >= 80) return 'from-amber-400 via-orange-500 to-red-500';
     if (percentage >= 60) return 'from-emerald-400 via-teal-500 to-green-500';
     return 'from-blue-400 via-purple-500 to-pink-500';
   };

   const getScoreMessage = (percentage: number) => {
     if (percentage >= 90) return 'LEGENDARY! 🌟';
     if (percentage >= 80) return 'AMAZING! 🎯';
     if (percentage >= 70) return 'GREAT JOB! 🚀';
     if (percentage >= 60) return 'WELL DONE! 💫';
     return 'KEEP GOING! 💪';
   };

   return (
     <motion.div 
       className="fixed inset-0 bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 overflow-y-auto"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       transition={{ duration: 0.8 }}
     >
       <div className="min-h-screen p-4 sm:p-6">
         <div className="max-w-lg mx-auto">
           {/* Enhanced Celebration Header */}
           <motion.div 
             className="text-center mb-6 sm:mb-8 relative"
             initial={{ opacity: 0, y: -50 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, type: "spring", stiffness: 100 }}
           >
             <div className="absolute inset-0 animate-pulse">
               <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-r from-amber-200/30 to-orange-200/30"></div>
             </div>
             
             {/* Floating celebration particles */}
             {[...Array(8)].map((_, i) => (
               <motion.div
                 key={i}
                 className={`absolute w-3 h-3 rounded-full ${
                   i % 3 === 0 ? 'bg-amber-400' : i % 3 === 1 ? 'bg-orange-400' : 'bg-red-400'
                 }`}
                 style={{
                   top: `${20 + Math.random() * 60}%`,
                   left: `${20 + Math.random() * 60}%`,
                 }}
                 animate={{
                   y: [0, -30, 0],
                   opacity: [0, 1, 0],
                   scale: [0, 1.2, 0],
                 }}
                 transition={{
                   duration: 3,
                   repeat: Infinity,
                   delay: i * 0.4,
                   ease: "easeInOut"
                 }}
               />
             ))}
             
             <motion.div 
               className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl`}
               animate={{ 
                 rotate: [0, 360],
                 scale: [1, 1.1, 1]
               }}
               transition={{ 
                 rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                 scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
               }}
             >
               <span className="text-3xl sm:text-4xl">{getScoreEmoji(finalScore.percentage)}</span>
             </motion.div>
             
             <motion.h1 
               className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-2"
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
             >
               Quest Complete!
             </motion.h1>
             
             <motion.p 
               className="text-stone-600 text-sm sm:text-base"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.7 }}
             >
               🎉 Check out your epic results!
             </motion.p>
           </motion.div>

           {/* Enhanced Score Card with glass effect */}
           <motion.div 
             className="bg-stone-50/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-stone-200/50 mb-6 relative overflow-hidden"
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
           >
             <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/30 to-stone-50/30"></div>
             <motion.div 
               className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full"
               animate={{ rotate: 360, scale: [1, 1.2, 1] }}
               transition={{ 
                 rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                 scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
               }}
             />
             
             <div className="relative text-center">
               <motion.div 
                 className={`text-5xl sm:text-7xl font-black mb-3 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} bg-clip-text text-transparent`}
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
               >
                 {finalScore.percentage}%
               </motion.div>
               
               <motion.p 
                 className="text-xl sm:text-2xl font-black text-stone-800 mb-2"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.7 }}
               >
                 {getScoreMessage(finalScore.percentage)}
               </motion.p>
               
               <motion.div 
                 className="flex items-center justify-center space-x-2 text-stone-600"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.9 }}
               >
                 <Target className="w-4 h-4" />
                 <span className="text-sm sm:text-base">
                   {finalScore.correct} out of {finalScore.total} correct
                 </span>
               </motion.div>
             </div>
           </motion.div>

           {/* Enhanced Topic Badge */}
           <motion.div 
             className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-stone-200/50 mb-6"
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
           >
             <div className="flex items-center space-x-3 sm:space-x-4">
               <motion.div 
                 className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100 to-orange-100 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg"
                 whileHover={{ rotate: 360, scale: 1.1 }}
                 transition={{ duration: 0.6 }}
               >
                 {selectedTopic?.icon}
               </motion.div>
               <div>
                 <h3 className="font-black text-stone-800 text-base sm:text-lg">{selectedTopic?.title}</h3>
                 <p className="text-stone-600 text-sm sm:text-base">{selectedTopic?.description}</p>
               </div>
             </div>
           </motion.div>

           {/* Enhanced Action Buttons */}
           <motion.div 
             className="space-y-4"
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.7 }}
           >
             {finalScore?.percentage >= 60 && (
               <motion.button
                 onClick={handleClaimReward}
                 disabled={quizelo.isLoading}
                 className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
                 whileHover={{ scale: 1.02, y: -2 }}
                 whileTap={{ scale: 0.98 }}
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 animate-pulse opacity-50"></div>
                 <div className="relative flex items-center space-x-3">
                   {quizelo.isLoading ? (
                     <LoadingSpinner size={6} color="text-white" />
                   ) : (
                     <>
                       <Coins className="w-6 h-6" />
                       <span>🎁 Claim Your Reward!</span>
                     </>
                   )}
                 </div>
               </motion.button>
             )}
             
             <motion.button
               onClick={handleRetakeQuiz}
               className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-3"
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
             >
               <RefreshCw className="w-5 h-5" />
               <span>🚀 Take Another Quest</span>
             </motion.button>
             
             <motion.button
               onClick={() => {
                 setShowResults(false);
                 setQuizSessionId(null);
                 setFinalScore(null);
               }}
               className="w-full bg-gradient-to-r from-stone-200 to-stone-300 text-stone-700 py-4 rounded-2xl font-semibold hover:from-stone-300 hover:to-stone-400 transition-all"
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
             >
               🏠 Back to Home Base
             </motion.button>
           </motion.div>
         </div>
       </div>
     </motion.div>
   );
 };

 // Enhanced Quiz Interface with better animations
 const QuizInterface = () => {
   if (!questions[currentQuestionIndex]) return null;

   const question = questions[currentQuestionIndex];

   return (
     <motion.div 
       className="fixed inset-0 bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 overflow-y-auto"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       transition={{ duration: 0.6 }}
     >
       <div className="min-h-screen p-4 sm:p-6">
         <div className="max-w-lg mx-auto">
           {/* Enhanced Game Header */}
           <motion.div 
             className="flex items-center justify-between mb-4 sm:mb-6 bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-stone-200/50"
             initial={{ opacity: 0, y: -30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
           >
             <div className="flex items-center space-x-3">
               <motion.div 
                 className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg"
                 animate={{ rotate: [0, 360] }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
               >
                 <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
               </motion.div>
               <div>
                 <h1 className="font-black text-stone-800 text-sm sm:text-base">{selectedTopic?.title}</h1>
                 <p className="text-xs sm:text-sm text-stone-500">
                   🎯 Question {currentQuestionIndex + 1} of {questions.length}
                 </p>
               </div>
             </div>
           </motion.div>

           {/* Enhanced Horizontal Timer */}
           <HorizontalTimer 
             timeLeft={timeLeft} 
             totalTime={15} 
           />

           {/* Enhanced Progress with XP bar style */}
           <motion.div 
             className="mb-6"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             <div className="flex justify-between items-center mb-2">
               <span className="text-sm font-bold text-stone-600">🏆 Progress</span>
               <span className="text-sm font-bold text-stone-600">
                 {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
               </span>
             </div>
             <div className="w-full bg-stone-200/80 rounded-full h-3 overflow-hidden shadow-inner backdrop-blur-sm">
               <motion.div 
                 className="bg-gradient-to-r from-emerald-400 via-teal-500 to-green-500 h-full rounded-full shadow-lg"
                 initial={{ width: 0 }}
                 animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                 transition={{ duration: 0.8, ease: "easeOut" }}
               />
             </div>
           </motion.div>

           {/* Enhanced Question Card */}
           <motion.div 
             className="bg-stone-50/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-stone-200/50 mb-6 relative overflow-hidden"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
           >
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
             
             <div className="relative">
               <div className="flex items-start space-x-4 mb-6">
                 <motion.div 
                   className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg"
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                 >
                   <span className="text-white text-sm sm:text-base font-bold">{currentQuestionIndex + 1}</span>
                 </motion.div>
                 <h2 className="text-lg sm:text-xl font-black text-stone-800 leading-relaxed">
                   {question.question}
                 </h2>
               </div>
               
               <div className="space-y-4">
                 {question.options.map((option, index) => (
                   <motion.button
                     key={index}
                     onClick={() => handleAnswer(index)}
                     disabled={isAnswered}
                     className={`w-full p-4 sm:p-5 text-left rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden shadow-lg ${
                       isAnswered
                         ? index === question.correctAnswer
                           ? 'border-emerald-400 bg-gradient-to-r from-emerald-100/80 to-teal-100/80 shadow-emerald-200/50'
                           : index === userAnswers[currentQuestionIndex]
                           ? 'border-red-400 bg-gradient-to-r from-red-100/80 to-orange-100/80 shadow-red-200/50'
                           : 'border-stone-200 bg-stone-50/50'
                         : 'border-stone-200/60 bg-stone-50/40 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-orange-50/80 hover:shadow-xl'
                     }`}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.4 + index * 0.1 }}
                     whileHover={!isAnswered ? { scale: 1.02, x: 5 } : {}}
                     whileTap={!isAnswered ? { scale: 0.98 } : {}}
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-orange-400/5 to-red-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative flex items-center space-x-4">
                       <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold shadow-lg transition-all ${
                         isAnswered
                           ? index === question.correctAnswer
                             ? 'border-emerald-400 bg-emerald-400 text-white'
                             : index === userAnswers[currentQuestionIndex]
                             ? 'border-red-400 bg-red-400 text-white'
                             : 'border-stone-300 bg-stone-100 text-stone-400'
                           : 'border-amber-300 bg-stone-50 text-amber-700 group-hover:border-amber-400 group-hover:bg-amber-400 group-hover:text-white'
                       }`}>
                         <span className="text-sm">
                           {String.fromCharCode(65 + index)}
                         </span>
                       </div>
                       <span className="text-stone-700 group-hover:text-stone-800 font-medium text-sm sm:text-base flex-1">
                         {option}
                       </span>
                     </div>
                   </motion.button>
                 ))}
               </div>
             </div>
           </motion.div>
         </div>
       </div>

       {/* Question Result Modal */}
       {showQuestionResult && currentQuestionResult && (
         <QuestionResult
           result={currentQuestionResult}
           correctAnswer={currentQuestionResult.correctAnswer}
           userAnswer={currentQuestionResult.userAnswer}
           onContinue={handleContinueToNext}
           isLastQuestion={currentQuestionResult.isLastQuestion}
         />
       )}
     </motion.div>
   );
 };

 const formatAddress = (addr: string) => {
   if (!addr) return '';
   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
 };
 
 // Enhanced Connect Wallet Modal
 const ConnectWalletModal = () => (
   <AnimatePresence>
     <motion.div 
       className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
     >
       <motion.div 
         className="bg-gradient-to-br from-stone-50 to-amber-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-amber-200/60 relative overflow-hidden"
         initial={{ scale: 0.8, y: 50, opacity: 0 }}
         animate={{ scale: 1, y: 0, opacity: 1 }}
         exit={{ scale: 0.8, y: -50, opacity: 0 }}
         transition={{ type: "spring", stiffness: 300, damping: 25 }}
       >
         <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-orange-50/60 to-stone-50/60"></div>
         <motion.div 
           className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-orange-300/30 to-amber-300/30 rounded-full"
           animate={{ rotate: 360, scale: [1, 1.2, 1] }}
           transition={{ rotate: { duration: 8, repeat: Infinity }, scale: { duration: 4, repeat: Infinity } }}
         />
         
         <div className="relative text-center">
           <motion.div 
             className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 2, repeat: Infinity }}
           >
             <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
           </motion.div>
           
           <motion.h3 
             className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             🔗 Connect & Play!
           </motion.h3>
           
           <motion.p 
             className="text-stone-600 text-sm sm:text-base mb-6 sm:mb-8"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.3 }}
           >
             {isMiniApp && isInFarcaster 
               ? '🎮 Connect your wallet to start your learning adventure!' 
               : '🎮 Connect your Celo wallet to start your learning adventure and earn rewards!'
             }
           </motion.p>
           
           {isMiniApp && isInFarcaster ? (
             // In Farcaster Mini App, show specific connectors
             <motion.div 
               className="space-y-3"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
             >
               <motion.button
                 onClick={() => {
                   const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
                   if (farcasterConnector) {
                     connect({ connector: farcasterConnector });
                   } else {
                     connect({ connector: injected() });
                   }
                   setShowConnectWallet(false);
                 }}
                 className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-3"
                 whileHover={{ scale: 1.02, y: -2 }}
                 whileTap={{ scale: 0.98 }}
               >
                 🎯 Connect in Farcaster
               </motion.button>
               
               {connectors.length > 1 && (
                 <motion.button
                   onClick={() => {
                     connect({ connector: connectors.find((c) => c.name.includes('Coinbase')) || connectors[1] });
                     setShowConnectWallet(false);
                   }}
                   className="w-full bg-blue-500 text-white py-3 rounded-2xl font-bold hover:shadow-xl transition-all"
                   whileHover={{ scale: 1.02, y: -2 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   🔵 Coinbase Wallet
                 </motion.button>
               )}
               
               {connectors.length > 2 && (
                 <motion.button
                   onClick={() => {
                     connect({ connector: connectors.find((c) => c.name.includes('MetaMask')) || connectors[2] });
                     setShowConnectWallet(false);
                   }}
                   className="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold hover:shadow-xl transition-all"
                   whileHover={{ scale: 1.02, y: -2 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   🦊 MetaMask
                 </motion.button>
               )}
             </motion.div>
           ) : (
             // Outside Farcaster or regular web, show default injected wallet
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
             >
               <motion.button
                 onClick={() => {
                   connect({ connector: injected() });
                   setShowConnectWallet(false);
                 }}
                 className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-4"
                 whileHover={{ scale: 1.02, y: -2 }}
                 whileTap={{ scale: 0.98 }}
               >
                 🚀 Connect Wallet
               </motion.button>
             </motion.div>
           )}
           
           <motion.button
             onClick={() => setShowConnectWallet(false)}
             className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
             whileHover={{ scale: 1.02 }}
           >
             ⏰ Maybe later
           </motion.button>
         </div>
       </motion.div>
     </motion.div>
   </AnimatePresence>
 );
 
 // Enhanced Topic Selection Modal
 const TopicModal = () => (
   <AnimatePresence>
     <motion.div 
       className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-end sm:items-center justify-center z-50 p-4"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
     >
       <motion.div 
         className="bg-stone-50/90 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto border-2 border-amber-200/60 shadow-2xl scrollbar-thin scrollbar-thumb-amber-300/50 scrollbar-track-amber-100/30"
         initial={{ y: "100%", opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         exit={{ y: "100%", opacity: 0 }}
         transition={{ type: "spring", stiffness: 300, damping: 30 }}
       >
         <div className="sticky top-0 bg-stone-50/95 backdrop-blur-sm border-b border-amber-200/60 p-4 sm:p-6 flex items-center justify-between">
           <motion.h3 
             className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
           >
             🎯 Choose Your Quest
           </motion.h3>
           <motion.button 
             onClick={() => setShowTopicModal(false)}
             className="p-2 rounded-full hover:bg-amber-100/80 transition-colors"
             whileHover={{ scale: 1.1, rotate: 90 }}
             whileTap={{ scale: 0.9 }}
           >
             <X className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
           </motion.button>
         </div>
         
         <div className="p-4 sm:p-6 space-y-4">
           {topics.map((topic, index) => (
             <motion.button
               key={topic.id}
               onClick={() => handleTopicSelect(topic)}
               className="w-full p-4 sm:p-6 bg-stone-50/60 backdrop-blur-sm rounded-2xl border-2 border-stone-200/50 hover:border-amber-300/60 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-orange-50/80 transition-all text-left group relative overflow-hidden shadow-lg"
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 + index * 0.1 }}
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
             >
               <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-orange-400/5 to-red-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative flex items-center space-x-4">
                 <motion.div 
                   className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100/80 to-orange-100/80 group-hover:from-amber-200/80 group-hover:to-orange-200/80 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg"
                   whileHover={{ rotate: 360 }}
                   transition={{ duration: 0.6 }}
                 >
                   {topic.icon}
                 </motion.div>
                 <div className="flex-1">
                   <h4 className="font-black text-stone-800 group-hover:text-amber-800 text-base sm:text-lg mb-1 transition-colors">
                     {topic.title}
                   </h4>
                   <p className="text-stone-600 group-hover:text-stone-700 transition-colors text-sm sm:text-base">
                     {topic.description}
                   </p>
                 </div>
                 <motion.div
                   animate={{ x: [0, 5, 0] }}
                   transition={{ duration: 2, repeat: Infinity }}
                 >
                   <ChevronRight className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors" />
                 </motion.div>
               </div>
             </motion.button>
           ))}
         </div>
       </motion.div>
     </motion.div>
   </AnimatePresence>
 );
 
 // Enhanced Home Content
 const HomeContent = () => (
   <div className="p-0 sm:p-6 pb-32 space-y-6 w-full">
     {/* Enhanced Hero Section */}
     <motion.div 
       initial={{ opacity: 0, y: -20, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       transition={{ duration: 0.8, ease: "easeOut" }}
       className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden shadow-2xl w-[120%] -ml-[10%]"
     >
       {/* Enhanced animated background elements */}
       {[...Array(6)].map((_, i) => (
         <motion.div
           key={i}
           className={`absolute w-16 h-16 rounded-full opacity-20 ${
             i % 3 === 0 ? 'bg-amber-200' : i % 3 === 1 ? 'bg-orange-200' : 'bg-red-200'
           }`}
           style={{
             top: `${10 + (i * 15)}%`,
             left: `${5 + (i * 20)}%`,
           }}
           animate={{ 
             rotate: 360,
             scale: [1, 1.2, 1],
             opacity: [0.1, 0.3, 0.1]
           }}
           transition={{ 
             rotate: { duration: 15 + i * 3, repeat: Infinity, ease: "linear" },
             scale: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
             opacity: { duration: 3 + i, repeat: Infinity, ease: "easeInOut" }
           }}
         />
       ))}
       
       <div className="relative">
         <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, delay: 0.2 }}
           className="flex items-center space-x-3 mb-4"
         >
           <motion.div 
             className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-lg"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             <Sparkles className="w-6 h-6 text-white" />
           </motion.div>
           <div>
             <motion.h1 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="text-2xl sm:text-3xl font-black"
             >
               Quizelo
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.6, delay: 0.4 }}
               className="text-orange-100 font-bold text-xs sm:text-sm"
             >
               {isMiniApp && isInFarcaster ? '🎭 Powered by Farcaster x Celo' : '🌱 Powered by Celo Magic'}
             </motion.p>
           </div>
         </motion.div>
         
         <motion.p 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.5 }}
           className="text-orange-100 mb-4 text-sm sm:text-base leading-relaxed font-medium"
         >
           🎮 Level up your Celo knowledge and earn epic CELO rewards! Join thousands of crypto warriors on the ultimate blockchain adventure! ⚔️💰
         </motion.p>
         
         <AnimatePresence>
           {isConnected ? (
             <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -20, scale: 0.9 }}
               transition={{ duration: 0.5, delay: 0.6 }}
               className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/30 shadow-lg"
             >
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   <motion.div
                     whileHover={{ rotate: 360 }}
                     transition={{ duration: 0.6 }}
                   >
                     <Wallet className="w-4 h-4 text-orange-100" />
                   </motion.div>
                   <div>
                     <p className="text-orange-100 text-xs font-bold">
                       {isMiniApp && isInFarcaster 
                         ? `🎭 Farcaster Player (FID: ${context?.user?.fid || 'N/A'})` 
                         : '🎯 Player Connected'
                       }
                     </p>
                     <p className="font-mono text-white text-xs">{formatAddress(address || '')}</p>
                   </div>
                 </div>
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={switchToCelo}
                   disabled={isSwitchingNetwork}
                   className="flex items-center space-x-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isSwitchingNetwork ? (
                     <LoadingSpinner size={4} color="text-white" />
                   ) : (
                     <>
                       <RefreshCw className="w-3 h-3 text-white" />
                       <span className="text-white text-xs font-medium">
                         {chainId === celo.id ? '✅ Celo' : '🔄 Switch to Celo'}
                       </span>
                     </>
                   )}
                 </motion.button>
               </div>
             </motion.div>
           ) : (
             <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -20, scale: 0.9 }}
               transition={{ duration: 0.5, delay: 0.6 }}
               className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/30 shadow-lg"
             >
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   <motion.div
                     whileHover={{ rotate: 360 }}
                     transition={{ duration: 0.6 }}
                   >
                     <Wallet className="w-4 h-4 text-orange-100" />
                   </motion.div>
                   <div>
                     <p className="text-orange-100 text-xs font-bold">
                       {isMiniApp && isInFarcaster ? '🔌 Wallet Not Connected in Farcaster' : '🔌 Wallet Not Connected'}
                     </p>
                     <p className="text-orange-100 text-xs">
                       {isMiniApp && isInFarcaster ? 'Connect your wallet to play!' : 'Connect to start playing!'}
                     </p>
                   </div>
                 </div>
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => setShowConnectWallet(true)}
                   className="flex items-center space-x-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                 >
                   <span className="text-white text-xs font-medium">🔗 Connect</span>
                 </motion.button>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
     </motion.div>

     {/* Add Farcaster Mini App-specific features */}
     {isMiniApp && isInFarcaster && (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, delay: 0.7 }}
         className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50"
       >
         <div className="flex items-center space-x-3 mb-3">
           <motion.div 
             className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             <span className="text-white text-sm">🎭</span>
           </motion.div>
           <div>
             <h3 className="font-black text-stone-800 text-sm">Farcaster Mini App</h3>
             <p className="text-stone-600 text-xs">Special features for Farcaster users</p>
           </div>
         </div>
         
         <div className="grid grid-cols-2 gap-2">
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => {
               const shareText = `🎮 Just played Quizelo and learned about ${selectedTopic?.title || 'Celo'}! Join me on this epic blockchain learning adventure and earn CELO rewards! 🌱💰\n\nTry it yourself: ${window.location.origin}`;
               const encodedText = encodeURIComponent(shareText);
               const composeUrl = `https://warpcast.com/~/compose?text=${encodedText}`;
               sdk.actions.openUrl(composeUrl);
             }}
             className="p-2 rounded-lg text-xs font-medium bg-blue-100/80 text-blue-600 hover:bg-blue-200/80 transition-all"
           >
             📤 Share Quizelo
           </motion.button>
           
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => sdk.actions.close()}
             className="p-2 rounded-lg text-xs font-medium bg-red-100/80 text-red-600 hover:bg-red-200/80 transition-all"
           >
             ❌ Close App
           </motion.button>
         </div>
       </motion.div>
     )}

     {/* Enhanced Game Stats */}
     {isConnected && (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, delay: 0.8 }}
         className="grid grid-cols-2 gap-3 w-[120%] -ml-[10%]"
       >
         <motion.div 
           className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all group"
           whileHover={{ scale: 1.05, y: -5 }}
         >
           <div className="flex items-center space-x-3 mb-2">
             <motion.div 
               className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-lg flex items-center justify-center group-hover:animate-bounce shadow-lg"
               whileHover={{ rotate: 360, scale: 1.1 }}
               transition={{ duration: 0.6 }}
             >
               <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </motion.div>
             <span className="text-xs font-bold text-stone-600">🏆 Today&apos;s Quests</span>
           </div>
           <p className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
             {quizelo.userInfo?.dailyCount ?? 0}/{quizelo.maxDailyQuizzes ?? 3}
           </p>
           {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
             <div className="mt-2 flex items-center justify-center">
               <LoadingSpinner size={3} color="text-orange-500" />
             </div>
           )}
           {isMiniApp && !quizelo.userInfo && !quizelo.isLoading && (
             <div className="mt-2 flex items-center justify-center">
               <button 
                 onClick={() => quizelo.refetchUserInfo()}
                 className="text-xs text-orange-600 hover:text-orange-700 font-medium"
               >
                 🔄 Retry
               </button>
             </div>
           )}
         </motion.div>
         
         <motion.div 
           className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all group"
           whileHover={{ scale: 1.05, y: -5 }}
         >
           <div className="flex items-center space-x-3 mb-2">
             <motion.div 
               className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 via-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:animate-pulse shadow-lg"
               whileHover={{ rotate: 360, scale: 1.1 }}
               transition={{ duration: 0.6 }}
             >
               <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </motion.div>
             <span className="text-xs font-bold text-stone-600">⏰ Next Quest</span>
           </div>
           <p className="text-lg sm:text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
             {quizelo.userInfo ? (
               quizelo.timeUntilNextQuiz > 0 
                 ? `${Math.floor(quizelo.timeUntilNextQuiz / 60)}:${(quizelo.timeUntilNextQuiz % 60).toString().padStart(2, '0')}`
                 : 'Ready! 🚀'
             ) : (
               isMiniApp && quizelo.isLoading ? (
                 <div className="flex items-center justify-center">
                   <LoadingSpinner size={3} color="text-blue-500" />
                 </div>
               ) : (
                 'Loading...'
               )
             )}
           </p>
           {isMiniApp && !quizelo.userInfo && !quizelo.isLoading && (
             <div className="mt-2 flex items-center justify-center">
               <button 
                 onClick={() => quizelo.refetchUserInfo()}
                 className="text-xs text-blue-600 hover:text-blue-700 font-medium"
               >
                 🔄 Retry
               </button>
             </div>
           )}
         </motion.div>
       </motion.div>
     )}

     {/* Enhanced Contract Status */}
     {quizelo.contractStats && (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, delay: 0.9 }}
         className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all w-[120%] -ml-[10%]"
       >
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center space-x-3">
             <motion.div 
               className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg"
               whileHover={{ rotate: 360, scale: 1.1 }}
               transition={{ duration: 0.6 }}
             >
               <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </motion.div>
             <span className="font-black text-stone-800 text-xs sm:text-sm">⚡ Game Status</span>
           </div>
           {quizelo.contractStats.operational ? (
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ duration: 0.5, delay: 1 }}
               className="flex items-center space-x-2 bg-emerald-100/80 px-2 py-1 rounded-full backdrop-blur-sm"
             >
               <CheckCircle className="w-3 h-3 text-emerald-500" />
               <span className="text-xs font-bold text-emerald-600">🟢 Online</span>
             </motion.div>
           ) : (
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ duration: 0.5, delay: 1 }}
               className="flex items-center space-x-2 bg-red-100/80 px-2 py-1 rounded-full backdrop-blur-sm"
             >
               <AlertCircle className="w-3 h-3 text-red-500" />
               <span className="text-xs font-bold text-red-600">🔴 Limited</span>
             </motion.div>
           )}
         </div>
         <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-lg p-3 border border-emerald-200/60 backdrop-blur-sm">
           <p className="text-stone-600 text-xs mb-1 font-bold">💰 Reward Pool</p>
           <p className="font-black text-stone-800 text-base sm:text-lg">
             {quizelo.formatEther(quizelo.contractStats.balance)} CELO ✨
           </p>
         </div>
       </motion.div>
     )}

     {/* Contract Stats Loading/Error State */}
     {isConnected && !quizelo.contractStats && (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, delay: 0.9 }}
         className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50 w-[120%] -ml-[10%]"
       >
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center space-x-3">
             <motion.div 
               className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg"
               animate={quizelo.isLoading ? { rotate: 360 } : {}}
               transition={{ duration: 2, repeat: quizelo.isLoading ? Infinity : 0 }}
             >
               <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </motion.div>
             <span className="font-black text-stone-800 text-xs sm:text-sm">⚡ Game Status</span>
           </div>
           {quizelo.isLoading ? (
             <div className="flex items-center space-x-2 bg-blue-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <LoadingSpinner size={3} color="text-blue-500" />
               <span className="text-xs font-bold text-blue-600">Loading...</span>
             </div>
           ) : (
             <div className="flex items-center space-x-2 bg-orange-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <AlertCircle className="w-3 h-3 text-orange-500" />
               <span className="text-xs font-bold text-orange-600">Failed</span>
             </div>
           )}
         </div>
         <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 rounded-lg p-3 border border-orange-200/60 backdrop-blur-sm">
           <p className="text-stone-600 text-xs mb-1 font-bold">
             {quizelo.isLoading ? '🔄 Loading contract data...' : '❌ Failed to load contract data'}
           </p>
           {!quizelo.isLoading && (
             <button 
               onClick={() => quizelo.refetchContractStats()}
               className="text-xs text-orange-600 hover:text-orange-700 font-medium"
             >
               🔄 Retry Loading
             </button>
           )}
         </div>
       </motion.div>
     )}

     {/* Enhanced Selected Topic */}
     {selectedTopic && (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, delay: 1 }}
         className="bg-stone-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all w-[120%] -ml-[10%]"
       >
         <div className="flex items-center space-x-4 mb-4">
           <motion.div 
             className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100/80 to-orange-100/80 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             {selectedTopic.icon}
           </motion.div>
           <div className="flex-1">
             <h3 className="font-black text-stone-800 text-base sm:text-lg">🎯 {selectedTopic.title}</h3>
             <p className="text-stone-600 text-sm sm:text-base">{selectedTopic.description}</p>
           </div>
         </div>
         <motion.button
           onClick={() => setShowTopicModal(true)}
           className="text-amber-700 font-bold hover:text-amber-800 transition-colors flex items-center space-x-2 text-sm sm:text-base bg-amber-50/80 px-4 py-2 rounded-full hover:bg-amber-100/80 backdrop-blur-sm"
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
         >
           <span>🔄 Change Quest</span>
           <motion.div
             animate={{ x: [0, 3, 0] }}
             transition={{ duration: 1.5, repeat: Infinity }}
           >
             <ChevronRight className="w-4 h-4" />
           </motion.div>
         </motion.button>
       </motion.div>
     )}

     {/* Enhanced Status Messages */}
     {quizelo.error && (
       <motion.div 
         className="bg-gradient-to-r from-red-100/80 to-orange-100/80 border-2 border-red-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm"
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
       >
         <div className="flex items-center space-x-3">
           <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5, repeat: 2 }}>
             <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
           </motion.div>
           <p className="text-red-700 text-sm sm:text-base font-bold">⚠️ {quizelo.error}</p>
         </div>
       </motion.div>
     )}

     {quizelo.success && (
       <motion.div 
         className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 border-2 border-emerald-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm"
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
       >
         <div className="flex items-center space-x-3">
           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: 2 }}>
             <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
           </motion.div>
           <p className="text-emerald-700 text-sm sm:text-base font-bold">✨ {quizelo.success}</p>
         </div>
       </motion.div>
     )}

     {aiError && (
       <motion.div 
         className="bg-gradient-to-r from-orange-100/80 to-amber-100/80 border-2 border-orange-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm"
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
       >
         <div className="flex items-center space-x-3">
           <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
             <Brain className="w-6 h-6 text-orange-500 flex-shrink-0" />
           </motion.div>
           <p className="text-orange-700 text-sm sm:text-base font-bold">🤖 {aiError}</p>
         </div>
       </motion.div>
     )}
   </div>
 );
 
 // Enhanced Leaderboard Content
 const LeaderboardContent = () => (
   <div className="p-0 sm:p-6 pb-32 space-y-6 w-full">
     <div className="flex items-center justify-between">
       <motion.h2 
         className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent"
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
       >
         🏆 Hall of Fame
       </motion.h2>
       <motion.button
         onClick={() => window.location.reload()}
         className="p-3 rounded-xl hover:bg-amber-100/80 transition-colors bg-stone-50/80 backdrop-blur-sm border border-stone-200/50 shadow-lg"
         whileHover={{ scale: 1.1, rotate: 180 }}
         whileTap={{ scale: 0.9 }}
       >
         <RefreshCw className="w-6 h-6 text-stone-600" />
       </motion.button>
     </div>

     {/* Loading State */}
     {leaderboardLoading && (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-stone-200/50 text-center shadow-xl"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
           <LoadingSpinner size={8} color="text-white" />
         </div>
         <h3 className="text-xl sm:text-2xl font-black text-stone-800 mb-4">Loading Leaderboard</h3>
         <p className="text-stone-600">Fetching the latest player data...</p>
       </motion.div>
     )}

     {/* Error State */}
     {!leaderboardLoading && leaderboardError && (
       <motion.div 
         className="bg-gradient-to-r from-red-100/80 to-orange-100/80 border border-red-200/60 rounded-2xl p-6 shadow-lg backdrop-blur-sm"
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
       >
         <div className="flex items-center space-x-3">
           <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
           <p className="text-red-700 font-bold">Failed to load leaderboard data</p>
         </div>
       </motion.div>
     )}

     {/* Connected Player Stats */}
     {isConnected && address && (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-xl w-[120%] -ml-[10%]"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
       >
         <div className="flex items-center space-x-3 mb-4">
           <motion.div 
             className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </motion.div>
           <div>
             <h3 className="font-black text-stone-800 text-base sm:text-lg">Your Stats</h3>
             <p className="text-stone-600 text-sm">{formatAddress(address || '')}</p>
           </div>
         </div>
         
         {(() => {
           const playerStats = getPlayerStats(address);
           const playerRank = getPlayerRank(address);
           
           if (playerStats) {
             return (
               <div className="grid grid-cols-2 gap-4">
                 {[
                   { icon: Trophy, label: "Rank", value: `#${playerRank}`, color: "from-amber-50/80 to-orange-50/80 border-amber-200/60" },
                   { icon: Coins, label: "Earnings", value: formatEarnings(playerStats.totalEarnings), color: "from-emerald-50/80 to-teal-50/80 border-emerald-200/60" },
                   { icon: Target, label: "Quizzes", value: playerStats.totalQuizzes, color: "from-blue-50/80 to-purple-50/80 border-blue-200/60" },
                   { icon: TrendingUp, label: "Win Rate", value: formatWinRate(playerStats.winRate), color: "from-pink-50/80 to-red-50/80 border-pink-200/60" }
                 ].map((stat, index) => (
                   <motion.div 
                     key={stat.label}
                     className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 border backdrop-blur-sm shadow-md`}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.3 + index * 0.1 }}
                     whileHover={{ scale: 1.05, y: -2 }}
                   >
                     <div className="flex items-center space-x-2 mb-2">
                       <stat.icon className="w-4 h-4 text-amber-600" />
                       <span className="text-sm font-bold text-stone-600">{stat.label}</span>
                     </div>
                     <p className="text-2xl font-black text-stone-800">{stat.value}</p>
                   </motion.div>
                 ))}
               </div>
             );
           } else {
             return (
               <motion.div 
                 className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-xl p-4 border border-amber-200/60 text-center shadow-md backdrop-blur-sm"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.3 }}
               >
                 <p className="text-stone-800 font-bold">No stats yet</p>
                 <p className="text-stone-600 text-sm">Complete your first quiz to appear on the leaderboard!</p>
               </motion.div>
             );
           }
         })()}
       </motion.div>
     )}

     {/* Global Stats */}
     {stats && (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-xl w-[120%] -ml-[10%]"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.4 }}
       >
         <div className="flex items-center space-x-3 mb-4">
           <motion.div 
             className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </motion.div>
           <h3 className="font-black text-stone-800 text-base sm:text-lg">Global Stats</h3>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
           {[
             { icon: Users, label: "Players", value: stats.totalPlayers, color: "from-blue-50/80 to-purple-50/80 border-blue-200/60" },
             { icon: Target, label: "Quizzes", value: stats.totalQuizzes, color: "from-green-50/80 to-emerald-50/80 border-green-200/60" },
             { icon: Coins, label: "Rewards", value: formatEarnings(stats.totalRewards), color: "from-amber-50/80 to-orange-50/80 border-amber-200/60" },
             { icon: TrendingUp, label: "Avg Win Rate", value: formatWinRate(stats.avgWinRate), color: "from-pink-50/80 to-red-50/80 border-pink-200/60" }
           ].map((stat, index) => (
             <motion.div 
               key={stat.label}
               className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 border backdrop-blur-sm shadow-md`}
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.5 + index * 0.1 }}
               whileHover={{ scale: 1.05, y: -2 }}
             >
               <div className="flex items-center space-x-2 mb-2">
                 <stat.icon className="w-4 h-4 text-amber-600" />
                 <span className="text-sm font-bold text-stone-600">{stat.label}</span>
               </div>
               <p className="text-2xl font-black text-stone-800">{stat.value}</p>
             </motion.div>
           ))}
         </div>
       </motion.div>
     )}

     {/* Top Earners and Best Win Rates sections would continue in similar enhanced style... */}
     {/* For brevity, I'll include just the structure for these sections */}
     
     {/* Top Earners */}
     {leaderboard.length > 0 && (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-xl w-[120%] -ml-[10%]"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.6 }}
       >
         <div className="flex items-center space-x-3 mb-4">
           <motion.div 
             className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg"
             whileHover={{ rotate: 360, scale: 1.1 }}
             transition={{ duration: 0.6 }}
           >
             <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </motion.div>
           <h3 className="font-black text-stone-800 text-base sm:text-lg">Top Earners</h3>
         </div>
         
         <div className="space-y-3">
           {getTopByEarnings(5).map((player, index) => (
             <motion.div 
               key={player.address}
               className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/60 shadow-md hover:shadow-lg transition-all backdrop-blur-sm"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.7 + index * 0.1 }}
               whileHover={{ scale: 1.02, x: 5 }}
             >
               <div className="flex items-center space-x-4">
                 <motion.div 
                   className="w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center"
                   whileHover={{ rotate: 360 }}
                   transition={{ duration: 0.6 }}
                 >
                   <span className="text-white font-bold text-sm">{index + 1}</span>
                 </motion.div>
                 <div>
                   <p className="font-black text-stone-800">{formatLeaderboardAddress(player.address)}</p>
                   <p className="text-stone-600 text-sm">{player.totalQuizzes} quizzes</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="font-black text-stone-800">{formatEarnings(player.totalEarnings)}</p>
                 <p className="text-stone-600 text-sm">{formatWinRate(player.winRate)} win rate</p>
               </div>
             </motion.div>
           ))}
         </div>
       </motion.div>
     )}

     {/* Empty State */}
     {!leaderboardLoading && leaderboard.length === 0 && stats && (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-stone-200/50 text-center shadow-xl"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <motion.div 
           className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
           animate={{ rotate: [0, 10, -10, 0] }}
           transition={{ duration: 2, repeat: Infinity }}
         >
           <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
         </motion.div>
         <h3 className="text-xl sm:text-2xl font-black text-stone-800 mb-4">No Players Yet</h3>
         <p className="text-stone-600">Be the first to complete a quiz and claim the top spot!</p>
       </motion.div>
     )}
   </div>
 );
 
 // Enhanced Profile Content
 const ProfileContent = () => (
   <div className="p-0 sm:p-6 pb-32 space-y-6 w-full">
     <div className="flex items-center justify-between">
       <motion.h2 
         className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent"
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
       >
         👤 Player Profile
       </motion.h2>
       <div className="relative">
         <motion.button
           onClick={() => setShowProfileDropdown(!showProfileDropdown)}
           className="p-3 rounded-xl hover:bg-amber-100/80 transition-colors shadow-lg bg-stone-50/80 backdrop-blur-sm border border-stone-200/50"
           whileHover={{ scale: 1.1, rotate: 90 }}
           whileTap={{ scale: 0.9 }}
         >
           <Settings className="w-6 h-6 text-stone-600" />
         </motion.button>
         
         <AnimatePresence>
           {showProfileDropdown && (
             <motion.div 
               className="absolute right-0 top-full mt-2 w-48 bg-stone-50/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-amber-200/60 py-2 z-10"
               initial={{ opacity: 0, scale: 0.9, y: -10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               <motion.button 
                 className="flex items-center w-full px-4 py-3 text-sm text-stone-700 hover:bg-amber-50/80 transition-colors"
                 whileHover={{ x: 5 }}
               >
                 <Settings className="w-4 h-4 mr-3" />
                 ⚙️ Settings
               </motion.button>
               <motion.button 
                 className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50/80 transition-colors"
                 whileHover={{ x: 5 }}
               >
                 <LogOut className="w-4 h-4 mr-3" />
                 🔌 Disconnect
               </motion.button>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
     </div>
 
     {isConnected ? (
       <div className="space-y-6">
         <motion.div 
           className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all w-[120%] -ml-[10%]"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
         >
           <div className="text-center">
             <motion.div 
               className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
               animate={{ 
                 rotate: [0, 360],
                 scale: [1, 1.1, 1]
               }}
               transition={{ 
                 rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                 scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
               }}
             >
               <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
             </motion.div>
             <h3 className="font-black text-stone-800 text-xl sm:text-2xl mb-4">🎮 Connected Player</h3>
             <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-4 border border-amber-200/60 shadow-lg backdrop-blur-sm">
               <p className="text-stone-600 text-sm font-bold mb-1">🔗 Wallet Address</p>
               <p className="font-mono text-stone-800 font-bold text-sm sm:text-base">{formatAddress(address || '')}</p>
             </div>
           </div>
         </motion.div>

         {quizelo.userInfo && (
           <motion.div 
             className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all w-[120%] -ml-[10%]"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
           >
             <h4 className="font-black text-stone-800 text-base sm:text-lg mb-4 flex items-center space-x-2">
               <Trophy className="w-5 h-5 text-amber-600" />
               <span>📊 Player Stats</span>
             </h4>
             <div className="space-y-4">
               {[
                 { 
                   label: "🎯 Today's quests", 
                   value: `${quizelo.userInfo?.dailyCount ?? 0}/${quizelo.maxDailyQuizzes ?? 3}`,
                   color: "from-blue-50/80 to-purple-50/80 border-blue-200/60"
                 },
                 { 
                   label: "🏆 Won today", 
                   value: quizelo.userInfo?.wonToday ? '✨ Yes!' : '⏳ Not yet',
                   color: quizelo.userInfo?.wonToday ? "from-emerald-50/80 to-teal-50/80 border-emerald-200/60" : "from-stone-50/80 to-gray-50/80 border-stone-200/60"
                 },
                 { 
                   label: "⚡ Ready to play", 
                   value: quizelo.userInfo?.canQuiz ? '🟢 Ready!' : '🔴 Wait',
                   color: quizelo.userInfo?.canQuiz ? "from-emerald-50/80 to-teal-50/80 border-emerald-200/60" : "from-red-50/80 to-orange-50/80 border-red-200/60"
                 }
               ].map((stat, index) => (
                 <motion.div 
                   key={stat.label}
                   className={`flex justify-between items-center p-4 bg-gradient-to-r ${stat.color} rounded-xl border backdrop-blur-sm shadow-lg`}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.4 + index * 0.1 }}
                   whileHover={{ scale: 1.02, x: 5 }}
                 >
                   <span className="text-stone-600 font-bold text-sm sm:text-base">{stat.label}</span>
                   <span className={`font-black text-sm sm:text-base ${
                     stat.label.includes('Won today') 
                       ? (quizelo.userInfo?.wonToday ? 'text-emerald-700' : 'text-stone-500')
                       : stat.label.includes('Ready to play')
                       ? (quizelo.userInfo?.canQuiz ? 'text-emerald-700' : 'text-red-600')
                       : 'text-stone-800'
                   }`}>
                     {stat.value}
                   </span>
                 </motion.div>
               ))}
               
               {/* Farcaster-specific stats */}
               {isMiniApp && isInFarcaster && context?.user?.fid && (
                 <motion.div 
                   className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/60 shadow-lg backdrop-blur-sm"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.7 }}
                   whileHover={{ scale: 1.02, x: 5 }}
                 >
                   <span className="text-stone-600 font-bold text-sm sm:text-base">🎭 Farcaster FID</span>
                   <span className="font-black text-stone-800 text-sm sm:text-base">
                     #{context.user.fid}
                   </span>
                 </motion.div>
               )}
               
               {/* Loading indicator for mini app */}
               {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                 <motion.div 
                   className="flex items-center justify-center p-4 bg-gradient-to-r from-stone-50/80 to-gray-50/80 rounded-xl border border-stone-200/60 backdrop-blur-sm"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.8 }}
                 >
                   <div className="flex items-center space-x-3">
                     <LoadingSpinner size={5} color="text-stone-500" />
                     <span className="text-stone-600 font-bold text-sm">Loading player data...</span>
                   </div>
                 </motion.div>
               )}
             </div>
           </motion.div>
         )}
       </div>
     ) : (
       <motion.div 
         className="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border border-stone-200/50 text-center hover:shadow-2xl transition-all"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
       >
         <motion.div 
           className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-stone-400 to-stone-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
           animate={{ rotate: [0, -10, 10, 0] }}
           transition={{ duration: 2, repeat: Infinity }}
         >
           <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
         </motion.div>
         <h3 className="font-black text-stone-800 text-xl sm:text-2xl mb-4">🔌 No Player Connected</h3>
         <p className="text-stone-600 mb-8 text-sm sm:text-base">Connect your wallet to join the adventure and start earning epic rewards! 🎮</p>
         <motion.button
           onClick={() => {
             connect({ connector: injected() });
             setShowConnectWallet(false);
           }}
           className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-4"
           whileHover={{ scale: 1.02, y: -2 }}
           whileTap={{ scale: 0.98 }}
         >
           🚀 Connect Wallet
         </motion.button>
       </motion.div>
     )}
   </div>
 );
 
 // SDK initialization with Mini App detection
 useEffect(() => {
   const load = async () => {
     try {
       // Check if running in Mini App by checking the context
       const frameContext = await sdk.context;
       setContext(frameContext);
       
       const miniAppStatus = frameContext?.client?.clientFid !== undefined;
       setIsMiniApp(miniAppStatus);
       
       if (miniAppStatus) {
         // Call ready to dismiss Farcaster's loading screen
         await sdk.actions.ready();
       }
       
       setIsSDKLoaded(true);
     } catch (error) {
       console.error('Error loading SDK:', error);
       // Still set as loaded to avoid infinite loading
       setIsSDKLoaded(true);
     }
   };
   
   load();
 }, []);

 // Auto-connect logic for Farcaster Mini App users
 useEffect(() => {
   if (isSDKLoaded && isMiniApp && isInFarcaster && !isConnected) {
     // Try to connect with Farcaster frame connector first
     const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
     if (farcasterConnector) {
       connect({ connector: farcasterConnector });
     } else {
       // Fallback to injected wallet
       connect({ connector: injected() });
     }
   }
 }, [isSDKLoaded, isMiniApp, isInFarcaster, isConnected, connect, connectors]);

 // Handle wallet connection state
 useEffect(() => {
   if (isMiniApp && isInFarcaster) {
     // In Farcaster Mini App, we don't show connect modal initially
     setShowConnectWallet(false);
   } else if (!isConnected) {
     // Outside Farcaster or regular web, show connect modal if not connected
     setShowConnectWallet(true);
   } else {
     setShowConnectWallet(false);
   }
 }, [isConnected, isMiniApp, isInFarcaster]);

 // Network checking
 useEffect(() => {
   if (isConnected && chainId !== celo.id) {
     setShowNetworkModal(true);
     switchToCelo();
   } else if (isConnected && chainId === celo.id) {
     setShowNetworkModal(false);
   }
 }, [isConnected, chainId, switchToCelo]);

 // Initialize app when SDK is loaded
 useEffect(() => {
   const initializeApp = async () => {
     try {
       console.log('Initializing app...', { isSDKLoaded, isMiniApp, isInFarcaster, isConnected });
       
       // Load initial data with better error handling
       const promises = [];
       
       // Only load quiz data if connected
       if (isConnected) {
         promises.push(
           quizelo.refetchUserInfo().catch(err => {
             console.error('Failed to fetch user info:', err);
             return null;
           })
         );
         
         promises.push(
           quizelo.refetchContractStats().catch(err => {
             console.error('Failed to fetch contract stats:', err);
             return null;
           })
         );
         
         promises.push(
           quizelo.refetchActiveQuizTakers().catch(err => {
             console.error('Failed to fetch active quiz takers:', err);
             return null;
           })
         );
       }
       
       // Always load leaderboard data (this works in Farcaster)
       promises.push(
         Promise.resolve().then(() => {
           console.log('Leaderboard data should be loaded by useLeaderboard hook');
           return null;
         })
       );
       
       await Promise.all(promises);
       console.log('App initialization complete');
     } catch (error) {
       console.error('Error initializing app:', error);
     }
   };

   if (isSDKLoaded) {
     initializeApp();
   }
 }, [isSDKLoaded, isConnected, quizelo, isMiniApp, isInFarcaster]);
 
 // Enhanced loading screen for SDK
 if (!isSDKLoaded) {
   return (
     <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       transition={{ duration: 0.8 }}
       className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 flex items-center justify-center"
     >
       <motion.div 
         initial={{ scale: 0.8, y: 20 }}
         animate={{ scale: 1, y: 0 }}
         transition={{ 
           type: "spring", 
           stiffness: 100, 
           damping: 15,
           delay: 0.2 
         }}
         className="text-center"
       >
         <motion.div
           animate={{ 
             rotate: 360,
             scale: [1, 1.1, 1]
           }}
           transition={{ 
             rotate: { duration: 2, repeat: Infinity, ease: "linear" },
             scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
           }}
         >
           <LoadingSpinner size={12} color="text-amber-600" />
         </motion.div>
         <motion.p 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.5 }}
           className="mt-4 text-amber-700 font-black text-lg"
         >
           Loading Quizelo...
         </motion.p>
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.6, delay: 0.8 }}
           className="mt-2 text-amber-600 text-sm"
         >
           🎮 Preparing your blockchain adventure! ⚔️
         </motion.div>
       </motion.div>
     </motion.div>
   );
 }
 
 return (
   <motion.div 
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.8 }}
     className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100"
     style={{
       paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
       paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
       paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
       paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
     }}
   >
     {/* Main Content */}
     <motion.div 
       initial={{ y: 20, opacity: 0 }}
       animate={{ y: 0, opacity: 1 }}
       transition={{ duration: 0.6, delay: 0.2 }}
       className="min-h-screen w-full px-2 sm:px-6 lg:px-8 pb-32 sm:pb-40"
     >
       {showResults ? (
         <ResultsPage />
       ) : isInQuiz ? (
         <QuizInterface />
       ) : (
         <motion.div 
           initial={{ y: 30, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ duration: 0.6, delay: 0.3 }}
           className="py-6 sm:py-8"
         >
           {activeTab === 'home' && <HomeContent />}
           {activeTab === 'leaderboard' && <LeaderboardContent />}
           {activeTab === 'profile' && <ProfileContent />}
         </motion.div>
       )}
     </motion.div>

     {/* Enhanced Start Quiz FAB */}
     {!isInQuiz && !showResults && (
       <motion.button
         initial={{ scale: 0, rotate: -180 }}
         animate={{ scale: 1, rotate: 0 }}
         transition={{ 
           type: "spring", 
           stiffness: 260, 
           damping: 20,
           delay: 0.5 
         }}
         whileHover={{ 
           scale: 1.1, 
           rotate: 5,
           boxShadow: "0 20px 40px rgba(245, 158, 11, 0.4)"
         }}
         whileTap={{ scale: 0.9, rotate: -5 }}
         onClick={() => setShowTopicModal(true)}
         disabled={quizelo.isLoading || aiLoading || (quizelo.userInfo ? !quizelo.userInfo.canQuiz : false)}
         className="fixed bottom-32 sm:bottom-36 right-4 sm:right-6 w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center hover:shadow-amber-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 border-4 border-white/80"
         title={quizelo.userInfo && !quizelo.userInfo.canQuiz ? "You've reached your daily quiz limit" : "Start a new quiz"}
       >
         {quizelo.isLoading || aiLoading ? (
           <motion.div
             animate={{ rotate: 360 }}
             transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
           >
             <LoadingSpinner size={7} color="text-white" />
           </motion.div>
         ) : (
           <motion.div
             whileHover={{ scale: 1.2 }}
             transition={{ duration: 0.2 }}
           >
             <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1" />
           </motion.div>
         )}
       </motion.button>
     )}

     {/* Enhanced Bottom Navigation */}
     {!isInQuiz && !showResults && (
       <motion.div 
         initial={{ y: 100, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ 
           type: "spring", 
           stiffness: 100, 
           damping: 20,
           delay: 0.7 
         }}
         className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur-lg border-t-2 border-amber-200/60 px-4 sm:px-6 py-4 z-20 shadow-2xl"
       >
         <div className="flex justify-around max-w-md mx-auto">
           {[
             { tab: 'home', icon: Home, label: '🏠 Home' },
             { tab: 'leaderboard', icon: Trophy, label: '🏆 Ranks' },
             { tab: 'profile', icon: User, label: '👤 Profile' }
           ].map((item) => (
             <motion.button
               key={item.tab}
               whileHover={{ scale: 1.1, y: -2 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setActiveTab(item.tab)}
               className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-2xl transition-all ${
                 activeTab === item.tab 
                   ? 'bg-gradient-to-r from-amber-100/80 via-orange-100/80 to-red-100/80 text-amber-700 shadow-lg backdrop-blur-sm' 
                   : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100/80'
               }`}
             >
               <motion.div
                 animate={activeTab === item.tab ? { rotate: [0, -10, 10, 0] } : {}}
                 transition={{ duration: 0.5 }}
               >
                 <item.icon className="w-6 h-6" />
               </motion.div>
               <span className="text-xs font-bold">{item.label}</span>
             </motion.button>
           ))}
         </div>
       </motion.div>
     )}

     {/* Modals */}
     {showConnectWallet && <ConnectWalletModal />}
     {showTopicModal && <TopicModal />}
     <QuizGenerationModal 
       isVisible={showQuizGeneration} 
       topic={selectedTopic} 
     />
     <TransactionModal 
       isVisible={showTransactionModal}
       status={transactionStatus}
       txHash={currentTxHash}
       onClose={() => setShowTransactionModal(false)}
     />
     {showNetworkModal && <NetworkCheckModal 
       showNetworkModal={showNetworkModal}
       isSwitchingNetwork={isSwitchingNetwork} 
       networkError={networkError} 
       switchToCelo={switchToCelo}
       setShowNetworkModal={setShowNetworkModal}
     />}
     {showQuizInfo && <QuizInfoModal 
       isVisible={showQuizInfo}
       onClose={() => setShowQuizInfo(false)}
       onStart={handleStartQuiz}
       quizFee={quizelo.quizFee && typeof quizelo.quizFee === 'bigint' ? quizelo.formatEther(quizelo.quizFee) : '0.1'}
       potentialWinnings={quizelo.quizFee && typeof quizelo.quizFee === 'bigint' ? quizelo.formatEther(quizelo.quizFee * 5n) : '0.5'}
       isLoading={quizelo.isLoading}
     />}
   </motion.div>
 );
};

export default QuizeloApp;