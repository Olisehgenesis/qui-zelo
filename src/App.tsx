import { useState, useEffect } from 'react';
import { Trophy, Play, ArrowRight, CheckCircle, XCircle, Coins, Loader, Home, RefreshCw, Clock, Wallet, Network } from 'lucide-react';
import { useAI, Topic as AITopic } from './hooks/useAI';
import { useQuizelo } from './hooks/useQuizelo';
import { useTopics, TopicWithMetadata } from './hooks/useTopics';
import Header from './components/Header';
import { sdk } from '@farcaster/frame-sdk';
import { formatEther } from 'viem';

interface QuizResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  userAnswer: number;
}

const QuizeloApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [initialTime] = useState(30);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Hooks
  const { topics, selectedTopic, selectTopic, clearSelection } = useTopics();
  const { questions, loading: aiLoading, error: aiError, generateQuestions, markAnswer, calculateScore, resetQuiz } = useAI();
  
  // Contract integration
  const {
    address,
    isLoading: contractLoading,
    error: contractError,
    success: contractSuccess,
    userInfo,
    contractStats,
    isConnected,
    isOnCorrectNetwork,
    currentChainId,
    targetChainId,
    startQuiz,
    claimReward,
    switchToCorrectNetwork,
    canTakeQuiz,
    hasReachedDailyLimit,
    timeUntilNextQuiz,
    formatEther,
    quizFee,
    quizDuration,
    cooldownPeriod,
    maxDailyQuizzes,
    minContractBalance
  } = useQuizelo();

  // Call ready when the app is mounted
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
      }
    };
    
    initializeApp();
  }, []);

  // Enhanced countdown timer effect
  useEffect(() => {
    if (currentScreen === 'quiz' && !showExplanation && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-mark wrong answer when time runs out
            if (!showExplanation) {
              handleAnswer(-1); // Pass -1 to indicate time ran out
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentScreen, currentQuestion, showExplanation, timeLeft, questions.length]);

  const handleTopicSelect = async (topic: TopicWithMetadata) => {
    selectTopic(topic);
    
    // Check if user can take quiz
    if (!canTakeQuiz) {
      alert('You cannot take a quiz right now. Please check your daily limit or cooldown period.');
      return;
    }
    
    try {
      // Convert our Topic to AITopic format
      const aiTopic: AITopic = {
        title: topic.title,
        description: topic.description
      };
      
      // Generate questions with AI first
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
      await generateQuestions(aiTopic, apiKey);
      
      // Start quiz on blockchain (this pays the fee and creates session)
      const { success, sessionId } = await startQuiz();
      
      if (success && sessionId) {
        setCurrentSessionId(sessionId);
        setCurrentScreen('quiz');
        setCurrentQuestion(0);
        setUserAnswers([]);
        setShowExplanation(false);
        setQuizResults([]);
        setTimeLeft(30);
      } else {
        alert('Failed to start quiz. Please try again.');
      }
    } catch (err) {
      alert(`Failed to start quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);

    const result = markAnswer(currentQuestion, answerIndex);
    if (result) {
      const newResults = [...quizResults];
      newResults[currentQuestion] = result;
      setQuizResults(newResults);
    }
    
    setShowExplanation(true);
    setTimeLeft(0);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
      setTimeLeft(30);
    } else {
      setCurrentScreen('results');
    }
  };

  const handleRestart = () => {
    setUserAnswers([]);
    setQuizResults([]);
    setCurrentQuestion(0);
    setShowExplanation(false);
    setCurrentSessionId(null);
    resetQuiz();
    clearSelection();
    setCurrentScreen('home');
  };

  const handleClaimReward = async () => {
    const score = calculateScore(userAnswers);
    
    if (!currentSessionId) {
      alert('No active quiz session found');
      return;
    }
    
    try {
      // Submit final score to contract
      await claimReward(currentSessionId, score.percentage);
      setCurrentSessionId(null);
    } catch (err) {
      console.error('Failed to claim reward:', err);
      alert('Failed to submit quiz results. Please try again.');
    }
  };

  // Calculate countdown percentage for animations
  const countdownPercentage = (timeLeft / initialTime) * 100;
  const isTimeRunningOut = timeLeft <= 5;

  // Calculate potential earnings
  const calculateEarnings = () => {
    if (!userInfo) return '0.0';
    
    const score = calculateScore(userAnswers);
    if (score.percentage < 60) return '0.0'; // Money lost
    
    // This is simplified - in reality it depends on hasWonToday and random factors
    if (userInfo.wonToday) {
      return '0.7'; // Max for subsequent wins
    } else {
      // First win: 0.6-1.0 CELO (we'll show average)
      return '0.8';
    }
  };

  // Render wallet connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Header />
        <main className="pt-16">
          <div className="flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
              <div className="mb-8">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Connect Wallet</h1>
                <p className="text-gray-600">Connect your wallet to start earning rewards with Quizelo</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl p-6 text-white mb-6">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Learn & Earn on Celo</h3>
                <p className="text-sm opacity-90">Complete AI-generated quizzes and earn CELO rewards</p>
              </div>
              
              <div className="text-xs text-gray-500">
                Please connect your wallet using the wallet button in the header
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render network switch prompt
  if (!isOnCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Header />
        <main className="pt-16">
          <div className="flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
              <div className="mb-8">
                <Network className="w-16 h-16 mx-auto mb-4 text-orange-600" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Wrong Network</h1>
                <p className="text-gray-600">Please switch to the correct network to continue</p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl p-6 text-white mb-6">
                <h3 className="font-semibold mb-2">Network Required</h3>
                <p className="text-sm opacity-90">
                  Current: Chain {currentChainId}<br />
                  Required: Chain {targetChainId}
                </p>
              </div>
              
              <button
                onClick={switchToCorrectNetwork}
                disabled={contractLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-2xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {contractLoading ? 'Switching...' : 'Switch Network'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />
      <main className="pt-16">
        {/* Status Messages */}
        {contractError && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-red-100 border border-red-400 rounded-xl text-red-800 text-center">
            ❌ {contractError}
          </div>
        )}
        
        {contractSuccess && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-green-100 border border-green-400 rounded-xl text-green-800 text-center">
            ✅ {contractSuccess}
          </div>
        )}

        {currentScreen === 'home' && (
          <div className="flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🌱</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Quizelo</h1>
                <p className="text-gray-600">Master Celo with AI-powered quizzes</p>
              </div>
              
              {/* User Info */}
              {userInfo && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <h3 className="font-semibold text-gray-800 mb-3">Today's Status</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Daily Quizzes</div>
                      <div className="font-bold text-gray-800">
                        {userInfo.dailyCount}/{maxDailyQuizzes}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Won Today</div>
                      <div className="font-bold text-gray-800">{userInfo.wonToday ? 'Yes 🎉' : 'Not yet'}</div>
                    </div>
                  </div>
                  
                  {timeUntilNextQuiz > 0 && (
                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500">Next quiz in:</div>
                      <div className="font-bold text-orange-600">
                        {Math.floor(timeUntilNextQuiz / 60)}m {timeUntilNextQuiz % 60}s
                      </div>
                    </div>
                  )}
                  
                  {hasReachedDailyLimit && (
                    <div className="mt-3 p-2 bg-yellow-100 rounded-lg text-center">
                      <div className="text-xs text-yellow-800">Daily limit reached!</div>
                      <div className="text-xs text-yellow-600">Come back tomorrow</div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Fee & Rewards Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <h3 className="font-semibold text-gray-800 mb-3">Quiz Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Fee:</span>
                    <span className="font-bold text-red-600">{quizFee ? formatEther(BigInt(quizFee)) : '0.5'} CELO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quiz Duration:</span>
                    <span className="font-bold text-gray-800">{Math.floor((quizDuration || 300) / 60)} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cooldown:</span>
                    <span className="font-bold text-gray-800">{Math.floor((cooldownPeriod || 1200) / 60)} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reward Range:</span>
                    <span className="font-bold text-green-600">0.6-1.0 CELO</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Score 60%+ to win • Below 60% = money lost
                </div>
              </div>

              {/* Contract Status */}
              {contractStats && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                  <h3 className="font-semibold text-gray-800 mb-3">Contract Status</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Balance</div>
                      <div className="font-bold text-gray-800">{formatEther(contractStats.balance)} CELO</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Active Quizzes</div>
                      <div className="font-bold text-gray-800">{contractStats.activeQuizCount}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      contractStats.operational ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${contractStats.operational ? 'bg-green-500' : 'bg-red-500'}`} />
                      {contractStats.operational ? 'Operational' : 'Insufficient Balance'}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl p-6 text-white">
                  <Trophy className="w-8 h-8 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Learn & Earn</h3>
                  <p className="text-sm opacity-90">Complete AI-generated quizzes and earn CELO rewards</p>
                </div>
                
                <button
                  onClick={() => setCurrentScreen('topics')}
                  disabled={!canTakeQuiz || aiLoading || contractLoading}
                  className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105 ${
                    canTakeQuiz && !aiLoading && !contractLoading
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5" />
                  {!canTakeQuiz ? 'Cannot Take Quiz' : aiLoading || contractLoading ? 'Loading...' : 'Start Quiz'}
                </button>
                
                {!canTakeQuiz && (
                  <div className="text-center text-sm text-red-600">
                    {hasReachedDailyLimit ? 'Daily limit reached' : timeUntilNextQuiz > 0 ? 'Cooldown active' : 'Check requirements'}
                  </div>
                )}
              </div>

              <div className="mt-8 text-xs text-gray-500">
                Powered by OpenAI & Celo • Min balance: {minContractBalance ? formatEther(BigInt(minContractBalance)) : '5'} CELO
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'topics' && (
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Topic</h2>
                <p className="text-gray-600">Select a Celo topic for your AI-generated quiz</p>
                {(aiLoading || contractLoading) && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    {aiLoading ? 'AI is generating 10 personalized questions...' : 'Starting quiz on blockchain...'}
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => !(aiLoading || contractLoading) && handleTopicSelect(topic)}
                    disabled={aiLoading || contractLoading || !canTakeQuiz}
                    className={`bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:scale-105 text-left ${
                      (aiLoading || contractLoading || !canTakeQuiz) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${topic.color} flex items-center justify-center text-2xl mb-4`}>
                      {topic.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{topic.title}</h3>
                    <p className="text-gray-600 text-sm">{topic.description}</p>
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </button>
              </div>
              
              {(aiError || contractError) && (
                <div className="mt-6 p-4 bg-red-50 rounded-2xl text-red-800 text-center">
                  <strong>Error:</strong> {aiError || contractError}
                  {selectedTopic && (
                    <button
                      onClick={() => handleTopicSelect(selectedTopic)}
                      className="ml-4 text-red-600 underline hover:text-red-800"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentScreen === 'quiz' && questions.length > 0 && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                {/* Enhanced Timer Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-500">
                      Question {currentQuestion + 1} of {questions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${isTimeRunningOut ? 'text-red-500' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isTimeRunningOut ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </div>

                  {/* Animated Countdown Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ease-linear ${
                          isTimeRunningOut 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-600'
                        }`}
                        style={{ 
                          width: `${countdownPercentage}%`,
                          transition: showExplanation ? 'none' : 'width 1s linear'
                        }}
                      />
                    </div>
                    
                    {/* Pulsing indicator when time is running out */}
                    {isTimeRunningOut && !showExplanation && (
                      <div className="absolute -top-1 -bottom-1 left-0 right-0 bg-red-200 rounded-full animate-ping opacity-30" />
                    )}
                  </div>

                  {/* Visual countdown indicator */}
                  {!showExplanation && (
                    <div className="flex justify-center mt-4">
                      <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl transition-all duration-300 ${
                        isTimeRunningOut 
                          ? 'border-red-500 text-red-500 bg-red-50 animate-bounce' 
                          : 'border-green-500 text-green-600 bg-green-50'
                      }`}>
                        {timeLeft}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar for Questions */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-8">{questions[currentQuestion].question}</h3>
                
                <div className="space-y-4 mb-8">
                  {questions[currentQuestion].options.map((option, index) => {
                    let buttonClass = "w-full p-4 text-left border-2 rounded-2xl transition-all hover:shadow-md ";
                    
                    if (!showExplanation) {
                      buttonClass += "border-gray-200 hover:border-green-300";
                    } else {
                      if (index === questions[currentQuestion].correctAnswer) {
                        buttonClass += "border-green-500 bg-green-50 text-green-700";
                      } else if (index === userAnswers[currentQuestion] && index !== questions[currentQuestion].correctAnswer) {
                        buttonClass += "border-red-500 bg-red-50 text-red-700";
                      } else {
                        buttonClass += "border-gray-200 opacity-60";
                      }
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => !showExplanation && handleAnswer(index)}
                        disabled={showExplanation || contractLoading}
                        className={buttonClass}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span>{option}</span>
                          {showExplanation && index === questions[currentQuestion].correctAnswer && (
                            <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                          )}
                          {showExplanation && index === userAnswers[currentQuestion] && index !== questions[currentQuestion].correctAnswer && (
                            <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {showExplanation && quizResults[currentQuestion] && (
                  <div className={`p-4 rounded-2xl mb-6 ${quizResults[currentQuestion].isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {quizResults[currentQuestion].isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-semibold ${quizResults[currentQuestion].isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {quizResults[currentQuestion].isCorrect ? 'Correct! 🎉' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{quizResults[currentQuestion].explanation}</p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                    disabled={contractLoading}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restart
                  </button>
                  
                  {showExplanation && (
                    <button
                      onClick={handleNext}
                      disabled={contractLoading}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                    >
                      {contractLoading ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : currentQuestion < questions.length - 1 ? (
                        'Next Question'
                      ) : (
                        'View Results'
                      )}
                      {!contractLoading && <ArrowRight className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'results' && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
                <div className="mb-8">
                  <div className="text-6xl mb-4">
                    {calculateScore(userAnswers).percentage >= 80 ? '🏆' : calculateScore(userAnswers).percentage >= 60 ? '🎉' : '📚'}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
                  <p className="text-gray-600">You scored {calculateScore(userAnswers).correct} out of {calculateScore(userAnswers).total} questions</p>
                </div>
                
                <div className="mb-8">
                  <div className="text-5xl font-bold text-green-600 mb-2">{calculateScore(userAnswers).percentage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${calculateScore(userAnswers).percentage}%` }}
                    />
                  </div>
                  
                  {/* Earnings Display */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                    <div className="text-lg font-bold text-gray-800 mb-1">
                      💰 Potential Earnings
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatEther(contractConfig.rewardAmount * BigInt(calculateScore(userAnswers).correct))} CELO
                    </div>
                    <div className="text-sm text-gray-600">
                      {calculateScore(userAnswers).correct} correct × {formatEther(contractConfig.rewardAmount)} CELO each
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className={`p-4 rounded-2xl ${calculateScore(userAnswers).percentage >= 80 ? 'bg-green-50 border border-green-200' : calculateScore(userAnswers).percentage >= 60 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <h3 className="font-semibold mb-2">
                      {calculateScore(userAnswers).percentage >= 80 ? '🌟 Excellent!' : calculateScore(userAnswers).percentage >= 60 ? '👍 Good Job!' : '💪 Keep Learning!'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {calculateScore(userAnswers).percentage >= 80 
                        ? 'Outstanding knowledge of Celo! You\'re ready to build on the platform.' 
                        : calculateScore(userAnswers).percentage >= 60 
                        ? 'Good understanding! Review the topics you missed to improve further.'
                        : 'Keep studying Celo concepts. Practice makes perfect!'}
                    </p>
                  </div>
                  
                  {calculateScore(userAnswers).percentage >= 70 && (
                    <button
                      onClick={handleClaimReward}
                      disabled={contractLoading}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 disabled:opacity-50"
                    >
                      {contractLoading ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Coins className="w-5 h-5" />
                      )}
                      {contractLoading ? 'Claiming...' : 'Claim Reward'}
                    </button>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentScreen('topics')}
                    disabled={contractLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                  >
                    Try Another Topic
                  </button>
                  
                  <button
                    onClick={handleRestart}
                    disabled={contractLoading}
                    className="flex-1 border-2 border-green-500 text-green-600 py-3 rounded-2xl font-semibold hover:bg-green-50 transition-all disabled:opacity-50"
                  >
                    Start Over
                  </button>
                </div>
                
                <div className="mt-8 text-xs text-gray-500">
                  Quiz powered by OpenAI • Built on Celo • Rewards via Smart Contract
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default QuizeloApp;