import { useState, useEffect, useCallback } from 'react';
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
  Brain,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Star,
} from 'lucide-react';
import { celo } from 'viem/chains';
import { useSwitchChain, useChainId, useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sdk } from '@farcaster/frame-sdk';
import { motion, AnimatePresence } from 'framer-motion';

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

interface FarcasterContext {
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
}

// Minimal Loading Spinner
const LoadingSpinner = ({ size = 6 }) => (
  <Loader2 className={`w-${size} h-${size} text-black animate-spin`} />
);

// Clean Timer Component
const Timer = ({ timeLeft, totalTime = 15 }: { timeLeft: number; totalTime?: number }) => {
  const progress = (timeLeft / totalTime) * 100;
  
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-black">Time</span>
        <span className="font-bold text-lg text-black">{timeLeft}s</span>
      </div>
      <div className="w-full bg-yellow-100 rounded-full h-2">
        <div 
          className="h-full bg-yellow-400 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Question Result Modal
const QuestionResult = ({ result, onContinue }: { 
  result: QuestionResult; 
  onContinue: () => void; 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-lg p-8 w-full max-w-md mx-4 border-2 border-yellow-300">
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            result.isCorrect ? 'bg-green-400' : 'bg-red-400'
          }`}>
            {result.isCorrect ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <X className="w-10 h-10 text-white" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold mb-4 text-black">
            {result.isCorrect ? 'Correct!' : 'Wrong!'}
          </h3>
          
          <div className="p-4 rounded-lg mb-6 bg-yellow-100 border border-yellow-300">
            {!result.isCorrect && (
              <p className="text-sm text-black mb-2">
                <span className="font-bold">Your answer:</span> {result.userAnswer}
              </p>
            )}
            <p className="text-sm text-black mb-3">
              <span className="font-bold">Correct answer:</span> {result.correctAnswer}
            </p>
            <p className="text-sm text-black">{result.explanation}</p>
          </div>
          
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-lg font-bold text-black bg-yellow-300 hover:bg-yellow-400 transition-colors"
          >
            {result.isLastQuestion ? 'View Results' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz Info Modal
const QuizInfoModal = ({ isVisible, onClose, onStart, quizFee, potentialWinnings, isLoading }: {
  isVisible: boolean;
  onClose: () => void;
  onStart: () => void;
  quizFee: string;
  potentialWinnings: string;
  isLoading: boolean;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-lg p-8 w-full max-w-sm mx-4 border-2 border-yellow-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coins className="w-10 h-10 text-black" />
          </div>
          
          <h3 className="text-2xl font-bold text-black mb-6">Ready to Play?</h3>
          
          <div className="space-y-4 mb-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-black">Entry Fee</span>
                <span className="text-sm font-bold text-red-600">{quizFee} CELO</span>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-black">Potential Win</span>
                <span className="text-sm font-bold text-green-600">{potentialWinnings} CELO</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full bg-yellow-300 text-black py-4 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isLoading ? (
                <LoadingSpinner size={6} />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Start Quiz</span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-black py-2 text-sm hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz Generation Modal
const QuizGenerationModal = ({ isVisible, topic }: {
  isVisible: boolean;
  topic: TopicWithMetadata | null;
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-lg p-8 w-full max-w-sm mx-4 border-2 border-yellow-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-black" />
          </div>
          
          <h3 className="text-2xl font-bold text-black mb-6">Generating Quiz</h3>
          
          <p className="text-black mb-2">Creating questions about</p>
          <p className="font-bold text-black mb-6">{topic?.title}</p>
          
          <div className="flex justify-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-150"></div>
          </div>
          
          <p className="text-sm text-black">Please wait...</p>
        </div>
      </div>
    </div>
  );
};

// Transaction Modal
const TransactionModal = ({ isVisible, status, txHash, onClose }: {
  isVisible: boolean;
  status: 'pending' | 'success' | 'error';
  txHash: string;
  onClose: () => void;
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-lg p-8 w-full max-w-sm mx-4 border-2 border-yellow-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
            {status === 'pending' ? (
              <LoadingSpinner size={8} />
            ) : status === 'success' ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-black mb-6">
            {status === 'pending' ? 'Processing' : 
             status === 'success' ? 'Success!' : 
             'Error!'}
          </h3>
          
          {status === 'pending' && (
            <p className="text-black mb-6">Your transaction is being processed...</p>
          )}
          
          {status === 'success' && (
            <p className="text-black mb-6">Quiz started successfully!</p>
          )}
          
          {txHash && (
            <div className="bg-yellow-100 rounded-lg p-3 mb-6 border border-yellow-200">
              <p className="text-xs text-black mb-1">Transaction Hash</p>
              <p className="font-mono text-xs text-black break-all">{txHash}</p>
            </div>
          )}
          
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full bg-yellow-300 text-black py-3 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Network Check Modal
const NetworkCheckModal = ({ showNetworkModal, isSwitchingNetwork, networkError, switchToCelo, setShowNetworkModal }: {
  showNetworkModal: boolean;
  isSwitchingNetwork: boolean;
  networkError: string;
  switchToCelo: () => void;
  setShowNetworkModal: (show: boolean) => void;
}) => {
  if (!showNetworkModal) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-lg p-8 w-full max-w-sm mx-4 border-2 border-yellow-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
            {isSwitchingNetwork ? (
              <LoadingSpinner size={8} />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-black mb-6">
            {isSwitchingNetwork ? 'Switching Networks' : 'Wrong Network'}
          </h3>
          
          <p className="text-black text-base mb-6">
            {isSwitchingNetwork 
              ? 'Switching to Celo network...' 
              : 'Please switch to Celo network to continue.'
            }
          </p>
          
          {networkError && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-xs font-bold">{networkError}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={switchToCelo}
              disabled={isSwitchingNetwork}
              className="w-full bg-yellow-300 text-black py-4 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isSwitchingNetwork ? (
                <LoadingSpinner size={6} />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>{isSwitchingNetwork ? 'Switching...' : 'Switch to Celo'}</span>
            </button>
            
            {!isSwitchingNetwork && (
              <button
                onClick={() => setShowNetworkModal(false)}
                className="w-full text-black py-2 text-sm hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
  const [context, setContext] = useState<FarcasterContext>({});
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  // Your hooks
  const quizelo = useQuizelo();
  const { topics, selectedTopic, selectTopic } = useTopics();
  const { generateQuestions, loading: aiLoading, error: aiError, questions, markAnswer, calculateScore } = useAI();
  const { leaderboard, stats, isLoading: leaderboardLoading, getPlayerRank, getPlayerStats, getTopByEarnings, getTopByWinRate, formatEarnings, formatWinRate, formatAddress: formatLeaderboardAddress } = useLeaderboard();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Detect if we're in Farcaster
  const isInFarcaster = context?.client?.clientFid !== undefined;

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleAnswer = useCallback((answerIndex: number) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);

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
  }, [isAnswered, userAnswers, currentQuestionIndex, questions, markAnswer]);

  // Timer effect for quiz questions
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isInQuiz && !showResults && !showQuestionResult && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAnswer(-1);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInQuiz, showResults, showQuestionResult, isAnswered, timeLeft, currentQuestionIndex, handleAnswer]);

  // Check wallet connection on mount and handle disconnection
  useEffect(() => {
    if (isMiniApp && !isConnected) {
      setShowConnectWallet(false);
      connect({ connector: farcasterFrame() });
    } else if (address && !quizelo.isConnected) {
      console.log('Wallet detected:', address);
    } else if (!address && !quizelo.isConnected && !isMiniApp) {
      setShowConnectWallet(true);
    } else if (address && quizelo.isConnected) {
      setShowConnectWallet(false);
    } else if (!address && quizelo.isConnected) {
      setShowConnectWallet(true);
    }
  }, [address, quizelo.isConnected, isMiniApp, isConnected, connect]);

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

  // Check network on connection - simplified like Demo copy
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
    setIsAnswered(false);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(15);
    } else {
      const score = calculateScore(userAnswers);
      setFinalScore(score);
      setIsInQuiz(false);
      setShowResults(true);
    }
    
    setCurrentQuestionResult(null);
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

  // Home Content
  const HomeContent = () => (
    <div className="p-6 pb-32 space-y-6">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 rounded-2xl p-4 text-black shadow-2xl"
      >
        {/* Animated Background Elements */}
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-2 right-2 w-12 h-12 bg-yellow-200/30 rounded-full blur-lg"
        />
        
        <motion.div
          animate={{ 
            y: [0, -5, 0],
            rotate: [0, 5, 0],
          }}
          transition={{ 
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-4 left-4 w-8 h-8 bg-orange-300/40 rounded-full blur-md"
        />

        {/* Main Content */}
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center space-x-3 mb-3"
          >
            <motion.div 
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="bg-black/10 p-2 rounded-xl backdrop-blur-sm border border-white/20"
            >
              <Brain className="w-5 h-5 text-black" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-2xl font-bold bg-gradient-to-r from-black via-gray-800 to-black bg-clip-text text-transparent"
              >
                Quizelo
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-black/80 font-medium text-sm"
              >
                {isMiniApp && isInFarcaster ? '🎭 Farcaster x Celo' : '🌱 Powered by Celo'}
              </motion.p>
            </div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-black/90 mb-4 text-sm font-medium leading-relaxed"
          >
            🎮 Level up your Celo knowledge and earn CELO! ⚔️💰
          </motion.p>
          
          <AnimatePresence>
            {isConnected ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0],
                      }}
                      transition={{ 
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <Wallet className="w-4 h-4 text-black" />
                    </motion.div>
                    <div>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-black text-xs font-bold"
                      >
                        {isMiniApp && isInFarcaster 
                          ? `🎭 Farcaster (FID: ${context?.user?.fid || 'N/A'})` 
                          : '🎯 Connected'
                        }
                      </motion.p>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-mono text-black text-xs bg-white/20 px-2 py-1 rounded"
                      >
                        {formatAddress(address || '')}
                      </motion.p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={switchToCelo}
                    disabled={isSwitchingNetwork}
                    className="flex items-center space-x-2 px-3 py-1 bg-black/10 hover:bg-black/20 rounded-lg transition-all duration-200 border border-white/20 backdrop-blur-sm"
                  >
                    {isSwitchingNetwork ? (
                      <LoadingSpinner size={4} />
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 text-black" />
                        <span className="text-black text-xs font-medium">
                          {chainId === celo.id ? '✅ Celo' : '🔄 Switch'}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, -5, 0],
                      }}
                      transition={{ 
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <Wallet className="w-4 h-4 text-black" />
                    </motion.div>
                    <div>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-black text-xs font-bold"
                      >
                        {isMiniApp && isInFarcaster ? '🔌 Not Connected' : '🔌 Not Connected'}
                      </motion.p>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-black/80 text-xs"
                      >
                        {isMiniApp && isInFarcaster ? 'Connect to play!' : 'Connect to play!'}
                      </motion.p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowConnectWallet(true)}
                    className="flex items-center space-x-2 px-3 py-1 bg-black/10 hover:bg-black/20 rounded-lg transition-all duration-200 border border-white/20 backdrop-blur-sm"
                  >
                    <span className="text-black text-xs font-medium">🔗 Connect</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Farcaster Mini App features */}
      {isMiniApp && isInFarcaster && context?.user?.fid && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-10 h-10 bg-yellow-300 rounded-xl flex items-center justify-center"
            >
              <span className="text-black text-lg">🎭</span>
            </motion.div>
            <div>
              <h3 className="font-bold text-black">Farcaster Mini App</h3>
              <p className="text-black text-sm">Special features for Farcaster users</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const shareText = `🎮 Just played Quizelo and learned about ${selectedTopic?.title || 'Celo'}! Join me on this epic blockchain learning adventure and earn CELO rewards! 🌱💰\n\nTry it yourself: ${window.location.origin}`;
                const encodedText = encodeURIComponent(shareText);
                const composeUrl = `https://warpcast.com/~/compose?text=${encodedText}`;
                sdk.actions.openUrl(composeUrl);
              }}
              className="p-3 rounded-xl text-sm font-medium bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-200 shadow-md"
            >
              📤 Share Quizelo
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sdk.actions.close()}
              className="p-3 rounded-xl text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200 shadow-md"
            >
              ❌ Close App
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Game Stats */}
      {isConnected && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.div 
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg transition-all duration-200"
          >
            <div className="flex items-center space-x-3 mb-3">
              <motion.div 
                animate={{ 
                  rotate: [0, 5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-12 h-12 bg-yellow-300 rounded-xl flex items-center justify-center"
              >
                <Trophy className="w-6 h-6 text-black" />
              </motion.div>
              <span className="text-sm font-bold text-black">🏆 Today&apos;s Quests</span>
            </div>
            <motion.p 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-3xl font-bold text-black"
            >
              {quizelo.userInfo?.dailyCount ?? 0}/{quizelo.maxDailyQuizzes ?? 3}
            </motion.p>
            {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
              <div className="mt-2 flex items-center justify-center">
                <LoadingSpinner size={4} />
              </div>
            )}
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg transition-all duration-200"
          >
            <div className="flex items-center space-x-3 mb-3">
              <motion.div 
                animate={{ 
                  rotate: [0, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-12 h-12 bg-yellow-300 rounded-xl flex items-center justify-center"
              >
                <Clock className="w-6 h-6 text-black" />
              </motion.div>
              <span className="text-sm font-bold text-black">⏰ Next Quest</span>
            </div>
            <motion.p 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-xl font-bold text-black"
            >
              {quizelo.userInfo ? (
                quizelo.timeUntilNextQuiz > 0 
                  ? `${Math.floor(quizelo.timeUntilNextQuiz / 60)}:${(quizelo.timeUntilNextQuiz % 60).toString().padStart(2, '0')}`
                  : 'Ready! 🚀'
              ) : (
                isMiniApp && quizelo.isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size={4} />
                  </div>
                ) : (
                  'Loading...'
                )
              )}
            </motion.p>
          </motion.div>
        </motion.div>
      )}

      {/* Contract Status */}
      {quizelo.contractStats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <motion.div 
                animate={{ 
                  rotate: [0, 5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-12 h-12 bg-yellow-300 rounded-xl flex items-center justify-center"
              >
                <Coins className="w-6 h-6 text-black" />
              </motion.div>
              <span className="font-bold text-black">⚡ Game Status</span>
            </div>
            {quizelo.contractStats.operational ? (
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-green-600">🟢 Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-600">🔴 Limited</span>
              </div>
            )}
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-black text-sm mb-1 font-bold">💰 Reward Pool</p>
            <p className="font-bold text-black text-xl">
              {quizelo.formatEther(quizelo.contractStats.balance)} CELO ✨
            </p>
          </div>
        </motion.div>
      )}

      {/* Selected Topic */}
      {selectedTopic && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-4 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="text-4xl bg-yellow-100 w-16 h-16 rounded-xl flex items-center justify-center"
            >
              {selectedTopic.icon}
            </motion.div>
            <div className="flex-1">
              <h3 className="font-bold text-black text-lg">{selectedTopic.title}</h3>
              <p className="text-black">{selectedTopic.description}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTopicModal(true)}
            className="text-black font-bold hover:text-gray-600 transition-colors flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full hover:bg-yellow-200"
          >
            <span>Change Topic</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Status Messages */}
      {quizelo.error && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-red-100 border-2 border-red-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="text-red-700 font-bold">{quizelo.error}</p>
          </div>
        </motion.div>
      )}

      {quizelo.success && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-green-100 border-2 border-green-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-bold">{quizelo.success}</p>
          </div>
        </motion.div>
      )}

      {aiError && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-orange-100 border-2 border-orange-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-orange-500 flex-shrink-0" />
            <p className="text-orange-700 font-bold">{aiError}</p>
          </div>
        </motion.div>
      )}
    </div>
  );

  // Leaderboard Content
  const LeaderboardContent = () => (
    <div className="p-6 pb-32 space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <h2 className="text-3xl font-bold text-black">Leaderboard</h2>
        <motion.button
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="p-3 rounded-xl hover:bg-yellow-100 transition-colors bg-white border border-yellow-300 shadow-lg"
        >
          <RefreshCw className="w-6 h-6 text-black" />
        </motion.button>
      </motion.div>

      {/* Loading State */}
      {leaderboardLoading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl p-12 border border-yellow-300 text-center shadow-lg"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-6"
          >
            <LoadingSpinner size={8} />
          </motion.div>
          <h3 className="text-2xl font-bold text-black mb-4">Loading Leaderboard</h3>
          <p className="text-black">Fetching the latest player data...</p>
        </motion.div>
      )}

      {/* Error State */}
      {!leaderboardLoading && !stats && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-red-100 border border-red-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0],
              }}
              transition={{ 
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            </motion.div>
            <p className="text-red-700 font-bold">Failed to load leaderboard data</p>
          </div>
        </motion.div>
      )}

      {/* Connected Player Stats */}
      {isConnected && address && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center"
            >
              <User className="w-6 h-6 text-black" />
            </motion.div>
            <div>
              <h3 className="font-bold text-black text-lg">Your Stats</h3>
              <p className="text-black text-sm">{formatAddress(address || '')}</p>
            </div>
          </div>
          
          {(() => {
            const playerStats = getPlayerStats(address);
            const playerRank = getPlayerRank(address);
            
            if (playerStats) {
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-black">Rank</span>
                    </div>
                    <p className="text-2xl font-bold text-black">#{playerRank}</p>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-black">Earnings</span>
                    </div>
                    <p className="text-2xl font-bold text-black">{formatEarnings(playerStats.totalEarnings)}</p>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-black">Quizzes</span>
                    </div>
                    <p className="text-2xl font-bold text-black">{playerStats.totalQuizzes}</p>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-black">Win Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-black">{formatWinRate(playerStats.winRate)}</p>
                  </motion.div>
                </motion.div>
              );
            } else {
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 text-center shadow-md"
                >
                  <p className="text-black font-bold">No stats yet</p>
                  <p className="text-black text-sm">Complete your first quiz to appear on the leaderboard!</p>
                </motion.div>
              );
            }
          })()}
        </motion.div>
      )}

      {/* Global Stats */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center"
            >
              <Trophy className="w-6 h-6 text-black" />
            </motion.div>
            <h3 className="font-bold text-black text-lg">Global Stats</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-black">Players</span>
              </div>
              <p className="text-2xl font-bold text-black">{stats.totalPlayers}</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-black">Quizzes</span>
              </div>
              <p className="text-2xl font-bold text-black">{stats.totalQuizzes}</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-black">Rewards</span>
              </div>
              <p className="text-2xl font-bold text-black">{formatEarnings(stats.totalRewards)}</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md"
            >
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-black">Avg Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-black">{formatWinRate(stats.avgWinRate)}</p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Top Earners */}
      {leaderboard.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center"
            >
              <Coins className="w-6 h-6 text-black" />
            </motion.div>
            <h3 className="font-bold text-black text-lg">Top Earners</h3>
          </div>
          
          <div className="space-y-3">
            {getTopByEarnings(5).map((player, index) => (
              <motion.div 
                key={player.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-md"
              >
                <div className="flex items-center space-x-4">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, 0],
                    }}
                    transition={{ 
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center"
                  >
                    <span className="text-black font-bold text-sm">{index + 1}</span>
                  </motion.div>
                  <div>
                    <p className="font-bold text-black">{formatLeaderboardAddress(player.address)}</p>
                    <p className="text-black text-sm">{player.totalQuizzes} quizzes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-black">{formatEarnings(player.totalEarnings)}</p>
                  <p className="text-black text-sm">{formatWinRate(player.winRate)} win rate</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Best Win Rates */}
      {leaderboard.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white rounded-2xl p-6 border border-yellow-300 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center"
            >
              <Star className="w-6 h-6 text-black" />
            </motion.div>
            <h3 className="font-bold text-black text-lg">Best Win Rates</h3>
          </div>
          
          <div className="space-y-3">
            {getTopByWinRate(5).map((player, index) => (
              <motion.div 
                key={player.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-md"
              >
                <div className="flex items-center space-x-4">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, 0],
                    }}
                    transition={{ 
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center"
                  >
                    <span className="text-black font-bold text-sm">{index + 1}</span>
                  </motion.div>
                  <div>
                    <p className="font-bold text-black">{formatLeaderboardAddress(player.address)}</p>
                    <p className="text-black text-sm">{player.totalQuizzes} quizzes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-black">{formatWinRate(player.winRate)}</p>
                  <p className="text-black text-sm">{formatEarnings(player.totalEarnings)} earned</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!leaderboardLoading && leaderboard.length === 0 && stats && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl p-12 border border-yellow-300 text-center shadow-lg"
        >
          <motion.div 
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-6"
          >
            <Trophy className="w-10 h-10 text-black" />
          </motion.div>
          <h3 className="text-2xl font-bold text-black mb-4">No Players Yet</h3>
          <p className="text-black">Be the first to complete a quiz and claim the top spot!</p>
        </motion.div>
      )}
    </div>
  );

  // Profile Content
  const ProfileContent = () => (
    <div className="p-6 pb-32 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-black">Profile</h2>
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="p-3 rounded-lg hover:bg-yellow-100 transition-colors bg-white border border-yellow-300"
          >
            <Settings className="w-6 h-6 text-black" />
          </button>
          
          {showProfileDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg border border-yellow-300 py-2 z-10">
              <button className="flex items-center w-full px-4 py-3 text-sm text-black hover:bg-yellow-50 transition-colors">
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </button>
              <button className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4 mr-3" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-8 border border-yellow-300">
            <div className="text-center">
              <div className="w-24 h-24 bg-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-black" />
              </div>
              <h3 className="font-bold text-black text-2xl mb-4">Connected Player</h3>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-black text-sm font-bold mb-1">Wallet Address</p>
                <p className="font-mono text-black font-bold">{formatAddress(address || '')}</p>
              </div>
            </div>
          </div>

          {quizelo.userInfo && (
            <div className="bg-white rounded-lg p-6 border border-yellow-300">
              <h4 className="font-bold text-black text-lg mb-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Player Stats</span>
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-black font-bold">Today&apos;s quests</span>
                  <span className="font-bold text-black">
                    {quizelo.userInfo?.dailyCount ?? 0}/{quizelo.maxDailyQuizzes ?? 3}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-black font-bold">Won today</span>
                  <span className={`font-bold ${quizelo.userInfo?.wonToday ? 'text-green-600' : 'text-black'}`}>
                    {quizelo.userInfo?.wonToday ? 'Yes!' : 'Not yet'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-black font-bold">Ready to play</span>
                  <span className={`font-bold ${quizelo.userInfo?.canQuiz ? 'text-green-600' : 'text-red-500'}`}>
                    {quizelo.userInfo?.canQuiz ? 'Ready!' : 'Wait'}
                  </span>
                </div>
                
                {isMiniApp && isInFarcaster && context?.user?.fid && (
                  <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="text-black font-bold">Farcaster FID</span>
                    <span className="font-bold text-black">
                      #{context.user.fid}
                    </span>
                  </div>
                )}
                
                {isMiniApp && !quizelo.userInfo && quizelo.isLoading && (
                  <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <LoadingSpinner size={5} />
                      <span className="text-black font-bold text-sm">Loading player data...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-12 border border-yellow-300 text-center">
          <div className="w-20 h-20 bg-gray-300 rounded-lg flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-bold text-black text-2xl mb-4">No Player Connected</h3>
          <p className="text-black mb-8">Connect your wallet to join the adventure and start earning rewards!</p>
          <button
            onClick={() => {
              connect({ connector: injected() });
              setShowConnectWallet(false);
            }}
            className="w-full bg-yellow-300 text-black py-4 rounded-lg font-bold hover:bg-yellow-400 transition-colors mb-4"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );

  // SDK initialization
  useEffect(() => {
    const load = async () => {
      try {
        // Check if running in Mini App by checking the context
        const frameContext = await sdk.context as FarcasterContext;
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
        // Load initial data
        await Promise.all([
          quizelo.refetchUserInfo(),
          quizelo.refetchContractStats(),
          quizelo.refetchActiveQuizTakers()
        ]);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    if (isSDKLoaded) {
      initializeApp();
    }
  }, [isSDKLoaded, quizelo]);

  // Results Page Component
  const ResultsPage = () => {
    if (!finalScore) return null;

    const getScoreEmoji = (percentage: number) => {
      if (percentage >= 90) return '🏆';
      if (percentage >= 80) return '🥇';
      if (percentage >= 70) return '🥈';
      if (percentage >= 60) return '🥉';
      return '💪';
    };

    const getScoreColor = (percentage: number) => {
      if (percentage >= 80) return 'from-yellow-400 via-orange-400 to-red-400';
      if (percentage >= 60) return 'from-green-400 via-blue-400 to-purple-400';
      return 'from-blue-400 via-purple-400 to-pink-400';
    };

    const getScoreMessage = (percentage: number) => {
      if (percentage >= 90) return 'LEGENDARY! 🌟';
      if (percentage >= 80) return 'AMAZING! 🎯';
      if (percentage >= 70) return 'GREAT JOB! 🚀';
      if (percentage >= 60) return 'WELL DONE! 💫';
      return 'KEEP GOING! 💪';
    };

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 overflow-y-auto">
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-lg mx-auto">
            {/* Celebration Header */}
            <div className="text-center mb-6 sm:mb-8 relative">
              <div className="absolute inset-0 animate-pulse">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-r from-yellow-200 to-pink-200 opacity-50"></div>
              </div>
              <div className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl animate-bounce`}>
                <span className="text-3xl sm:text-4xl">{getScoreEmoji(finalScore.percentage)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Quest Complete!
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">🎉 Check out your epic results!</p>
            </div>

            {/* Enhanced Score Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-white/50 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-yellow-300 to-orange-300 rounded-full opacity-20 animate-spin"></div>
              
              <div className="relative text-center">
                <div className={`text-5xl sm:text-7xl font-black mb-3 bg-gradient-to-r ${getScoreColor(finalScore.percentage)} bg-clip-text text-transparent`}>
                  {finalScore.percentage}%
                </div>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                  {getScoreMessage(finalScore.percentage)}
                </p>
                <div className="flex items-center justify-center space-x-2 text-slate-600">
                  <Target className="w-4 h-4" />
                  <span className="text-sm sm:text-base">
                    {finalScore.correct} out of {finalScore.total} correct
                  </span>
                </div>
              </div>
            </div>

            {/* Topic Badge */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/50 mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-3xl sm:text-4xl bg-gradient-to-br from-blue-100 to-purple-100 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  {selectedTopic?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">{selectedTopic?.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base">{selectedTopic?.description}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {finalScore?.percentage >= 60 && (
                <button
                  onClick={handleClaimReward}
                  disabled={quizelo.isLoading}
                  className="w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-pulse opacity-50"></div>
                  <div className="relative flex items-center space-x-3">
                    {quizelo.isLoading ? (
                      <LoadingSpinner size={6} />
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
                className="w-full bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-3"
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
                className="w-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 py-4 rounded-2xl font-semibold hover:from-slate-300 hover:to-slate-400 transition-all transform hover:scale-105"
              >
                🏠 Back to Home Base
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Quiz Interface Component
  const QuizInterface = () => {
    if (!questions[currentQuestionIndex]) return null;

    const question = questions[currentQuestionIndex];

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 overflow-y-auto">
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-lg mx-auto">
            {/* Game Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800 text-sm sm:text-base">{selectedTopic?.title}</h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    🎯 Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Timer */}
            <Timer timeLeft={timeLeft} totalTime={15} />

            {/* Progress with XP bar style */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-600">🏆 Progress</span>
                <span className="text-sm font-semibold text-slate-600">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card with game styling */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-white/50 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                    <span className="text-white text-sm sm:text-base font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed">
                    {question.question}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={isAnswered}
                      className={`w-full p-4 sm:p-5 text-left rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden shadow-lg ${
                        isAnswered
                          ? index === question.correctAnswer
                            ? 'border-green-400 bg-gradient-to-r from-green-100 to-emerald-100 shadow-green-200'
                            : index === userAnswers[currentQuestionIndex]
                            ? 'border-red-400 bg-gradient-to-r from-red-100 to-pink-100 shadow-red-200'
                            : 'border-slate-200 bg-white/50'
                          : 'border-white/60 bg-white/40 hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:shadow-xl transform hover:scale-105'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 via-pink-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold shadow-lg ${
                          isAnswered
                            ? index === question.correctAnswer
                              ? 'border-green-400 bg-green-400 text-white'
                              : index === userAnswers[currentQuestionIndex]
                              ? 'border-red-400 bg-red-400 text-white'
                              : 'border-slate-300 bg-white text-slate-400'
                            : 'border-purple-300 bg-white text-purple-600 group-hover:border-purple-400 group-hover:bg-purple-400 group-hover:text-white'
                        }`}>
                          <span className="text-sm">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <span className="text-slate-700 group-hover:text-slate-800 font-medium text-sm sm:text-base flex-1">
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
            onContinue={handleContinueToNext}
          />
        )}
      </div>
    );
  };

  // Loading screen for SDK
  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size={12} />
          <p className="mt-4 text-black font-bold">Loading Quizelo...</p>
        </div>
      </div>
    );
  }

  // Topic Selection Modal
  const TopicModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 rounded-2xl p-6 w-full max-w-md mx-4 border-2 border-yellow-300 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-black">Choose Your Topic</h3>
          <button 
            onClick={() => setShowTopicModal(false)}
            className="p-2 rounded-full hover:bg-yellow-100 transition-colors"
          >
            <X className="w-6 h-6 text-black" />
          </button>
        </div>
        
        <div className="space-y-4">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic)}
              className="w-full p-4 bg-white rounded-xl border-2 border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="text-3xl bg-yellow-100 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  {topic.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-black text-lg mb-1">
                    {topic.title}
                  </h4>
                  <p className="text-black/70 text-sm">
                    {topic.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-black/50 group-hover:text-black transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-yellow-50"
      style={{
        paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Main Content */}
      <div className="min-h-screen max-w-7xl mx-auto px-4 pb-32">
        {showResults ? (
          <ResultsPage />
        ) : isInQuiz ? (
          <QuizInterface />
        ) : (
          <div className="py-8">
            {activeTab === 'home' && <HomeContent />}
            {activeTab === 'leaderboard' && <LeaderboardContent />}
            {activeTab === 'profile' && <ProfileContent />}
          </div>
        )}
      </div>

      {/* Start Quiz Button */}
      {!isInQuiz && !showResults && (
        <button
          onClick={() => setShowTopicModal(true)}
          disabled={quizelo.isLoading || aiLoading || (quizelo.userInfo ? !quizelo.userInfo.canQuiz : false)}
          className="fixed bottom-36 right-6 w-18 h-18 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 rounded-full shadow-2xl flex items-center justify-center hover:shadow-yellow-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 transform hover:scale-110 active:scale-95 animate-pulse border-4 border-white/80"
          title={quizelo.userInfo && !quizelo.userInfo.canQuiz ? "You've reached your daily quiz limit" : "Start a new quiz"}
        >
          {quizelo.isLoading || aiLoading ? (
            <LoadingSpinner size={8} />
          ) : (
            <Play className="w-8 h-8 text-black ml-1" />
          )}
        </button>
      )}

      {/* Bottom Navigation */}
      {!isInQuiz && !showResults && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-yellow-300 px-6 py-4 z-20">
          <div className="flex justify-around max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'home' 
                  ? 'bg-yellow-100 text-black' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs font-bold">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'leaderboard' 
                  ? 'bg-yellow-100 text-black' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Trophy className="w-6 h-6" />
              <span className="text-xs font-bold">Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-yellow-100 text-black' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs font-bold">Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showTopicModal && <TopicModal />}
      {showConnectWallet && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-yellow-100 to-orange-50 rounded-2xl p-8 w-full max-w-sm mx-4 border-2 border-yellow-300 shadow-2xl"
          >
            {/* Animated background elements */}
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute top-4 right-4 w-20 h-20 bg-yellow-200/30 rounded-full blur-xl"
            />
            
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, 0],
              }}
              transition={{ 
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute bottom-6 left-6 w-16 h-16 bg-orange-200/40 rounded-full blur-lg"
            />

            <div className="relative z-10 text-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0],
                  }}
                  transition={{ 
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Wallet className="w-10 h-10 text-black" />
                </motion.div>
              </motion.div>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-2xl font-bold text-black mb-3"
              >
                Connect Wallet
              </motion.h3>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-black text-base mb-8"
              >
                {isMiniApp && isInFarcaster 
                  ? 'Connect your wallet to start playing!' 
                  : 'Connect your Celo wallet to start earning rewards!'
                }
              </motion.p>
              
              {isMiniApp && isInFarcaster ? (
                <div className="space-y-3">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
                      if (farcasterConnector) {
                        connect({ connector: farcasterConnector });
                      } else {
                        connect({ connector: injected() });
                      }
                      setShowConnectWallet(false);
                    }}
                    className="w-full bg-gradient-to-r from-yellow-300 to-yellow-400 text-black py-4 rounded-xl font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all duration-200 shadow-lg mb-3"
                  >
                    Connect in Farcaster
                  </motion.button>
                  
                  {connectors.length > 1 && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.0 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        connect({ connector: connectors.find((c) => c.name.includes('Coinbase')) || connectors[1] });
                        setShowConnectWallet(false);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                    >
                      Coinbase Wallet
                    </motion.button>
                  )}
                  
                  {connectors.length > 2 && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.2 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        connect({ connector: connectors.find((c) => c.name.includes('MetaMask')) || connectors[2] });
                        setShowConnectWallet(false);
                      }}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg"
                    >
                      MetaMask
                    </motion.button>
                  )}
                </div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    connect({ connector: injected() });
                    setShowConnectWallet(false);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-300 to-yellow-400 text-black py-4 rounded-xl font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all duration-200 shadow-lg mb-4"
                >
                  Connect Wallet
                </motion.button>
              )}
              
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConnectWallet(false)}
                className="w-full text-black py-2 text-sm hover:text-gray-600 transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
    </div>
  );
};

export default QuizeloApp;