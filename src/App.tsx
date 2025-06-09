import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Trophy, 
  User, 
  Play, 
  Wallet, 
  X, 
  Clock, 
  Coins, 
  Zap,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Sparkles,
  Brain,
  Timer,
  Award,
  RefreshCw
} from 'lucide-react';

// Import your hooks
import { useQuizelo } from './hooks/useQuizelo';
import { useTopics } from './hooks/useTopics';
import { useAI } from './hooks/useAI';

// Loading Animation Component
const LoadingSpinner = ({ size = 6, color = 'text-white' }) => (
  <Loader2 className={`w-${size} h-${size} ${color} animate-spin`} />
);

// Quiz Generation Modal
const QuizGenerationModal = ({ isVisible, topic, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-violet-200 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-emerald-50 opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-violet-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-75"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-pulse">
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent mb-3">
            Generating Quiz
          </h3>
          <p className="text-slate-600 mb-2 text-sm sm:text-base">Creating questions about</p>
          <p className="font-semibold text-slate-800 mb-4 sm:mb-6 text-sm sm:text-base">{topic?.title}</p>
          
          <div className="flex justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-150"></div>
          </div>
          
          <p className="text-xs sm:text-sm text-slate-500">This may take a few seconds...</p>
        </div>
      </div>
    </div>
  );
};

