import { useState, useEffect, useCallback } from 'react';
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

interface QuizInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStart: () => void;
  quizFee: string;
  potentialWinnings: string;
  isLoading: boolean;
  selectedTopic: TopicWithMetadata | null;
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

// Simple Loading Spinner without excessive animations
const LoadingSpinner = ({ size = 6, color = 'text-amber-600' }) => (
  <div className="relative">
    <Loader2 className={`w-${size} h-${size} ${color} animate-spin`} />
  </div>
);

// Simplified Timer Component
const HorizontalTimer = ({ timeLeft, totalTime = 15 }: { timeLeft: number, totalTime?: number }) => {
  const progress = (timeLeft / totalTime) * 100;
  
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'from-red-400 to-orange-500';
    if (timeLeft <= 7) return 'from-orange-400 to-amber-500';
    return 'from-emerald-400 to-teal-500';
  };

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-stone-600" />
          <span className="text-sm font-bold text-stone-600">⏰ Time Left</span>
        </div>
        <span className={`font-black text-xl ${timeLeft <= 5 ? 'text-red-500' : 'text-stone-800'}`}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="relative w-full bg-stone-200/80 rounded-full h-4 overflow-hidden shadow-inner backdrop-blur-sm">
        <div 
          className={`h-full bg-gradient-to-r ${getTimerColor()} rounded-full shadow-lg transition-all duration-1000 ease-out`}
          style={{ width: `${progress}%` }}
        >
          {timeLeft <= 5 && (
            <div className="absolute inset-0 bg-red-400/50 animate-pulse" />
          )}
        </div>
      </div>
      
      {timeLeft <= 5 && (
        <div className="text-center mt-3">
          <span className="text-red-500 font-bold text-sm flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>⚡ Time running out!</span>
            <Sparkles className="w-4 h-4" />
          </span>
        </div>
      )}
    </div>
  );
};

