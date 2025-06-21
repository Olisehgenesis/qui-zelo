import  { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { celo } from 'viem/chains';
import { useSwitchChain, useChainId } from 'wagmi';
import { sdk } from '@farcaster/frame-sdk';

// Import your hooks
import { useQuizelo } from '../hooks/useQuizelo';
import { useTopics, TopicWithMetadata } from '../hooks/useTopics';
import { useAI } from '../hooks/useAI';

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

// interface QuizeloContract {
//   isConnected: boolean;
//   address?: `0x${string}`;
//   isLoading: boolean;
//   error?: string;
//   success?: string;
//   txHash?: string;
//   userInfo?: {
//     dailyCount: number;
//     wonToday: boolean;
//     canQuiz: boolean;
//   };
//   contractStats?: {
//     operational: boolean;
//     balance: bigint;
//   };
//   quizFee?: bigint;
//   maxDailyQuizzes: number;
//   timeUntilNextQuiz: number;
//   formatEther: (value: bigint) => string;
//   startQuiz: () => Promise<{ success: boolean; sessionId?: string }>;
//   claimReward: (sessionId: string, percentage: number) => Promise<void>;
//   refetchUserInfo: () => Promise<void>;
//   refetchContractStats: () => Promise<void>;
//   refetchActiveQuizTakers: () => Promise<void>;
// }

// Loading Animation Component with sparkles
const LoadingSpinner = ({ size = 6, color = 'text-white' }) => (
  <div className="relative">
    <Loader2 className={`w-${size} h-${size} ${color} animate-spin`} />
    <div className="absolute inset-0 animate-ping">
      <Star className={`w-${size} h-${size} ${color} opacity-30`} />
    </div>
  </div>
);

// Horizontal Timer Component
const HorizontalTimer = ({ timeLeft, totalTime = 15, onTimeUp }: { timeLeft: number, totalTime?: number, onTimeUp: () => void }) => {
  const progress = (timeLeft / totalTime) * 100;
  console.log("timeLeft", onTimeUp);
  
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'from-red-500 to-red-600';
    if (timeLeft <= 7) return 'from-orange-400 to-red-400';
    return 'from-green-400 to-blue-500';
  };

  return (
    <div className="w-full mb-6">
      {/* Timer display */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-600">⏱️ Time Left</span>
        <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
          {timeLeft}s
        </span>
      </div>
      
      {/* Progress bar container */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div 
          className={`h-full bg-gradient-to-r ${getTimerColor()} transition-all duration-1000 ease-linear rounded-full shadow-lg relative overflow-hidden`}
          style={{ width: `${progress}%` }}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
          
          {/* Pulsing effect when time is low */}
          {timeLeft <= 5 && (
            <div className="absolute inset-0 bg-red-400 animate-ping opacity-75"></div>
          )}
        </div>
      </div>
      
      {/* Warning text for low time */}
      {timeLeft <= 5 && (
        <div className="text-center mt-2">
          <span className="text-red-500 font-bold text-sm animate-bounce">
            ⚠️ Time running out!
          </span>
        </div>
      )}
    </div>
  );
};

// Question Result Component
const QuestionResult = ({ result, correctAnswer, userAnswer, onContinue, isLastQuestion }: { 
  result: QuestionResult, 
  correctAnswer: string, 
  userAnswer: string, 
  onContinue: () => void,
  isLastQuestion: boolean 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className={`bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl border-2 ${
        result.isCorrect ? 'border-green-300' : 'border-red-300'
      } relative overflow-hidden animate-slideUp`}>
        
        {/* Animated background */}
        <div className={`absolute inset-0 ${
          result.isCorrect 
            ? 'bg-gradient-to-br from-green-50/80 via-emerald-50/80 to-teal-50/80' 
            : 'bg-gradient-to-br from-red-50/80 via-pink-50/80 to-orange-50/80'
        }`}></div>
        
        {/* Celebration particles for correct answers */}
        {result.isCorrect && (
          <>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-300 rounded-full animate-bounce delay-75"></div>
            <div className="absolute top-4 -left-2 w-3 h-3 bg-green-300 rounded-full animate-bounce delay-150"></div>
            <div className="absolute -bottom-2 right-4 w-3 h-3 bg-blue-300 rounded-full animate-bounce"></div>
          </>
        )}
        
        <div className="relative text-center">
          {/* Result icon */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-2xl ${
            result.isCorrect 
              ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 animate-bounce' 
              : 'bg-gradient-to-br from-red-400 via-pink-500 to-orange-500 animate-pulse'
          }`}>
            {result.isCorrect ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <X className="w-10 h-10 text-white" />
            )}
          </div>
          
          {/* Result title */}
          <h3 className={`text-2xl font-bold mb-4 ${
            result.isCorrect ? 'text-green-600' : 'text-red-600'
          }`}>
            {result.isCorrect ? '🎉 Correct!' : '💡 Not quite!'}
          </h3>
          
          {/* Answer feedback */}
          <div className={`p-4 rounded-2xl mb-6 border-2 ${
            result.isCorrect 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {!result.isCorrect && (
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-semibold">Your answer:</span> {userAnswer}
              </p>
            )}
            <p className="text-sm text-slate-600 mb-3">
              <span className="font-semibold">Correct answer:</span> {correctAnswer}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {result.explanation}
            </p>
          </div>
          
          {/* Continue button */}
          <button
            onClick={onContinue}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105 shadow-lg ${
              result.isCorrect
                ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 hover:shadow-green-200'
                : 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 hover:shadow-purple-200'
            }`}
          >
            {isLastQuestion ? '🏁 View Results' : '➡️ Continue Quest'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz Info Modal Component
const QuizInfoModal = ({ 
  isVisible, 
  onClose, 
  onStart, 
  quizFee, 
  potentialWinnings,
  isLoading 
}: { 
  isVisible: boolean, 
  onClose: () => void, 
  onStart: () => void,
  quizFee: string,
  potentialWinnings: string,
  isLoading: boolean
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-purple-200 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-blue-50/80"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-20 animate-bounce"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
            <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
            🎮 Ready to Quest?
          </h3>
          
          {/* Quiz Fee Warning */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 mb-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">💰 Entry Fee</span>
              <span className="text-sm font-bold text-orange-600">{quizFee} CELO</span>
            </div>
            <p className="text-xs text-slate-500">This amount will be deducted from your wallet</p>
          </div>
          
          {/* Potential Winnings */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">🏆 Potential Winnings</span>
              <span className="text-sm font-bold text-green-600">{potentialWinnings} CELO</span>
            </div>
            <p className="text-xs text-slate-500">Win by scoring 60% or higher!</p>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
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
              className="w-full text-slate-500 py-2 text-sm hover:text-slate-600 transition-colors"
            >
              ⏰ Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Quiz Generation Modal with game-like animations
const QuizGenerationModal = ({ isVisible , topic, onClose }: { isVisible: boolean, topic: TopicWithMetadata | null, onClose: () => void }) => {
  if (!isVisible) return null;
  console.log("onclose", onClose);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-pink-200 relative overflow-hidden">
        {/* Animated background with multiple layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-80"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full opacity-20 animate-bounce delay-75"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full opacity-10 animate-pulse delay-150"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-pulse shadow-lg">
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
            🤖 AI Magic in Progress
          </h3>
          
          {/* Cool AI Info Box */}
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl p-4 mb-4 border border-purple-200">
            <p className="text-slate-700 font-semibold text-sm sm:text-base mb-2">
              ✨ Did you know?
            </p>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Each player gets <span className="font-bold text-purple-600">unique questions</span> generated by AI! 
              No two quests are ever the same! 🎯
            </p>
          </div>
          
          <p className="text-slate-600 mb-2 text-sm sm:text-base">🎮 Crafting your personalized quest about</p>
          <p className="font-semibold text-slate-800 mb-4 sm:mb-6 text-sm sm:text-base">{topic?.title} ⚡</p>
          
          <div className="flex justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-150"></div>
          </div>
          
          <p className="text-xs sm:text-sm text-slate-500">🚀 AI is brewing your unique challenge...</p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Transaction Modal with celebration vibes
const TransactionModal = ({ isVisible, status, txHash, onClose }: { 
  isVisible: boolean, 
  status: string, 
  txHash: string, 
  onClose: () => void
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-green-200 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 opacity-80"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            {status === 'pending' ? (
              <LoadingSpinner size={8} color="text-white" />
            ) : status === 'success' ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">
            {status === 'pending' ? '⚡ Processing Magic' : 
             status === 'success' ? '🎉 Success!' : 
             '❌ Oops!'}
          </h3>
          
          {status === 'pending' && (
            <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
              🌟 Your transaction is being processed on the blockchain...
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
              🚀 Your quiz quest has begun! Ready to earn some CELO? 
            </p>
          )}
          
          {txHash && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-4 sm:mb-6 border border-blue-100">
              <p className="text-xs text-slate-500 mb-1">🔗 Transaction Hash</p>
              <p className="font-mono text-xs text-slate-700 break-all">{txHash}</p>
            </div>
          )}
          
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-pulse opacity-50"></div>
              <div className="relative flex items-center space-x-3">
                <CheckCircle className="w-6 h-6" />
                <span>✨ Continue to Quiz</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Network Check Modal Component
const NetworkCheckModal = ({ 
  showNetworkModal,
  isSwitchingNetwork, 
  networkError, 
  switchToCelo,
  setShowNetworkModal 
}: { 
  showNetworkModal: boolean,
  isSwitchingNetwork: boolean, 
  networkError: string, 
  switchToCelo: () => Promise<void>,
  setShowNetworkModal: (show: boolean) => void 
}) => {
  if (!showNetworkModal) return null;
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-900/20 via-red-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-orange-200 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-red-50/80 to-pink-50/80"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-orange-300 to-red-300 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-br from-pink-300 to-red-300 rounded-full opacity-20 animate-bounce delay-75"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
            {isSwitchingNetwork ? (
              <LoadingSpinner size={8} color="text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent mb-3">
            {isSwitchingNetwork ? '⚡ Switching Networks' : '🔄 Wrong Network'}
          </h3>
          
          <p className="text-slate-600 text-sm sm:text-base mb-6">
            {isSwitchingNetwork 
              ? '🌟 Switching to Celo network...' 
              : '🎮 Quizelo runs on the Celo network! Please switch to continue your adventure.'
            }
          </p>
          
          {/* Network Info */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 mb-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-semibold">Current Network</span>
              <span className="text-xs text-red-600 font-bold">❌ Wrong</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Required Network</span>
              <span className="text-xs text-green-600 font-bold">✅ Celo</span>
            </div>
          </div>
          
          {/* Error Message */}
          {networkError && (
            <div className="bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-red-700 text-xs font-semibold">⚠️ {networkError}</p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={switchToCelo}
              disabled={isSwitchingNetwork}
              className="w-full bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 animate-pulse opacity-50"></div>
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
                className="w-full text-slate-500 py-2 text-sm hover:text-slate-600 transition-colors"
              >
                ⏰ Maybe later
              </button>
            )}
          </div>
          
          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold">
              💡 Tip: You can also manually switch networks in your wallet settings
            </p>
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
  const [transactionStatus, setTransactionStatus] = useState('pending');
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

  // Your hooks
  const quizelo = useQuizelo();
  const { topics, selectedTopic, selectTopic } = useTopics();
  const { generateQuestions, loading: aiLoading, error: aiError, questions, markAnswer, calculateScore } = useAI();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const handleAnswer = useCallback((answerIndex: number) => {
    if (isAnswered) return; // Prevent multiple answers
    
    setIsAnswered(true);
    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);
    
    // Get result for this question
    const result = markAnswer(currentQuestionIndex, answerIndex);
    const correctAnswer = questions[currentQuestionIndex].options[questions[currentQuestionIndex].correctAnswer];
    const userAnswer = answerIndex >= 0 ? questions[currentQuestionIndex].options[answerIndex] : 'No answer';
    
    setCurrentQuestionResult({
      ...(result as unknown as QuestionResult),
      correctAnswer,
      userAnswer,
      isLastQuestion: currentQuestionIndex === questions.length - 1
    });
    
    setShowQuestionResult(true);
  }, [isAnswered, userAnswers, currentQuestionIndex, questions, markAnswer]);

  // Timer effect for quiz questions
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInQuiz && !showResults && !showQuestionResult && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAnswer(-1); // Auto-submit with no answer
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInQuiz, showResults, showQuestionResult, isAnswered, timeLeft, currentQuestionIndex, handleAnswer]);

  // Check wallet connection on mount
  useEffect(() => {
    if (!quizelo.isConnected) {
      setShowConnectWallet(true);
    }
  }, [quizelo.isConnected]);

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
    if (quizelo.isConnected && chainId !== celo.id) {
      setShowNetworkModal(true);
      // Auto-attempt to switch
      switchToCelo();
    } else if (quizelo.isConnected && chainId === celo.id) {
      setShowNetworkModal(false);
    }
  }, [quizelo.isConnected, chainId, switchToCelo]);

  const handleTopicSelect = async (topic: TopicWithMetadata) => {
    selectTopic(topic);
    setShowTopicModal(false);
    
    if (!quizelo.isConnected) {
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
    setIsAnswered(false);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(15);
    } else {
      // Calculate final score and show results
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

  // Enhanced Results Page with celebration
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

  // Enhanced Quiz Interface with game elements
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

            {/* Horizontal Timer */}
            <HorizontalTimer 
              timeLeft={timeLeft} 
              totalTime={15} 
              onTimeUp={() => handleAnswer(-1)} 
            />

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
            correctAnswer={currentQuestionResult.correctAnswer}
            userAnswer={currentQuestionResult.userAnswer}
            onContinue={handleContinueToNext}
            isLastQuestion={currentQuestionResult.isLastQuestion}
          />
        )}
      </div>
    );
  };

  const formatAddress = (addr: `0x${string}` | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimeRemaining = (seconds: number ) => {
    if (seconds <= 0) return 'Ready! 🚀';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Enhanced Connect Wallet Modal
  const ConnectWalletModal = () => (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-purple-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-blue-50/80"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-20 animate-bounce"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-pulse shadow-2xl">
            <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
            🔗 Connect & Play!
          </h3>
          <p className="text-slate-600 text-sm sm:text-base mb-6 sm:mb-8">
            🎮 Connect your Celo wallet to start your learning adventure and earn rewards!
          </p>
          
          <button
            onClick={() => setShowConnectWallet(false)}
            className="w-full bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all transform hover:scale-105 mb-4"
          >
            🚀 Connect Wallet
          </button>
          
          <button
            onClick={() => setShowConnectWallet(false)}
            className="w-full text-slate-500 py-2 text-sm hover:text-slate-600 transition-colors"
          >
            ⏰ Maybe later
          </button>
        </div>
      </div>
    </div>
  );
  
  // Enhanced Topic Selection Modal
  const TopicModal = () => (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto border-2 border-purple-200 shadow-2xl scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-purple-100 p-4 sm:p-6 flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            🎯 Choose Your Quest
          </h3>
          <button 
            onClick={() => setShowTopicModal(false)}
            className="p-2 rounded-full hover:bg-purple-100 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic)}
              className="w-full p-4 sm:p-6 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all text-left group relative overflow-hidden shadow-lg transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 via-pink-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center space-x-4">
                <div className="text-3xl sm:text-4xl bg-gradient-to-br from-purple-100 to-pink-100 group-hover:from-purple-200 group-hover:to-pink-200 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg">
                  {topic.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 group-hover:text-purple-700 text-base sm:text-lg mb-1 transition-colors">
                    {topic.title}
                  </h4>
                  <p className="text-slate-600 group-hover:text-slate-700 transition-colors text-sm sm:text-base">
                    {topic.description}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  
  // Enhanced Home Content with gamified design
  const HomeContent = () => (
    <div className="p-4 sm:p-6 pb-32 space-y-6 overflow-y-auto">
      {/* Hero Section with game vibes */}
      <div className="bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-yellow-300/20 to-transparent rounded-full -translate-y-20 translate-x-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-300/20 to-transparent rounded-full translate-y-16 -translate-x-16 animate-pulse delay-75"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/10 rounded-full -translate-x-12 -translate-y-12 animate-spin"></div>
        
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">Quizelo</h1>
              <p className="text-purple-100 font-bold text-sm sm:text-base">🌱 Powered by Celo Magic</p>
            </div>
          </div>
          
          <p className="text-purple-100 mb-6 text-base sm:text-lg leading-relaxed font-medium">
            🎮 Level up your Celo knowledge and earn epic CELO rewards! Join thousands of crypto warriors on the ultimate blockchain adventure! ⚔️💰
          </p>
          
          {quizelo.isConnected && (
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Wallet className="w-5 h-5 text-purple-100" />
                  <div>
                    <p className="text-purple-100 text-sm font-bold">🎯 Player Connected</p>
                    <p className="font-mono text-white text-sm">{formatAddress(quizelo.address)}</p>
                  </div>
                </div>
                <button
                  onClick={switchToCelo}
                  disabled={isSwitchingNetwork}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSwitchingNetwork ? (
                    <LoadingSpinner size={5} color="text-white" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        {chainId === celo.id ? '✅ Celo' : '🔄 Switch to Celo'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  
      {/* Game Stats */}
      {quizelo.isConnected && quizelo.userInfo && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all group transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:animate-bounce shadow-lg">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-600">🏆 Today&apos;s Quests</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {quizelo.userInfo.dailyCount}/{quizelo.maxDailyQuizzes}
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all group transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:animate-pulse shadow-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-600">⏰ Next Quest</span>
            </div>
            <p className="text-lg sm:text-xl font-black bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              {formatTimeRemaining(quizelo.timeUntilNextQuiz)}
            </p>
          </div>
        </div>
      )}
  
      {/* Contract Status with game styling */}
      {quizelo.contractStats && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-black text-slate-800 text-sm sm:text-base">⚡ Game Status</span>
            </div>
            {quizelo.contractStats.operational ? (
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs sm:text-sm font-bold text-green-600">🟢 Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs sm:text-sm font-bold text-red-600">🔴 Limited</span>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <p className="text-slate-600 text-xs sm:text-sm mb-1 font-semibold">💰 Reward Pool</p>
            <p className="font-black text-slate-800 text-lg sm:text-xl">
              {quizelo.formatEther(quizelo.contractStats.balance)} CELO ✨
            </p>
          </div>
        </div>
      )}
  
      {/* Selected Topic with enhanced styling */}
      {selectedTopic && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all">
          <div className="flex items-center space-x-4 mb-4">
            <div className="text-3xl sm:text-4xl bg-gradient-to-br from-purple-100 to-pink-100 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg">
              {selectedTopic.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-base sm:text-lg">🎯 {selectedTopic.title}</h3>
              <p className="text-slate-600 text-sm sm:text-base">{selectedTopic.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTopicModal(true)}
            className="text-purple-600 font-bold hover:text-purple-700 transition-colors flex items-center space-x-2 text-sm sm:text-base bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100"
          >
            <span>🔄 Change Quest</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
  
      {/* Enhanced Status Messages */}
      {quizelo.error && (
        <div className="bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-200 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm sm:text-base font-semibold">⚠️ {quizelo.error}</p>
          </div>
        </div>
      )}
  
      {quizelo.success && (
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-200 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm sm:text-base font-semibold">✨ {quizelo.success}</p>
          </div>
        </div>
      )}
  
      {aiError && (
        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-200 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-orange-500 flex-shrink-0" />
            <p className="text-orange-700 text-sm sm:text-base font-semibold">🤖 {aiError}</p>
          </div>
        </div>
      )}
    </div>
  );
  
  // Enhanced Leaderboard Content
  const LeaderboardContent = () => (
    <div className="p-4 sm:p-6 pb-32 overflow-y-auto">
      <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-6 sm:mb-8">
        🏆 Hall of Fame
      </h2>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border border-white/50 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-4">🚀 Coming Soon!</h3>
        <p className="text-slate-600 text-sm sm:text-base">Battle other crypto warriors and claim your spot on the leaderboard! ⚔️</p>
      </div>
    </div>
  );
  
  // Enhanced Profile Content
  const ProfileContent = () => (
    <div className="p-4 sm:p-6 pb-32 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          👤 Player Profile
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="p-3 rounded-xl hover:bg-purple-100 transition-colors shadow-lg bg-white/80 backdrop-blur-sm border border-white/50"
          >
            <Settings className="w-6 h-6 text-slate-600" />
          </button>
          
          {showProfileDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-200 py-2 z-10">
              <button className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 transition-colors">
                <Settings className="w-4 h-4 mr-3" />
                ⚙️ Settings
              </button>
              <button className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4 mr-3" />
                🔌 Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
  
      {quizelo.isConnected ? (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all">
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h3 className="font-black text-slate-800 text-xl sm:text-2xl mb-4">🎮 Connected Player</h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 shadow-lg">
                <p className="text-slate-600 text-sm font-bold mb-1">🔗 Wallet Address</p>
                <p className="font-mono text-slate-800 font-bold text-sm sm:text-base">{formatAddress(quizelo.address)}</p>
              </div>
            </div>
          </div>
  
          {quizelo.userInfo && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all">
              <h4 className="font-black text-slate-800 text-base sm:text-lg mb-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>📊 Player Stats</span>
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-lg">
                  <span className="text-slate-600 font-bold text-sm sm:text-base">🎯 Today&apos;s quests</span>
                  <span className="font-black text-slate-800 text-sm sm:text-base">{quizelo.userInfo.dailyCount}/{quizelo.maxDailyQuizzes}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-lg">
                  <span className="text-slate-600 font-bold text-sm sm:text-base">🏆 Won today</span>
                  <span className={`font-black text-sm sm:text-base ${quizelo.userInfo.wonToday ? 'text-green-600' : 'text-slate-500'}`}>
                    {quizelo.userInfo.wonToday ? '✨ Yes!' : '⏳ Not yet'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200 shadow-lg">
                  <span className="text-slate-600 font-bold text-sm sm:text-base">⚡ Ready to play</span>
                  <span className={`font-black text-sm sm:text-base ${quizelo.userInfo.canQuiz ? 'text-green-600' : 'text-red-500'}`}>
                    {quizelo.userInfo.canQuiz ? '🟢 Ready!' : '🔴 Wait'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border border-white/50 text-center hover:shadow-2xl transition-all">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="font-black text-slate-800 text-xl sm:text-2xl mb-4">🔌 No Player Connected</h3>
          <p className="text-slate-600 mb-8 text-sm sm:text-base">Connect your wallet to join the adventure and start earning epic rewards! 🎮</p>
          <button
            onClick={() => setShowConnectWallet(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-2xl transition-all transform hover:scale-105"
          >
            🚀 Connect & Play
          </button>
        </div>
      )}
    </div>
  );
  
  // Call ready when the app is mounted and initial data is loaded
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Call ready immediately to dismiss splash screen
        await sdk.actions.ready();
        
        // Then load initial data in the background
        await Promise.all([
          quizelo.refetchUserInfo(),
          quizelo.refetchContractStats(),
          quizelo.refetchActiveQuizTakers()
        ]);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Still call ready even if there's an error to avoid blank screen
        await sdk.actions.ready();
      }
    };

    initializeApp();
  }, [quizelo]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
      {/* Main Content */}
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 sm:pb-40">
        {showResults ? (
          <ResultsPage />
        ) : isInQuiz ? (
          <QuizInterface />
        ) : (
          <div className="py-6 sm:py-8">
            {activeTab === 'home' && <HomeContent />}
            {activeTab === 'leaderboard' && <LeaderboardContent />}
            {activeTab === 'profile' && <ProfileContent />}
          </div>
        )}
      </div>
  
      {/* Enhanced Start Quiz FAB */}
      {!isInQuiz && !showResults && (
        <button
          onClick={() => setShowTopicModal(true)}
          disabled={quizelo.isLoading || aiLoading || (quizelo.userInfo ? !quizelo.userInfo.canQuiz : false)}
          className="fixed bottom-32 sm:bottom-36 right-4 sm:right-6 w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 rounded-full shadow-2xl flex items-center justify-center hover:shadow-pink-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 transform hover:scale-110 active:scale-95 animate-pulse border-4 border-white/80"
          title={quizelo.userInfo && !quizelo.userInfo.canQuiz ? "You've reached your daily quiz limit" : "Start a new quiz"}
        >
          {quizelo.isLoading || aiLoading ? (
            <LoadingSpinner size={7} color="text-white" />
          ) : (
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1" />
          )}
        </button>
      )}
  
      {/* Enhanced Bottom Navigation */}
      {!isInQuiz && !showResults && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t-2 border-purple-200 px-4 sm:px-6 py-4 z-20 shadow-2xl">
          <div className="flex justify-around max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-2xl transition-all transform hover:scale-110 ${
                activeTab === 'home' 
                  ? 'bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 text-purple-600 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs font-bold">🏠 Home</span>
            </button>
  
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-2xl transition-all transform hover:scale-110 ${
                activeTab === 'leaderboard' 
                  ? 'bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 text-purple-600 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-6 h-6" />
              <span className="text-xs font-bold">🏆 Ranks</span>
            </button>
  
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-2 py-3 px-4 rounded-2xl transition-all transform hover:scale-110 ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 text-purple-600 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs font-bold">👤 Profile</span>
            </button>
          </div>
        </div>
      )}
  
      {/* Modals */}
      {showConnectWallet && <ConnectWalletModal />}
      {showTopicModal && <TopicModal />}
      <QuizGenerationModal 
        isVisible={showQuizGeneration} 
        topic={selectedTopic} 
        onClose={() => setShowQuizGeneration(false)} 
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
        quizFee={quizelo.quizFee ? quizelo.formatEther(quizelo.quizFee as bigint) : '0.1'}
        potentialWinnings={quizelo.quizFee ? quizelo.formatEther((quizelo.quizFee as bigint) * 5n) : '0.5'}
        isLoading={quizelo.isLoading}
      />}
    </div>
  );
};

export default QuizeloApp;