// Transaction Waiting Modal
const TransactionModal = ({ isVisible, status, txHash, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-emerald-200 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-amber-50 opacity-50"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            {status === 'pending' ? (
              <LoadingSpinner size={8} color="text-white" />
            ) : status === 'success' ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">
            {status === 'pending' ? 'Processing Transaction' : 
             status === 'success' ? 'Transaction Successful!' : 
             'Transaction Failed'}
          </h3>
          
          {status === 'pending' && (
            <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
              Please wait while your transaction is being processed on the blockchain...
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
              Your quiz has been started successfully! 🎉
            </p>
          )}
          
          {txHash && (
            <div className="bg-slate-100 rounded-xl p-3 mb-4 sm:mb-6">
              <p className="text-xs text-slate-500 mb-1">Transaction Hash</p>
              <p className="font-mono text-xs text-slate-700 break-all">{txHash}</p>
            </div>
          )}
          
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-amber-600 transition-all"
            >
              Continue
            </button>
          )}
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
  const [userAnswers, setUserAnswers] = useState([]);
  const [showQuizGeneration, setShowQuizGeneration] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('pending');
  const [currentTxHash, setCurrentTxHash] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [quizSessionId, setQuizSessionId] = useState(null);
  const [finalScore, setFinalScore] = useState(null);

  // Your hooks
  const quizelo = useQuizelo();
  const { topics, selectedTopic, selectTopic, clearSelection } = useTopics();
  const { generateQuestions, loading: aiLoading, error: aiError, questions, markAnswer, calculateScore } = useAI();

  // Timer effect for quiz questions
  useEffect(() => {
    let timer;
    if (isInQuiz && !showResults && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up, auto-advance to next question
            handleAnswer(-1); // -1 indicates no answer (timeout)
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInQuiz, showResults, timeLeft, currentQuestionIndex]);

  // Check wallet connection on mount
  useEffect(() => {
    if (!quizelo.isConnected) {
      setShowConnectWallet(true);
    }
  }, [quizelo.isConnected]);

  const handleTopicSelect = async (topic) => {
    selectTopic(topic);
    setShowTopicModal(false);
    
    // Immediately start quiz after topic selection
    if (!quizelo.isConnected) {
      setShowConnectWallet(true);
      return;
    }

    await startQuizFlow(topic);
  };

  const startQuizFlow = async (topic = selectedTopic) => {
    if (!topic) {
      setShowTopicModal(true);
      return;
    }

    try {
      // Show transaction modal
      setShowTransactionModal(true);
      setTransactionStatus('pending');
      
      // Start quiz on blockchain
      const result = await quizelo.startQuiz();
      setCurrentTxHash(quizelo.txHash || '');
      
      if (result.success) {
        setQuizSessionId(result.sessionId);
        setTransactionStatus('success');
        
        // Wait a moment then hide transaction modal and show quiz generation
        setTimeout(() => {
          setShowTransactionModal(false);
          setShowQuizGeneration(true);
          
          // Generate questions with AI
          const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
          generateQuestions(topic, apiKey).then(() => {
            setShowQuizGeneration(false);
            // Start the quiz
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

  const handleAnswer = (answerIndex) => {
    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(15);
    } else {
      // Quiz completed
      const score = calculateScore(newAnswers);
      setFinalScore(score);
      setIsInQuiz(false);
      setShowResults(true);
    }
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

  // Results Page
  const ResultsPage = () => {
    if (!finalScore) return null;

    const getScoreColor = (percentage) => {
      if (percentage >= 80) return 'text-emerald-600';
      if (percentage >= 60) return 'text-amber-600';
      return 'text-red-600';
    };

    const getScoreMessage = (percentage) => {
      if (percentage >= 80) return 'Excellent! 🎉';
      if (percentage >= 60) return 'Good job! 👍';
      return 'Keep learning! 📚';
    };

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-violet-50 z-50 overflow-y-auto">
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Award className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Quiz Complete!</h1>
              <p className="text-slate-600 text-sm sm:text-base">Here are your results</p>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              
              <div className="relative text-center">
                <div className={`text-4xl sm:text-6xl font-bold mb-2 ${getScoreColor(finalScore.percentage)}`}>
                  {finalScore.percentage}%
                </div>
                <p className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">
                  {getScoreMessage(finalScore.percentage)}
                </p>
                <p className="text-slate-600 text-sm sm:text-base">
                  {finalScore.correct} out of {finalScore.total} correct answers
                </p>
              </div>
            </div>

            {/* Topic Info */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-2xl sm:text-3xl bg-slate-100 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center">
                  {selectedTopic?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">{selectedTopic?.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base">{selectedTopic?.description}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-4">
              {finalScore.percentage >= 60 && (
                <button
                  onClick={handleClaimReward}
                  disabled={quizelo.isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 sm:py-4 rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {quizelo.isLoading ? (
                    <LoadingSpinner size={5} color="text-white" />
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      <span>Claim Reward</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={handleRetakeQuiz}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-3 sm:py-4 rounded-2xl font-semibold hover:from-violet-600 hover:to-purple-600 transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Take Another Quiz</span>
              </button>
              
              <button
                onClick={() => {
                  setShowResults(false);
                  setQuizSessionId(null);
                  setFinalScore(null);
                }}
                className="w-full bg-slate-200 text-slate-700 py-3 sm:py-4 rounded-2xl font-semibold hover:bg-slate-300 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Quiz Interface
  const QuizInterface = () => {
    if (!questions[currentQuestionIndex]) return null;

    const question = questions[currentQuestionIndex];
    const result = userAnswers[currentQuestionIndex] !== undefined 
      ? markAnswer(currentQuestionIndex, userAnswers[currentQuestionIndex])
      : null;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-violet-50 z-50 overflow-y-auto">
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800 text-sm sm:text-base">{selectedTopic?.title}</h1>
                  <p className="text-xs sm:text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500' : 'text-amber-600'}`} />
                <span className={`text-sm sm:text-base font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-amber-600'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4 sm:mb-6">
              <div className="w-full bg-slate-200 rounded-full h-2 sm:h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 mb-4 sm:mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-bl from-violet-100 to-transparent rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
              
              <div className="relative">
                <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs sm:text-sm font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed">
                    {question.question}
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={result !== null}
                      className={`w-full p-3 sm:p-4 text-left rounded-2xl border-2 transition-all duration-200 group relative overflow-hidden ${
                        result !== null
                          ? index === question.correctAnswer
                            ? 'border-emerald-500 bg-emerald-50'
                            : index === userAnswers[currentQuestionIndex]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200'
                          : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                      <div className="relative flex items-center space-x-3">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                          result !== null
                            ? index === question.correctAnswer
                              ? 'border-emerald-500 bg-emerald-500'
                              : index === userAnswers[currentQuestionIndex]
                              ? 'border-red-500 bg-red-500'
                              : 'border-slate-300'
                            : 'border-slate-300 group-hover:border-violet-400'
                        }`}>
                          <span className={`text-xs font-bold ${
                            result !== null && (index === question.correctAnswer || index === userAnswers[currentQuestionIndex])
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-violet-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <span className="text-slate-700 group-hover:text-slate-800 font-medium text-sm sm:text-base">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanation */}
            {result && (
              <div className={`${result.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-2xl p-4 sm:p-6`}>
                <div className="flex items-start space-x-3">
                  {result.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${result.isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                      {result.isCorrect ? 'Correct!' : 'Incorrect'}
                    </p>
                    <p className="text-slate-700 text-sm sm:text-base">{result.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return 'Available now';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Connect Wallet Modal
  const ConnectWalletModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-emerald-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-amber-50 opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-200 rounded-full opacity-20 animate-pulse"></div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-pulse">
            <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent mb-3">
            Connect Your Wallet
          </h3>
          <p className="text-slate-600 text-sm sm:text-base mb-6 sm:mb-8">
            Connect your Celo wallet to start playing quizzes and earning rewards
          </p>
          
          <button
            onClick={() => setShowConnectWallet(false)}
            className="w-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white py-3 sm:py-4 rounded-2xl font-medium hover:from-emerald-600 hover:to-amber-600 transition-all transform hover:scale-105 mb-4"
          >
            Connect Wallet
          </button>
          
          <button
            onClick={() => setShowConnectWallet(false)}
            className="w-full text-slate-500 py-2 text-sm hover:text-slate-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );

  // Topic Selection Modal
  const TopicModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
            Choose Quiz Topic
          </h3>
          <button 
            onClick={() => setShowTopicModal(false)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic)}
              className="w-full p-4 sm:p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
              <div className="relative flex items-center space-x-3 sm:space-x-4">
                <div className="text-2xl sm:text-3xl bg-slate-100 group-hover:bg-white w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors">
                  {topic.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 group-hover:text-violet-700 text-base sm:text-lg mb-1 transition-colors">
                    {topic.title}
                  </h4>
                  <p className="text-slate-600 group-hover:text-slate-700 transition-colors text-sm sm:text-base">
                    {topic.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-violet-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Home Tab Content
  const HomeContent = () => (
    <div className="p-4 sm:p-6 pb-32 space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -translate-y-16 sm:-translate-y-20 translate-x-16 sm:translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full translate-y-12 sm:translate-y-16 -translate-x-12 sm:-translate-x-16"></div>
        
        <div className="relative">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
            <div className="bg-white/20 p-2 sm:p-3 rounded-2xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Quizelo</h1>
              <p className="text-emerald-100 font-medium text-sm sm:text-base">Powered by Celo 🌱</p>
            </div>
          </div>
          
          <p className="text-emerald-100 mb-4 sm:mb-6 text-base sm:text-lg leading-relaxed">
            Test your Celo knowledge and earn CELO rewards! Join thousands of learners in the most fun way to explore blockchain 💰
          </p>
          
          {quizelo.isConnected && (
            <div className="bg-white/15 rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-3">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" />
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm font-medium">Connected Wallet</p>
                  <p className="font-mono text-white text-xs sm:text-sm">{formatAddress(quizelo.address)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {quizelo.isConnected && quizelo.userInfo && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">Today's Quizzes</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-800">
              {quizelo.userInfo.dailyCount}/{quizelo.maxDailyQuizzes}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">Next Quiz</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-800">
              {formatTimeRemaining(quizelo.timeUntilNextQuiz)}
            </p>
          </div>
        </div>
      )}

      {/* Contract Status */}
      {quizelo.contractStats && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm sm:text-base">Contract Status</span>
            </div>
            {quizelo.contractStats.operational ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                <span className="text-xs sm:text-sm font-medium text-emerald-600">Operational</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                <span className="text-xs sm:text-sm font-medium text-red-600">Limited</span>
              </div>
            )}
          </div>
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
            <p className="text-slate-600 text-xs sm:text-sm mb-1">Contract Balance</p>
            <p className="font-bold text-slate-800 text-base sm:text-lg">
              {quizelo.formatEther(quizelo.contractStats.balance)} CELO
            </p>
          </div>
        </div>
      )}

      {/* Selected Topic */}
      {selectedTopic && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <div className="text-2xl sm:text-3xl bg-slate-100 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center">
              {selectedTopic.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">{selectedTopic.title}</h3>
              <p className="text-slate-600 text-sm sm:text-base">{selectedTopic.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTopicModal(true)}
            className="text-violet-600 font-semibold hover:text-violet-700 transition-colors flex items-center space-x-2 text-sm sm:text-base"
          >
            <span>Change topic</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Messages */}
      {quizelo.error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm sm:text-base">{quizelo.error}</p>
          </div>
        </div>
      )}

      {quizelo.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-emerald-700 text-sm sm:text-base">{quizelo.success}</p>
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-700 text-sm sm:text-base">{aiError}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Leaderboard Tab Content
  const LeaderboardContent = () => (
    <div className="p-4 sm:p-6 pb-32">
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent mb-6 sm:mb-8">
        Leaderboard
      </h2>
      <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-200 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Coming Soon!</h3>
        <p className="text-slate-600 text-sm sm:text-base">Compete with other learners and climb the ranks</p>
      </div>
    </div>
  );

  // Profile Tab Content
  const ProfileContent = () => (
    <div className="p-4 sm:p-6 pb-32 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
          Profile
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="p-2 sm:p-3 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
          </button>
          
          {showProfileDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-10">
              <button className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
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

      {quizelo.isConnected ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg sm:text-xl mb-3">Connected Wallet</h3>
              <div className="bg-slate-100 rounded-xl p-3 sm:p-4">
                <p className="text-slate-600 text-xs sm:text-sm mb-1">Address</p>
                <p className="font-mono text-slate-800 font-medium text-sm sm:text-base">{formatAddress(quizelo.address)}</p>
              </div>
            </div>
          </div>

          {quizelo.userInfo && (
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
              <h4 className="font-bold text-slate-800 text-base sm:text-lg mb-3 sm:mb-4 flex items-center space-x-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                <span>Quiz Statistics</span>
              </h4>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm sm:text-base">Today's quizzes</span>
                  <span className="font-bold text-slate-800 text-sm sm:text-base">{quizelo.userInfo.dailyCount}/{quizelo.maxDailyQuizzes}</span>
                </div>
                <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm sm:text-base">Won today</span>
                  <span className={`font-bold text-sm sm:text-base ${quizelo.userInfo.wonToday ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {quizelo.userInfo.wonToday ? 'Yes ✨' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium text-sm sm:text-base">Can take quiz</span>
                  <span className={`font-bold text-sm sm:text-base ${quizelo.userInfo.canQuiz ? 'text-emerald-600' : 'text-red-500'}`}>
                    {quizelo.userInfo.canQuiz ? 'Yes ✅' : 'No ❌'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-200 text-center hover:shadow-md transition-all">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg sm:text-xl mb-3">No Wallet Connected</h3>
          <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">Connect your wallet to view your profile and start earning</p>
          <button
            onClick={() => setShowConnectWallet(true)}
            className="px-6 sm:px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Main Content */}
      <div className="min-h-screen">
        {showResults ? (
          <ResultsPage />
        ) : isInQuiz ? (
          <QuizInterface />
        ) : (
          <>
            {activeTab === 'home' && <HomeContent />}
            {activeTab === 'leaderboard' && <LeaderboardContent />}
            {activeTab === 'profile' && <ProfileContent />}
          </>
        )}
      </div>

      {/* Start Quiz FAB */}
      {!isInQuiz && !showResults && (
        <button
          onClick={() => setShowTopicModal(true)}
          disabled={quizelo.isLoading || aiLoading || !quizelo.userInfo?.canQuiz}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full shadow-xl flex items-center justify-center hover:from-violet-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 transform hover:scale-110 active:scale-95"
        >
          {quizelo.isLoading || aiLoading ? (
            <LoadingSpinner size={6} color="text-white" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" />
          )}
        </button>
      )}

      {/* Bottom Navigation */}
      {!isInQuiz && !showResults && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 z-20">
          <div className="flex justify-around max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center space-y-1 sm:space-y-2 py-2 px-3 sm:px-4 rounded-2xl transition-all ${
                activeTab === 'home' 
                  ? 'bg-gradient-to-r from-violet-100 to-emerald-100 text-violet-600' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs font-semibold">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex flex-col items-center space-y-1 sm:space-y-2 py-2 px-3 sm:px-4 rounded-2xl transition-all ${
                activeTab === 'leaderboard' 
                  ? 'bg-gradient-to-r from-violet-100 to-emerald-100 text-violet-600' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs font-semibold">Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-1 sm:space-y-2 py-2 px-3 sm:px-4 rounded-2xl transition-all ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-r from-violet-100 to-emerald-100 text-violet-600' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs font-semibold">Profile</span>
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
    </div>
  );
};

export default QuizeloApp;