// Simplified Question Result Component
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
          <div className="relative text-center">
            <div 
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-2xl ${
                result.isCorrect 
                  ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500' 
                  : 'bg-gradient-to-br from-orange-400 via-amber-500 to-red-500'
              }`}
            >
              {result.isCorrect ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <X className="w-10 h-10 text-white" />
              )}
            </div>
            
            <h3 className={`text-2xl font-black mb-4 ${
              result.isCorrect ? 'text-emerald-700' : 'text-orange-700'
            }`}>
              {result.isCorrect ? '🎉 Excellent!' : '🎯 Close One!'}
            </h3>
            
            <div className={`p-4 rounded-2xl mb-6 border-2 backdrop-blur-sm ${
              result.isCorrect 
                ? 'bg-emerald-50/80 border-emerald-200/60' 
                : 'bg-orange-50/80 border-orange-200/60'
            }`}>
              {!result.isCorrect && (
                <p className="text-sm text-stone-600 mb-2">
                  <span className="font-bold">❌ Your answer:</span> {userAnswer}
                </p>
              )}
              <p className="text-sm text-stone-600 mb-3">
                <span className="font-bold">✅ Correct answer:</span> {correctAnswer}
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                💡 {result.explanation}
              </p>
            </div>
            
            <button
              onClick={onContinue}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl ${
                result.isCorrect
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:shadow-emerald-300/50'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:shadow-orange-300/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isLastQuestion ? (
                  <>
                    <Trophy className="w-5 h-5" />
                    <span>🏆 View Results</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-5 h-5" />
                    <span>⚡ Continue Quest</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Simplified Quiz Info Modal
const QuizInfoModal = ({ 
  isVisible, 
  onClose, 
  onStart, 
  quizFee, 
  potentialWinnings,
  isLoading,
  selectedTopic
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
          <div className="relative text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
              <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3">
              🎮 Ready to Quest?
            </h3>
            
            {/* Selected Topic Display */}
            {selectedTopic && (
              <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-4 mb-4 border border-amber-200/60 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl bg-gradient-to-br from-amber-100 to-orange-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                    {selectedTopic.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-600">🎯 Selected Topic</p>
                    <p className="font-black text-stone-800 text-sm">{selectedTopic.title}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-orange-50/80 to-red-50/80 rounded-xl p-4 mb-4 border border-orange-200/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-600">💰 Entry Fee</span>
                <span className="text-sm font-black text-orange-700">{quizFee} CELO</span>
              </div>
              <p className="text-xs text-stone-500">This amount will be deducted from your wallet</p>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl p-4 mb-6 border border-emerald-200/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-600">🏆 Potential Winnings</span>
                <span className="text-sm font-black text-emerald-700">{potentialWinnings} CELO</span>
              </div>
              <p className="text-xs text-stone-500">Win by scoring 60% or higher!</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={onStart}
                disabled={isLoading || !selectedTopic}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <LoadingSpinner size={6} color="text-white" />
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>🚀 Start Quest</span>
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
              >
                ⏰ Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Simplified Quiz Generation Modal
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
          <div className="relative text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3">
              🤖 AI Magic in Progress
            </h3>
            
            <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/80 to-red-50/80 rounded-xl p-4 mb-4 border border-amber-200/60 backdrop-blur-sm">
              <p className="text-stone-700 font-bold text-sm sm:text-base mb-2">
                ✨ Did you know?
              </p>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Each player gets <span className="font-bold text-amber-700">unique questions</span> generated by AI! 
                No two quests are ever the same! 🎯
              </p>
            </div>
            
            <p className="text-stone-600 mb-2 text-sm sm:text-base">
              🎮 Crafting your personalized quest about
            </p>
            
            <p className="font-black text-stone-800 mb-4 sm:mb-6 text-sm sm:text-base">
              {topic?.title} ⚡
            </p>
            
            <div className="flex justify-center space-x-3 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full animate-bounce ${
                    i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-orange-400' : 'bg-red-400'
                  }`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            
            <p className="text-xs sm:text-sm text-stone-500 animate-pulse">
              🚀 AI is brewing your unique challenge...
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Simplified Transaction Modal
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
          <div className="relative text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
              {status === 'pending' ? (
                <LoadingSpinner size={8} color="text-white" />
              ) : status === 'success' ? (
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              ) : (
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              )}
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black text-stone-800 mb-3">
              {status === 'pending' ? '⚡ Processing Magic' : 
               status === 'success' ? '🎉 Success!' : 
               '❌ Oops!'}
            </h3>
            
            {status === 'pending' && (
              <p className="text-stone-600 mb-4 sm:mb-6 text-sm sm:text-base animate-pulse">
                🌟 Your transaction is being processed on the blockchain...
              </p>
            )}

            {status === 'success' && (
              <p className="text-stone-600 mb-4 sm:mb-6 text-sm sm:text-base">
                🚀 Your quiz quest has begun! Ready to earn some CELO? 
              </p>
            )}

            {txHash && (
              <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-xl p-3 mb-4 sm:mb-6 border border-teal-200/60 backdrop-blur-sm">
                <p className="text-xs text-stone-500 mb-1">🔗 Transaction Hash</p>
                <p className="font-mono text-xs text-stone-700 break-all">{txHash}</p>
              </div>
            )}

            {status !== 'pending' && (
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
              >
                <CheckCircle className="w-6 h-6" />
                <span>✨ Continue to Quiz</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Simplified Network Check Modal
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
          <div className="relative text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
              {isSwitchingNetwork ? (
                <LoadingSpinner size={8} color="text-white" />
              ) : (
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              )}
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-700 via-red-700 to-pink-700 bg-clip-text text-transparent mb-3">
              {isSwitchingNetwork ? '⚡ Switching Networks' : '🔄 Wrong Network'}
            </h3>
            
            <p className="text-stone-600 text-sm sm:text-base mb-6">
              {isSwitchingNetwork 
                ? '🌟 Switching to Celo network...' 
                : '🎮 Quizelo runs on the Celo network! Please switch to continue your adventure.'
              }
            </p>
            
            <div className="bg-gradient-to-r from-orange-50/80 to-red-50/80 rounded-xl p-4 mb-6 border border-orange-200/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-500 font-bold">Current Network</span>
                <span className="text-xs text-red-600 font-black">❌ Wrong</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-bold">Required Network</span>
                <span className="text-xs text-emerald-600 font-black">✅ Celo</span>
              </div>
            </div>
            
            {networkError && (
              <div className="bg-gradient-to-r from-red-100/80 to-pink-100/80 border border-red-200/60 rounded-xl p-3 mb-4 backdrop-blur-sm">
                <p className="text-red-700 text-xs font-bold">⚠️ {networkError}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={switchToCelo}
                disabled={isSwitchingNetwork}
                className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
              >
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
              </button>
              
              {!isSwitchingNetwork && (
                <button
                  onClick={() => setShowNetworkModal(false)}
                  className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
                >
                  ⏰ Maybe later
                </button>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200/60 backdrop-blur-sm">
              <p className="text-xs text-blue-700 font-bold">
                💡 Tip: You can also manually switch networks in your wallet settings
              </p>
            </div>
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

  const handleAnswer = useCallback((answerIndex: number) => {
    if (isAnswered || isTimeUp) return; // Prevent multiple answers
    
    setIsAnswered(true);
    
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
  }, [isAnswered, isTimeUp, userAnswers, currentQuestionIndex, questions, markAnswer]);

  // Timer effect for quiz questions - improved reactivity
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (isInQuiz && !showResults && !showQuestionResult && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (!isAnswered && !isTimeUp) {
              handleAnswer(-1);
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
  }, [currentQuestionIndex, isInQuiz, showResults]);

  // Check wallet connection on mount and handle disconnection
  useEffect(() => {
    if (isMiniApp && !isConnected) {
      setShowConnectWallet(false);
      connect({ connector: farcasterFrame() });
    } else if (address && !quizelo.isConnected) {
      // Wallet is connected but quizelo hook hasn't detected it yet
    } else if (!address && !quizelo.isConnected && !isMiniApp) {
      // No wallet connected and not in mini app, show connect modal
      setShowConnectWallet(true);
    } else if (address && quizelo.isConnected) {
      // Wallet is connected and quizelo hook has detected it
      setShowConnectWallet(false);
      
      // In Farcaster, manually trigger data loading after connection
      if (isMiniApp && isInFarcaster) {
        setTimeout(() => {
          quizelo.refetchUserInfo();
          quizelo.refetchContractStats();
          quizelo.refetchActiveQuizTakers();
        }, 1000);
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
      console.error(error);
      setNetworkError('Failed to switch to Celo network. Please try manually switching in your wallet.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [switchChain]);

  // Check network on connection
  useEffect(() => {
    if (isConnected && chainId !== celo.id) {
      setShowNetworkModal(true);
      switchToCelo();
    } else if (isConnected && chainId === celo.id) {
      setShowNetworkModal(false);
    }
  }, [isConnected, chainId, switchToCelo]);

  const handleTopicSelect = useCallback(async (topic: TopicWithMetadata) => {
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
  }, [selectTopic, isConnected, chainId, switchToCelo]);

  const startQuizFlow = useCallback(async (topic: TopicWithMetadata | null) => {
    console.log('startQuizFlow called with topic:', topic);
    
    if (!topic) {
      console.error('No topic provided to startQuizFlow, showing topic modal');
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
      console.error(error);
      setTransactionStatus('error');
    }
  }, [chainId, switchToCelo, quizelo, generateQuestions]);

  const handleStartQuiz = useCallback(async () => {
    console.log('handleStartQuiz called, selectedTopic:', selectedTopic);
    
    if (!selectedTopic) {
      console.error('No topic selected, showing topic modal');
      setShowQuizInfo(false);
      setShowTopicModal(true);
      return;
    }
    
    setShowQuizInfo(false);
    await startQuizFlow(selectedTopic);
  }, [selectedTopic, startQuizFlow]);

  const handleContinueToNext = useCallback(() => {
    setShowQuestionResult(false);
    
    setIsAnswered(false);
    setIsTimeUp(false);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate final score and show results
      const score = calculateScore(userAnswers);
      setFinalScore(score);
      setIsInQuiz(false);
      setShowResults(true);
    }
    
    setCurrentQuestionResult(null);
  }, [currentQuestionIndex, questions.length, calculateScore, userAnswers]);

  const handleClaimReward = useCallback(async () => {
    if (!quizSessionId || !finalScore) return;
    
    try {
      await quizelo.claimReward(quizSessionId, finalScore.percentage);
      setShowResults(false);
      setQuizSessionId(null);
      setFinalScore(null);
    } catch (error) {
      console.error(error);
      // Handle error silently or show user-friendly message
    }
  }, [quizSessionId, finalScore, quizelo]);

  const handleRetakeQuiz = useCallback(() => {
    setShowResults(false);
    setQuizSessionId(null);
    setFinalScore(null);
    setShowTopicModal(true);
  }, []);

  // Simplified Results Page
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
      <div className="fixed inset-0 bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 overflow-y-auto">
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-lg mx-auto">
            {/* Celebration Header */}
            <div className="text-center mb-6 sm:mb-8 relative">
              <div className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl`}>
                <span className="text-3xl sm:text-4xl">{getScoreEmoji(finalScore.percentage)}</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-2">
                🎊 Quest Complete!
              </h1>
              
              <p className="text-stone-600 text-sm sm:text-base">
                🎉 Check out your epic results!
              </p>
            </div>

            {/* Score Card */}
            <div className="bg-stone-50/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-stone-200/50 mb-6 relative overflow-hidden">
              <div className="relative text-center">
                <div className={`text-5xl sm:text-7xl font-black mb-3 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} bg-clip-text text-transparent`}>
                  {finalScore.percentage}%
                </div>
                
                <p className="text-xl sm:text-2xl font-black text-stone-800 mb-2">
                  {getScoreMessage(finalScore.percentage)}
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-stone-600">
                  <Target className="w-4 h-4" />
                  <span className="text-sm sm:text-base">
                    🎯 {finalScore.correct} out of {finalScore.total} correct
                  </span>
                </div>
              </div>
            </div>

            {/* Topic Badge */}
            <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-stone-200/50 mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100 to-orange-100 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  {selectedTopic?.icon}
                </div>
                <div>
                  <h3 className="font-black text-stone-800 text-base sm:text-lg">✨ {selectedTopic?.title}</h3>
                  <p className="text-stone-600 text-sm sm:text-base">{selectedTopic?.description}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {finalScore?.percentage >= 60 && (
                <button
                  onClick={handleClaimReward}
                  disabled={quizelo.isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
                >
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
                </button>
              )}
              
              <button
                onClick={handleRetakeQuiz}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-3"
              >
                <RefreshCw className="w-5 h-5" />
                <span>🚀 Take Another Quest</span>
              </button>
              
              <button
                onClick={() => {
                  setShowResults(false);
                  setQuizSessionId(null);
                  setFinalScore(null);
                }}
                className="w-full bg-gradient-to-r from-stone-200 to-stone-300 text-stone-700 py-4 rounded-2xl font-semibold hover:from-stone-300 hover:to-stone-400 transition-all"
              >
                🏠 Back to Home Base
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simplified Quiz Interface (MAIN FIX - REMOVED EXCESSIVE ANIMATIONS)
  const QuizInterface = () => {
    if (!questions[currentQuestionIndex]) return null;

    const question = questions[currentQuestionIndex];

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 overflow-y-auto">
        <div className="min-h-screen p-mobile">
          <div className="max-w-sm mx-auto">
            {/* Game Header - Mobile optimized */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 bg-stone-50/80 backdrop-blur-xl rounded-2xl p-mobile shadow-xl border border-stone-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-stone-800 text-mobile-sm">🎯 {selectedTopic?.title}</h1>
                  <p className="text-mobile-xs text-stone-500">
                    🎮 Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Timer - Mobile optimized */}
            <HorizontalTimer 
              timeLeft={timeLeft} 
              totalTime={15} 
            />

            {/* Progress - Mobile optimized */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-mobile-sm font-bold text-stone-600">🏆 Progress</span>
                <span className="text-mobile-sm font-bold text-stone-600">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-stone-200/80 rounded-full h-3 overflow-hidden shadow-inner backdrop-blur-sm">
                <div 
                  className="bg-gradient-to-r from-emerald-400 via-teal-500 to-green-500 h-full rounded-full shadow-lg transition-all duration-800 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card - Mobile optimized */}
            <div className="bg-stone-50/80 backdrop-blur-xl rounded-3xl p-mobile shadow-2xl border-2 border-stone-200/50 mb-6 relative overflow-hidden">
              <div className="relative">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                    <span className="text-white text-mobile-sm font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <h2 className="text-mobile-base sm:text-xl font-black text-stone-800 leading-relaxed">
                    🤔 {question.question}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={isAnswered}
                      className={`w-full p-4 sm:p-5 text-left rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden shadow-lg btn-mobile ${
                        isAnswered
                          ? index === question.correctAnswer
                            ? 'border-emerald-400 bg-gradient-to-r from-emerald-100/80 to-teal-100/80 shadow-emerald-200/50'
                            : index === userAnswers[currentQuestionIndex]
                            ? 'border-red-400 bg-gradient-to-r from-red-100/80 to-orange-100/80 shadow-red-200/50'
                            : 'border-stone-200 bg-stone-50/50'
                          : 'border-stone-200/60 bg-stone-50/40 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-orange-50/80 hover:shadow-xl'
                      }`}
                    >
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
                        <span className="text-stone-700 group-hover:text-stone-800 font-medium text-mobile-sm flex-1">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
      </div>
    );
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  // Simplified Connect Wallet Modal
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
          <div className="relative text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
              <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3">
              🔗 Connect & Play!
            </h3>
            
            <p className="text-stone-600 text-sm sm:text-base mb-6 sm:mb-8">
              {isMiniApp && isInFarcaster 
                ? '🎮 Connect your wallet to start your learning adventure!' 
                : '🎮 Connect your Celo wallet to start your learning adventure and earn rewards!'
              }
            </p>
            
            {isMiniApp && isInFarcaster ? (
              <div className="space-y-3">
                <button
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
                >
                  🎯 Connect in Farcaster
                </button>
                
                {connectors.length > 1 && (
                  <button
                    onClick={() => {
                      connect({ connector: connectors.find((c) => c.name.includes('Coinbase')) || connectors[1] });
                      setShowConnectWallet(false);
                    }}
                    className="w-full bg-blue-500 text-white py-3 rounded-2xl font-bold hover:shadow-xl transition-all"
                  >
                    🔵 Coinbase Wallet
                  </button>
                )}
                
                {connectors.length > 2 && (
                  <button
                    onClick={() => {
                      connect({ connector: connectors.find((c) => c.name.includes('MetaMask')) || connectors[2] });
                      setShowConnectWallet(false);
                    }}
                    className="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold hover:shadow-xl transition-all"
                  >
                    🦊 MetaMask
                  </button>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {
                    connect({ connector: injected() });
                    setShowConnectWallet(false);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-4"
                >
                  🚀 Connect Wallet
                </button>
              </div>
            )}
            
            <button
              onClick={() => setShowConnectWallet(false)}
              className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
            >
              ⏰ Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
  
  // Simplified Topic Selection Modal
  const TopicModal = () => (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-end sm:items-center justify-center z-[9999] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <motion.div 
          className="bg-stone-50/90 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto border-2 border-amber-200/60 shadow-2xl scrollbar-thin scrollbar-thumb-amber-300/50 scrollbar-track-amber-100/30"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: 'relative',
            zIndex: 10000
          }}
        >
          <div className="sticky top-0 bg-stone-50/95 backdrop-blur-sm border-b border-amber-200/60 p-4 sm:p-6 flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent">
              🎯 Choose Your Quest
            </h3>
            <button 
              onClick={() => setShowTopicModal(false)}
              className="p-2 rounded-full hover:bg-amber-100/80 transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicSelect(topic)}
                className="w-full p-4 sm:p-6 bg-stone-50/60 backdrop-blur-sm rounded-2xl border-2 border-stone-200/50 hover:border-amber-300/60 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-orange-50/80 transition-all text-left group relative overflow-hidden shadow-lg"
              >
                <div className="relative flex items-center space-x-4">
                  <div className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100/80 to-orange-100/80 group-hover:from-amber-200/80 group-hover:to-orange-200/80 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg">
                   {topic.icon}
                 </div>
                 <div className="flex-1">
                   <h4 className="font-black text-stone-800 group-hover:text-amber-800 text-base sm:text-lg mb-1 transition-colors">
                     ✨ {topic.title}
                   </h4>
                   <p className="text-stone-600 group-hover:text-stone-700 transition-colors text-sm sm:text-base">
                     {topic.description}
                   </p>
                 </div>
                 <ChevronRight className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors" />
               </div>
             </button>
           ))}
         </div>
       </motion.div>
     </motion.div>
   </AnimatePresence>
 );
 
 // Simplified Home Content
 const HomeContent = () => (
   <div className="space-y-4 w-full p-3">
     {/* Hero Section */}
     <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl p-4 text-white relative overflow-hidden shadow-2xl border-2 border-white/20">
       <div className="relative">
         <div className="flex items-center space-x-3 mb-4">
           <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-lg">
             <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </div>
           <div>
             <h1 className="text-mobile-xl sm:text-2xl font-black">
               🎮 Quizelo
             </h1>
             <p className="text-orange-100 font-bold text-mobile-xs">
               {isMiniApp && isInFarcaster ? '🎭 Powered by Farcaster x Celo' : '🌱 Powered by Celo Magic'}
             </p>
           </div>
         </div>
         
         <p className="text-orange-100 mb-4 text-mobile-sm leading-relaxed font-medium">
           🎮 Level up your Celo knowledge and earn epic CELO rewards! Join thousands of crypto warriors on the ultimate blockchain adventure! ⚔️💰
         </p>
         
         {isConnected ? (
           <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/30 shadow-lg">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <Wallet className="w-4 h-4 text-orange-100" />
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
               <button
                 onClick={switchToCelo}
                 disabled={isSwitchingNetwork}
                 className="flex items-center space-x-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-mobile"
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
               </button>
             </div>
           </div>
         ) : (
           <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/30 shadow-lg">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <Wallet className="w-4 h-4 text-orange-100" />
                 <div>
                   <p className="text-orange-100 text-xs font-bold">
                     {isMiniApp && isInFarcaster ? '🔌 Wallet Not Connected in Farcaster' : '🔌 Wallet Not Connected'}
                   </p>
                   <p className="text-orange-100 text-xs">
                     {isMiniApp && isInFarcaster ? 'Connect your wallet to play!' : 'Connect to start playing!'}
                   </p>
                 </div>
               </div>
               <button
                 onClick={() => setShowConnectWallet(true)}
                 className="flex items-center space-x-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all btn-mobile"
               >
                 <span className="text-white text-xs font-medium">🔗 Connect</span>
               </button>
             </div>
           </div>
         )}
       </div>
     </div>

     {/* Farcaster Mini App Features */}
     {isMiniApp && isInFarcaster && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50">
         <div className="flex items-center space-x-3 mb-3">
           <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
             <span className="text-white text-sm">🎭</span>
           </div>
           <div>
             <h3 className="font-black text-stone-800 text-mobile-sm">🚀 Farcaster Mini App</h3>
             <p className="text-stone-600 text-mobile-xs">Special features for Farcaster users</p>
           </div>
         </div>
         
         <div className="grid grid-cols-2 gap-2">
           <button
             onClick={() => setShowTopicModal(true)}
             className="p-2 rounded-lg text-mobile-xs font-medium bg-amber-100/80 text-amber-600 hover:bg-amber-200/80 transition-all btn-mobile"
           >
             🎮 Start Quiz
           </button>
           
           <button
             onClick={() => {
               const shareText = `🎮 Just played Quizelo and learned about ${selectedTopic?.title || 'Celo'}! Join me on this epic blockchain learning adventure and earn CELO rewards! 🌱💰\n\nTry it yourself: ${window.location.origin}`;
               const encodedText = encodeURIComponent(shareText);
               const composeUrl = `https://warpcast.com/~/compose?text=${encodedText}`;
               sdk.actions.openUrl(composeUrl);
             }}
             className="p-2 rounded-lg text-mobile-xs font-medium bg-blue-100/80 text-blue-600 hover:bg-blue-200/80 transition-all btn-mobile"
           >
             📤 Share Quizelo
           </button>
           
           <button
             onClick={() => sdk.actions.close()}
             className="p-2 rounded-lg text-mobile-xs font-medium bg-red-100/80 text-red-600 hover:bg-red-200/80 transition-all btn-mobile"
           >
             ❌ Close App
           </button>
         </div>
       </div>
     )}

     {/* Game Stats */}
     {isConnected && (
       <div className="grid grid-cols-2 gap-3">
         <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all group">
           <div className="flex items-center space-x-3 mb-2">
             <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
               <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
             <span className="text-mobile-xs font-bold text-stone-600">🏆 Todayz Quests</span>
           </div>
           <p className="text-mobile-xl sm:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
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
                 className="text-mobile-xs text-orange-600 hover:text-orange-700 font-medium"
               >
                 🔄 Retry
               </button>
             </div>
           )}
         </div>
         
         <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all group">
           <div className="flex items-center space-x-3 mb-2">
             <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 via-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
               <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
             <span className="text-mobile-xs font-bold text-stone-600">⏰ Next Quest</span>
           </div>
           <p className="text-mobile-lg sm:text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
                 className="text-mobile-xs text-blue-600 hover:text-blue-700 font-medium"
               >
                 🔄 Retry
               </button>
             </div>
           )}
         </div>
       </div>
     )}

     {/* Contract Status */}
     {quizelo.contractStats && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all">
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg">
               <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
             <span className="font-black text-stone-800 text-mobile-sm">⚡ Game Status</span>
           </div>
           {quizelo.contractStats.operational ? (
             <div className="flex items-center space-x-2 bg-emerald-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <CheckCircle className="w-3 h-3 text-emerald-500" />
               <span className="text-mobile-xs font-bold text-emerald-600">🟢 Online</span>
             </div>
           ) : (
             <div className="flex items-center space-x-2 bg-red-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <AlertCircle className="w-3 h-3 text-red-500" />
               <span className="text-mobile-xs font-bold text-red-600">🔴 Limited</span>
             </div>
           )}
         </div>
         <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-lg p-3 border border-emerald-200/60 backdrop-blur-sm">
           <p className="text-stone-600 text-mobile-xs mb-1 font-bold">💰 Reward Pool</p>
           <p className="font-black text-stone-800 text-mobile-base sm:text-lg">
             {quizelo.formatEther(quizelo.contractStats.balance)} CELO ✨
           </p>
         </div>
       </div>
     )}

     {/* Contract Stats Loading/Error State */}
     {isConnected && !quizelo.contractStats && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50">
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg">
               <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
             <span className="font-black text-stone-800 text-mobile-sm">⚡ Game Status</span>
           </div>
           {quizelo.isLoading ? (
             <div className="flex items-center space-x-2 bg-blue-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <LoadingSpinner size={3} color="text-blue-500" />
               <span className="text-mobile-xs font-bold text-blue-600">Loading...</span>
             </div>
           ) : (
             <div className="flex items-center space-x-2 bg-orange-100/80 px-2 py-1 rounded-full backdrop-blur-sm">
               <AlertCircle className="w-3 h-3 text-orange-500" />
               <span className="text-mobile-xs font-bold text-orange-600">Failed</span>
             </div>
           )}
         </div>
         <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 rounded-lg p-3 border border-orange-200/60 backdrop-blur-sm">
           <p className="text-stone-600 text-mobile-xs mb-1 font-bold">
             {quizelo.isLoading ? '🔄 Loading contract data...' : '❌ Failed to load contract data'}
           </p>
           {!quizelo.isLoading && (
             <button 
               onClick={() => quizelo.refetchContractStats()}
               className="text-mobile-xs text-orange-600 hover:text-orange-700 font-medium"
             >
               🔄 Retry Loading
             </button>
           )}
         </div>
       </div>
     )}

     {/* Selected Topic */}
     {selectedTopic && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all">
         <div className="flex items-center space-x-4 mb-4">
           <div className="text-3xl sm:text-4xl bg-gradient-to-br from-amber-100/80 to-orange-100/80 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg">
             {selectedTopic.icon}
           </div>
           <div className="flex-1">
             <h3 className="font-black text-stone-800 text-mobile-base sm:text-lg">🎯 {selectedTopic.title}</h3>
             <p className="text-stone-600 text-mobile-sm">{selectedTopic.description}</p>
           </div>
         </div>
         <button
           onClick={() => setShowTopicModal(true)}
           className="text-amber-700 font-bold hover:text-amber-800 transition-colors flex items-center space-x-2 text-mobile-sm bg-amber-50/80 px-4 py-2 rounded-full hover:bg-amber-100/80 backdrop-blur-sm btn-mobile"
         >
           <span>🔄 Change Quest</span>
           <ChevronRight className="w-4 h-4" />
         </button>
       </div>
     )}

     {/* Status Messages */}
     {quizelo.error && (
       <div className="bg-gradient-to-r from-red-100/80 to-orange-100/80 border-2 border-red-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
         <div className="flex items-center space-x-3">
           <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
           <p className="text-red-700 text-sm sm:text-base font-bold">⚠️ {quizelo.error}</p>
         </div>
       </div>
     )}

     {quizelo.success && (
       <div className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 border-2 border-emerald-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
         <div className="flex items-center space-x-3">
           <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
           <p className="text-emerald-700 text-sm sm:text-base font-bold">✨ {quizelo.success}</p>
         </div>
       </div>
     )}

     {aiError && (
       <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/80 border-2 border-orange-200/60 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
         <div className="flex items-center space-x-3">
           <Brain className="w-6 h-6 text-orange-500 flex-shrink-0" />
           <p className="text-orange-700 text-sm sm:text-base font-bold">🤖 {aiError}</p>
         </div>
       </div>
     )}
   </div>
 );
 
 // Simplified Leaderboard Content
 const LeaderboardContent = () => (
   <div className="space-y-4 w-full p-3">
     <div className="flex items-center justify-between">
       <h2 className="text-mobile-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent">
         🏆 Hall of Fame
       </h2>
       <button
         onClick={() => window.location.reload()}
         className="p-3 rounded-xl hover:bg-amber-100/80 transition-colors bg-stone-50/80 backdrop-blur-sm border-2 border-stone-200/50 shadow-lg btn-mobile"
       >
         <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-stone-600" />
       </button>
     </div>

     {/* Loading State */}
     {leaderboardLoading && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 text-center">
         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
           <LoadingSpinner size={8} color="text-white" />
         </div>
         <h3 className="text-mobile-xl sm:text-2xl font-black text-stone-800 mb-4">🔄 Loading Leaderboard</h3>
         <p className="text-stone-600">📊 Fetching the latest player data...</p>
       </div>
     )}

     {/* Error State */}
     {!leaderboardLoading && leaderboardError && (
       <div className="bg-gradient-to-r from-red-100/80 to-orange-100/80 border border-red-200/60 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
         <div className="flex items-center space-x-3">
           <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
           <p className="text-red-700 font-bold">❌ Failed to load leaderboard data</p>
         </div>
       </div>
     )}

     {/* Connected Player Stats */}
     {isConnected && address && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50">
         <div className="flex items-center space-x-3 mb-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
             <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </div>
           <div>
             <h3 className="font-black text-stone-800 text-mobile-base sm:text-lg">📊 Your Stats</h3>
             <p className="text-stone-600 text-mobile-sm">{formatAddress(address || '')}</p>
           </div>
         </div>
         
         {(() => {
           const playerStats = getPlayerStats(address);
           const playerRank = getPlayerRank(address);
           
           if (playerStats) {
             return (
               <div className="grid grid-cols-2 gap-4">
                 {[
                   { icon: Trophy, label: "🏆 Rank", value: `#${playerRank}`, color: "from-amber-50/80 to-orange-50/80 border-amber-200/60" },
                   { icon: Coins, label: "💰 Earnings", value: formatEarnings(playerStats.totalEarnings), color: "from-emerald-50/80 to-teal-50/80 border-emerald-200/60" },
                   { icon: Target, label: "🎯 Quizzes", value: playerStats.totalQuizzes, color: "from-blue-50/80 to-purple-50/80 border-blue-200/60" },
                   { icon: TrendingUp, label: "📈 Win Rate", value: formatWinRate(playerStats.winRate), color: "from-pink-50/80 to-red-50/80 border-pink-200/60" }
                 ].map((stat) => (
                   <div 
                     key={stat.label}
                     className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 border backdrop-blur-sm shadow-md hover:shadow-lg transition-all`}
                   >
                     <div className="flex items-center space-x-2 mb-2">
                       <stat.icon className="w-4 h-4 text-amber-600" />
                       <span className="text-mobile-xs font-bold text-stone-600">{stat.label}</span>
                     </div>
                     <p className="text-mobile-xl sm:text-2xl font-black text-stone-800">{stat.value}</p>
                   </div>
                 ))}
               </div>
             );
           } else {
             return (
               <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-xl p-4 border border-amber-200/60 text-center shadow-md backdrop-blur-sm">
                 <p className="text-stone-800 font-bold">📊 No stats yet</p>
                 <p className="text-stone-600 text-mobile-sm">Complete your first quiz to appear on the leaderboard! 🚀</p>
               </div>
             );
           }
         })()}
       </div>
     )}

     {/* Global Stats */}
     {stats && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50">
         <div className="flex items-center space-x-3 mb-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
             <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </div>
           <h3 className="font-black text-stone-800 text-mobile-base sm:text-lg">🌍 Global Stats</h3>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
           {[
             { icon: Users, label: "👥 Players", value: stats.totalPlayers, color: "from-blue-50/80 to-purple-50/80 border-blue-200/60" },
             { icon: Target, label: "🎯 Quizzes", value: stats.totalQuizzes, color: "from-green-50/80 to-emerald-50/80 border-green-200/60" },
             { icon: Coins, label: "💰 Rewards", value: formatEarnings(stats.totalRewards), color: "from-amber-50/80 to-orange-50/80 border-amber-200/60" },
             { icon: TrendingUp, label: "📊 Avg Win Rate", value: formatWinRate(stats.avgWinRate), color: "from-pink-50/80 to-red-50/80 border-pink-200/60" }
           ].map((stat) => (
             <div 
               key={stat.label}
               className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 border backdrop-blur-sm shadow-md hover:shadow-lg transition-all`}
             >
               <div className="flex items-center space-x-2 mb-2">
                 <stat.icon className="w-4 h-4 text-amber-600" />
                 <span className="text-mobile-xs font-bold text-stone-600">{stat.label}</span>
               </div>
               <p className="text-mobile-xl sm:text-2xl font-black text-stone-800">{stat.value}</p>
             </div>
           ))}
         </div>
       </div>
     )}
     
     {/* Top Earners */}
     {leaderboard.length > 0 && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50">
         <div className="flex items-center space-x-3 mb-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
             <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </div>
           <h3 className="font-black text-stone-800 text-mobile-base sm:text-lg">💰 Top Earners</h3>
         </div>
         
         <div className="space-y-3">
           {getTopByEarnings(5).map((player, index) => (
             <div 
               key={player.address}
               className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/60 shadow-md hover:shadow-lg transition-all backdrop-blur-sm"
             >
               <div className="flex items-center space-x-4">
                 <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center">
                   <span className="text-white font-bold text-sm">{index + 1}</span>
                 </div>
                 <div>
                   <p className="font-black text-stone-800">{formatLeaderboardAddress(player.address)}</p>
                   <p className="text-stone-600 text-mobile-sm">🎯 {player.totalQuizzes} quizzes</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="font-black text-stone-800">{formatEarnings(player.totalEarnings)}</p>
                 <p className="text-stone-600 text-mobile-sm">📊 {formatWinRate(player.winRate)} win rate</p>
               </div>
             </div>
           ))}
         </div>
       </div>
     )}

     {/* Empty State */}
     {!leaderboardLoading && leaderboard.length === 0 && stats && (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 text-center">
         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
           <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
         </div>
         <h3 className="text-mobile-xl sm:text-2xl font-black text-stone-800 mb-4">🏆 No Players Yet</h3>
         <p className="text-stone-600">Be the first to complete a quiz and claim the top spot! 🚀</p>
       </div>
     )}
   </div>
 );
 
 // Simplified Profile Content
 const ProfileContent = () => (
   <div className="space-y-4 w-full p-3">
     <div className="flex items-center justify-between">
       <h2 className="text-mobile-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent">
         👤 Player Profile
       </h2>
       <div className="relative">
         <button
           onClick={() => setShowProfileDropdown(!showProfileDropdown)}
           className="p-3 rounded-xl hover:bg-amber-100/80 transition-colors shadow-lg bg-stone-50/80 backdrop-blur-sm border-2 border-stone-200/50 btn-mobile"
         >
           <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-stone-600" />
         </button>
         
         {showProfileDropdown && (
           <div className="absolute right-0 top-full mt-2 w-48 bg-stone-50/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-amber-200/60 py-2 z-10">
             <button className="flex items-center w-full px-4 py-3 text-sm text-stone-700 hover:bg-amber-50/80 transition-colors btn-mobile">
               <Settings className="w-4 h-4 mr-3" />
               ⚙️ Settings
             </button>
             <button className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50/80 transition-colors btn-mobile">
               <LogOut className="w-4 h-4 mr-3" />
               🔌 Disconnect
             </button>
           </div>
         )}
       </div>
     </div>

     {isConnected ? (
       <div className="space-y-4">
         <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all">
           <div className="text-center">
             <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
               <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
             </div>
             <h3 className="font-black text-stone-800 text-mobile-xl sm:text-2xl mb-4">🎮 Connected Player</h3>
             <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-4 border border-amber-200/60 shadow-lg backdrop-blur-sm">
               <p className="text-stone-600 text-mobile-sm font-bold mb-1">🔗 Wallet Address</p>
               <p className="font-mono text-stone-800 font-bold text-mobile-sm">{formatAddress(address || '')}</p>
             </div>
           </div>
         </div>

         {quizelo.userInfo && (
           <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 hover:shadow-2xl transition-all">
             <h4 className="font-black text-stone-800 text-mobile-base sm:text-lg mb-4 flex items-center space-x-2">
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
               ].map((stat) => (
                 <div 
                   key={stat.label}
                   className={`flex justify-between items-center p-4 bg-gradient-to-r ${stat.color} rounded-xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all`}
                 >
                   <span className="text-stone-600 font-bold text-mobile-sm">{stat.label}</span>
                   <span className={`font-black text-mobile-sm ${
                     stat.label.includes('Won today') 
                       ? (quizelo.userInfo?.wonToday ? 'text-emerald-700' : 'text-stone-500')
                       : stat.label.includes('Ready to play')
                       ? (quizelo.userInfo?.canQuiz ? 'text-emerald-700' : 'text-red-600')
                       : 'text-stone-800'
                   }`}>
                     {stat.value}
                   </span>
                 </div>
               ))}
               
               {/* Farcaster-specific stats */}
               {isMiniApp && isInFarcaster && context?.user?.fid && (
                 <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/60 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all">
                   <span className="text-stone-600 font-bold text-mobile-sm">🎭 Farcaster FID</span>
                   <span className="font-black text-stone-800 text-mobile-sm">
                     #{context.user.fid}
                   </span>
                 </div>
               )}
               
               {/* Loading indicator for mini app */}
               {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                 <div className="flex items-center justify-center p-4 bg-gradient-to-r from-stone-50/80 to-gray-50/80 rounded-xl border border-stone-200/60 backdrop-blur-sm">
                   <div className="flex items-center space-x-3">
                     <LoadingSpinner size={5} color="text-stone-500" />
                     <span className="text-stone-600 font-bold text-mobile-sm">🔄 Loading player data...</span>
                   </div>
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     ) : (
       <div className="bg-stone-50/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-stone-200/50 text-center hover:shadow-2xl transition-all">
         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-stone-400 to-stone-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
           <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
         </div>
         <h3 className="font-black text-stone-800 text-mobile-xl sm:text-2xl mb-4">🔌 No Player Connected</h3>
         <p className="text-stone-600 mb-8 text-mobile-sm">Connect your wallet to join the adventure and start earning epic rewards! 🎮</p>
         <button
           onClick={() => {
             connect({ connector: injected() });
             setShowConnectWallet(false);
           }}
           className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-4 btn-mobile"
         >
           🚀 Connect Wallet
         </button>
       </div>
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
       console.error(error);
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

 // Initialize app when SDK is loaded - improved reactivity
 useEffect(() => {
   const initializeApp = async () => {
     try {
       // Load initial data with better error handling
       const promises = [];
       
       // Always load leaderboard data (this works in Farcaster and doesn't require connection)
       promises.push(
         // This will trigger leaderboard loading
         Promise.resolve()
       );
       
       // Load contract stats (public data, doesn't require connection)
       promises.push(
         quizelo.refetchContractStats().catch(() => null)
       );
       
       // Only load user-specific data if connected
       if (isConnected) {
         promises.push(
           quizelo.refetchUserInfo().catch(() => null)
         );
         
         promises.push(
           quizelo.refetchActiveQuizTakers().catch(() => null)
         );
       }
       
       await Promise.all(promises);
     } catch (error) {
       console.error(error);
       // Handle error silently
     }
   };

   if (isSDKLoaded) {
     initializeApp();
   }
 }, [isSDKLoaded, isConnected, quizelo]);

 // Additional effect to load data when connection status changes
 useEffect(() => {
   if (isSDKLoaded && isConnected) {
     // Load user-specific data when connected
     const loadUserData = async () => {
       try {
         await Promise.all([
           quizelo.refetchUserInfo().catch(() => null),
           quizelo.refetchActiveQuizTakers().catch(() => null)
         ]);
       } catch (error) {
         console.error(error);
       }
     };
     
     loadUserData();
   }
 }, [isSDKLoaded, isConnected, quizelo]);
 
 // Loading screen for SDK - SIMPLIFIED
 if (!isSDKLoaded) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 flex items-center justify-center">
       <div className="text-center">
         <LoadingSpinner size={12} color="text-amber-600" />
         <p className="mt-4 text-amber-700 font-black text-lg">
           🔄 Loading Quizelo...
         </p>
         <div className="mt-2 text-amber-600 text-sm">
           🎮 Preparing your blockchain adventure! ⚔️
         </div>
       </div>
     </div>
   );
 }
 
 return (
   <div 
     className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 mobile-safe-area"
     style={{
       paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
       paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
       paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
       paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
     }}
   >
     {/* Main Content - Mobile-centered layout */}
     <div className="min-h-screen w-full mobile-container pb-32 sm:pb-40">
       {showResults ? (
         <ResultsPage />
       ) : isInQuiz ? (
         <QuizInterface />
       ) : (
         <div className="py-4 sm:py-6">
           {activeTab === 'home' && <HomeContent />}
           {activeTab === 'leaderboard' && <LeaderboardContent />}
           {activeTab === 'profile' && <ProfileContent />}
         </div>
       )}
     </div>

     {/* Mobile-optimized Start Quiz FAB */}
     {!isInQuiz && !showResults && (
       <button
         onClick={() => {
           if (selectedTopic) {
             // If topic is selected, start quiz directly
             if (!isConnected) {
               setShowConnectWallet(true);
             } else if (chainId !== celo.id) {
               setShowNetworkModal(true);
               switchToCelo();
             } else {
               setShowQuizInfo(true);
             }
           } else {
             // If no topic selected, show topic modal
             setShowTopicModal(true);
           }
         }}
         onTouchStart={(e) => {
           e.preventDefault();
           if (selectedTopic) {
             // If topic is selected, start quiz directly
             if (!isConnected) {
               setShowConnectWallet(true);
             } else if (chainId !== celo.id) {
               setShowNetworkModal(true);
               switchToCelo();
             } else {
               setShowQuizInfo(true);
             }
           } else {
             // If no topic selected, show topic modal
             setShowTopicModal(true);
           }
         }}
         disabled={quizelo.isLoading || aiLoading || (quizelo.userInfo ? !quizelo.userInfo.canQuiz : false)}
         className="fixed bottom-28 sm:bottom-32 right-4 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center hover:shadow-amber-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-50 border-4 border-white/80 btn-mobile"
         title={quizelo.userInfo && !quizelo.userInfo.canQuiz ? "You've reached your daily quiz limit" : selectedTopic ? "Start quiz" : "Select topic"}
         style={{
           zIndex: 9999,
           touchAction: 'manipulation',
           pointerEvents: 'auto'
         }}
       >
         {quizelo.isLoading || aiLoading ? (
           <LoadingSpinner size={6} color="text-white" />
         ) : (
           <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" />
         )}
       </button>
     )}

     {/* Mobile-optimized Bottom Navigation */}
     {!isInQuiz && !showResults && (
       <div className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur-lg border-t-2 border-amber-200/60 px-2 sm:px-4 py-3 sm:py-4 z-20 shadow-2xl mobile-safe-area">
         <div className="flex justify-around max-w-sm mx-auto">
           {[
             { tab: 'home', icon: Home, label: '🏠 Home' },
             { tab: 'leaderboard', icon: Trophy, label: '🏆 Ranks' },
             { tab: 'profile', icon: User, label: '👤 Profile' }
           ].map((item) => (
             <button
               key={item.tab}
               onClick={() => setActiveTab(item.tab)}
               className={`flex flex-col items-center space-y-1 sm:space-y-2 py-2 sm:py-3 px-2 sm:px-4 rounded-2xl transition-all hover:scale-105 btn-mobile ${
                 activeTab === item.tab 
                   ? 'bg-gradient-to-r from-amber-100/80 via-orange-100/80 to-red-100/80 text-amber-700 shadow-lg backdrop-blur-sm' 
                   : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100/80'
               }`}
             >
               <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
               <span className="text-xs font-bold">{item.label}</span>
             </button>
           ))}
         </div>
       </div>
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
       selectedTopic={selectedTopic}
     />}
   </div>
 );
};

export default QuizeloApp;