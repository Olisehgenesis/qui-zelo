import { useState, useEffect } from 'react';
import { 
  Trophy, Play, ArrowRight, CheckCircle, XCircle, Coins, Loader, 
  Home, RefreshCw, Clock, Wallet, Network, User, Settings, 
  Flame, Zap, Star, Award, Target, Brain, Menu, X
} from 'lucide-react';
import { useAI, Topic as AITopic } from './hooks/useAI';
import { useQuizelo } from './hooks/useQuizelo';
import { useTopics, TopicWithMetadata } from './hooks/useTopics';
import Header from './components/Header';
import { sdk } from '@farcaster/frame-sdk';

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
  const [timeLeft, setTimeLeft] = useState(30);
  const [initialTime] = useState(30);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);

  // Hooks
  const { topics, selectedTopic, selectTopic, clearSelection } = useTopics();
  const { questions, loading: aiLoading, error: aiError, generateQuestions, markAnswer, calculateScore, resetQuiz } = useAI();
  
  // Contract integration
  const {
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
    minContractBalance,
    address
  } = useQuizelo();

  // Initialize app
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

  // Timer effect
  useEffect(() => {
    if (currentScreen === 'quiz' && !showExplanation && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (!showExplanation) {
              handleAnswer(-1);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentScreen, currentQuestion, showExplanation, timeLeft, questions.length]);

  // Navigation Component
  const Navigation = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity ${showNavigation ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 to-black transform transition-transform ${showNavigation ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-orange-400">🔥 Navigation</h3>
            <button 
              onClick={() => setShowNavigation(false)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => { setCurrentScreen('home'); setShowNavigation(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${currentScreen === 'home' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:bg-orange-900'}`}
            >
              <Home className="w-5 h-5" />
              <span className="font-semibold">🏠 Home</span>
            </button>
            
            <button 
              onClick={() => { setCurrentScreen('profile'); setShowNavigation(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${currentScreen === 'profile' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:bg-orange-900'}`}
            >
              <User className="w-5 h-5" />
              <span className="font-semibold">👤 Profile</span>
            </button>
            
            <button 
              onClick={() => { setCurrentScreen('topics'); setShowNavigation(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${currentScreen === 'topics' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:bg-orange-900'}`}
            >
              <Brain className="w-5 h-5" />
              <span className="font-semibold">🧠 Quiz Topics</span>
            </button>

            {userInfo && userInfo.dailyCount > 0 && (
              <button 
                onClick={() => { setCurrentScreen('rewards'); setShowNavigation(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${currentScreen === 'rewards' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:bg-orange-900'}`}
              >
                <Award className="w-5 h-5" />
                <span className="font-semibold">🏆 My Rewards</span>
              </button>
            )}
          </div>

          {/* Quick Stats */}
          {userInfo && (
            <div className="mt-8 p-4 bg-gradient-to-r from-orange-900 to-red-900 rounded-xl border border-orange-700">
              <h4 className="text-orange-300 font-semibold mb-3">📊 Today's Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-orange-200">
                  <span>Quizzes:</span>
                  <span className="font-bold">{userInfo.dailyCount}/{maxDailyQuizzes}</span>
                </div>
                <div className="flex justify-between text-orange-200">
                  <span>Won Today:</span>
                  <span className="font-bold">{userInfo.wonToday ? '🎉 Yes' : '❌ No'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleTopicSelect = async (topic: TopicWithMetadata) => {
    selectTopic(topic);
    
    if (!canTakeQuiz) {
      alert('🚫 You cannot take a quiz right now. Check your daily limit or cooldown period.');
      return;
    }
    
    try {
      const aiTopic: AITopic = {
        title: topic.title,
        description: topic.description
      };
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
      await generateQuestions(aiTopic, apiKey);
      
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
        alert('❌ Failed to start quiz. Please try again.');
      }
    } catch (err) {
      alert(`❌ Failed to start quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      alert('❌ No active quiz session found');
      return;
    }
    
    try {
      await claimReward(currentSessionId, score.percentage);
      setCurrentSessionId(null);
      setCurrentScreen('rewards');
    } catch (err) {
      console.error('Failed to claim reward:', err);
      alert('❌ Failed to submit quiz results. Please try again.');
    }
  };

  const countdownPercentage = (timeLeft / initialTime) * 100;
  const isTimeRunningOut = timeLeft <= 5;

  // Wallet connection screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,165,0,0.1)_0%,_transparent_50%)]" />
        <Header />
        <Navigation />
        
        <main className="pt-20 relative z-10">
          <div className="flex items-center justify-center p-4 min-h-[80vh]">
            <div className="max-w-md w-full bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 text-center border border-orange-600">
              <div className="mb-8">
                <div className="relative">
                  <Wallet className="w-20 h-20 mx-auto mb-4 text-orange-400 animate-pulse" />
                  <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🔥</div>
                </div>
                <h1 className="text-4xl font-bold text-orange-400 mb-2">
                  Connect Wallet
                </h1>
                <p className="text-orange-200">Connect your wallet to start earning with Quizelo</p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-20 animate-pulse" />
                <Trophy className="w-10 h-10 mx-auto mb-3 relative z-10" />
                <h3 className="font-bold text-lg mb-2 relative z-10">🔥 Learn & Earn on Celo</h3>
                <p className="text-sm opacity-90 relative z-10">Complete AI-generated quizzes and earn CELO rewards</p>
              </div>
              
              <div className="text-xs text-orange-300 bg-orange-900 bg-opacity-30 p-3 rounded-lg">
                💡 Please connect your wallet using the wallet button in the header
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Wrong network screen
  if (!isOnCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,165,0,0.1)_0%,_transparent_50%)]" />
        <Header />
        <Navigation />
        
        <main className="pt-20 relative z-10">
          <div className="flex items-center justify-center p-4 min-h-[80vh]">
            <div className="max-w-md w-full bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 text-center border border-red-600">
              <div className="mb-8">
                <div className="relative">
                  <Network className="w-20 h-20 mx-auto mb-4 text-red-400 animate-pulse" />
                  <div className="absolute -top-2 -right-2 text-2xl animate-bounce">⚠️</div>
                </div>
                <h1 className="text-4xl font-bold text-red-400 mb-2">Wrong Network</h1>
                <p className="text-red-200">Please switch to the correct network to continue</p>
              </div>
              
              <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 text-white mb-6">
                <h3 className="font-bold text-lg mb-2">🌐 Network Required</h3>
                <p className="text-sm opacity-90">
                  Current: Chain {currentChainId}<br />
                  Required: Chain {targetChainId}
                </p>
              </div>
              
              <button
                onClick={switchToCorrectNetwork}
                disabled={contractLoading}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-2xl font-bold hover:from-red-700 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {contractLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Switch Network
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,165,0,0.1)_0%,_transparent_50%)]" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping opacity-20" />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-orange-500 rounded-full animate-pulse opacity-30" />
        <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-orange-300 rounded-full animate-bounce opacity-10" />
      </div>

      <Header />
      <Navigation />
      
      {/* Menu Button */}
      <button
        onClick={() => setShowNavigation(true)}
        className="fixed top-20 right-4 z-40 bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-full shadow-lg hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-110"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      <main className="pt-20 relative z-10">
        {/* Status Messages */}
        {contractError && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-gradient-to-r from-red-900 to-red-800 border border-red-600 rounded-xl text-red-200 text-center animate-pulse">
            ❌ {contractError}
          </div>
        )}
        
        {contractSuccess && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-gradient-to-r from-green-900 to-green-800 border border-green-600 rounded-xl text-green-200 text-center animate-pulse">
            ✅ {contractSuccess}
          </div>
        )}

        {/* HOME SCREEN */}
        {currentScreen === 'home' && (
          <div className="flex items-center justify-center p-4 min-h-[80vh]">
            <div className="max-w-md w-full bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 text-center border border-orange-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-900 to-red-900 opacity-10 animate-pulse" />
              
              <div className="mb-8 relative z-10">
                <div className="text-7xl mb-4 animate-bounce">🔥</div>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
                  Quizelo
                </h1>
                <p className="text-orange-300 text-lg font-semibold">Master Celo with AI-powered quizzes 🧠</p>
              </div>
              
              {/* User Info */}
              {userInfo && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-900 to-red-900 rounded-2xl border border-orange-700 relative z-10">
                  <h3 className="font-bold text-orange-300 mb-3 flex items-center justify-center gap-2">
                    <Target className="w-5 h-5" />
                    📊 Today's Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-orange-400 font-semibold">Daily Quizzes</div>
                      <div className="font-black text-white text-xl">
                        {userInfo.dailyCount}/{maxDailyQuizzes}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-400 font-semibold">Won Today</div>
                      <div className="font-black text-white text-xl">
                        {userInfo.wonToday ? '🎉' : '❌'}
                      </div>
                    </div>
                  </div>
                  
                  {timeUntilNextQuiz > 0 && (
                    <div className="mt-3 text-center p-2 bg-black bg-opacity-30 rounded-lg">
                      <div className="text-xs text-orange-400">⏰ Next quiz in:</div>
                      <div className="font-black text-orange-300 text-lg">
                        {Math.floor(timeUntilNextQuiz / 60)}m {timeUntilNextQuiz % 60}s
                      </div>
                    </div>
                  )}
                  
                  {hasReachedDailyLimit && (
                    <div className="mt-3 p-2 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg text-center border border-yellow-700">
                      <div className="text-yellow-300 font-bold">🚫 Daily limit reached!</div>
                      <div className="text-yellow-400 text-sm">Come back tomorrow for more 🌅</div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Details */}
              <div className="mb-6 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-600 relative z-10">
                <h3 className="font-bold text-orange-300 mb-3 flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5" />
                  💰 Quiz Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Entry Fee:</span>
                    <span className="font-black text-red-400">{quizFee ? formatEther(quizFee as bigint) : '0.5'} CELO 💸</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Duration:</span>
                    <span className="font-black text-orange-300">{Math.floor((quizDuration || 300) / 60)} minutes ⏱️</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Cooldown:</span>
                    <span className="font-black text-orange-300">{Math.floor((cooldownPeriod || 1200) / 60)} minutes ❄️</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rewards:</span>
                    <span className="font-black text-green-400">0.6-1.0 CELO 🎁</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center bg-black bg-opacity-30 p-2 rounded-lg">
                  🎯 Score 60%+ to win • Below 60% = money lost 💔
                </div>
              </div>

              {/* Contract Status */}
              {contractStats && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl border border-purple-700 relative z-10">
                  <h3 className="font-bold text-purple-300 mb-3 flex items-center justify-center gap-2">
                    <Settings className="w-5 h-5" />
                    🔧 Contract Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-purple-400">Balance</div>
                      <div className="font-black text-white">{formatEther(contractStats.balance)} CELO</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400">Active Quizzes</div>
                      <div className="font-black text-white">{contractStats.activeQuizCount}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                      contractStats.operational ? 'bg-green-800 text-green-300 border border-green-600' : 'bg-red-800 text-red-300 border border-red-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${contractStats.operational ? 'bg-green-400' : 'bg-red-400'}`} />
                      {contractStats.operational ? '🟢 Operational' : '🔴 Insufficient Balance'}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6 relative z-10">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-20 animate-pulse" />
                  <Flame className="w-10 h-10 mx-auto mb-3 animate-bounce relative z-10" />
                  <h3 className="font-black text-xl mb-2 relative z-10">🔥 Learn & Earn</h3>
                  <p className="text-sm opacity-90 relative z-10">Complete AI-generated quizzes and earn CELO rewards 🎯</p>
                </div>
                
                <button
                  onClick={() => setCurrentScreen('topics')}
                  disabled={!canTakeQuiz || aiLoading || contractLoading}
                  className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105 relative overflow-hidden ${
                    canTakeQuiz && !aiLoading && !contractLoading
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-2xl'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canTakeQuiz && !aiLoading && !contractLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-20 animate-pulse" />
                  )}
                  <Play className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">
                    {!canTakeQuiz ? '🚫 Cannot Take Quiz' : aiLoading || contractLoading ? '⏳ Loading...' : '🚀 Start Quiz'}
                  </span>
                </button>
                
                {!canTakeQuiz && (
                  <div className="text-center text-sm text-red-400 font-semibold bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700">
                    {hasReachedDailyLimit ? '🚫 Daily limit reached' : timeUntilNextQuiz > 0 ? '❄️ Cooldown active' : '⚠️ Check requirements'}
                  </div>
                )}
              </div>

              <div className="mt-8 text-xs text-orange-300 bg-black bg-opacity-30 p-3 rounded-lg border border-orange-800 relative z-10">
                🤖 Powered by OpenAI & Celo • Min balance: {minContractBalance ? formatEther(minContractBalance as bigint) : '5'} CELO
              </div>
            </div>
          </div>
        )}

        {/* PROFILE SCREEN */}
        {currentScreen === 'profile' && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 border border-orange-600">
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <User className="w-20 h-20 mx-auto mb-4 text-orange-400" />
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👤</div>
                  </div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
                    Your Profile
                  </h2>
                  <p className="text-orange-300">Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</p>
                </div>

                {userInfo && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-orange-900 to-red-900 rounded-2xl p-6 border border-orange-700">
                      <h3 className="text-orange-300 font-bold mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        📊 Today's Performance
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-orange-200">Quizzes Taken:</span>
                          <span className="font-black text-white">{userInfo.dailyCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-200">Won Today:</span>
                          <span className="font-black text-white">{userInfo.wonToday ? '🎉 Yes' : '❌ No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-200">Can Quiz:</span>
                          <span className="font-black text-white">{userInfo.canQuiz ? '✅ Ready' : '⏳ Wait'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 border border-purple-700">
                      <h3 className="text-purple-300 font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        ⏰ Timing Info
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-purple-200">Last Quiz:</span>
                          <span className="font-black text-white text-sm">
                            {userInfo.lastQuizTime > 0 ? new Date(userInfo.lastQuizTime * 1000).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-200">Next Available:</span>
                          <span className="font-black text-white text-sm">
                            {timeUntilNextQuiz > 0 ? `${Math.floor(timeUntilNextQuiz / 60)}m ${timeUntilNextQuiz % 60}s` : 'Now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setCurrentScreen('home')}
                    className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2 mx-auto font-semibold"
                  >
                    <Home className="w-4 h-4" />
                    🏠 Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REWARDS SCREEN */}
        {currentScreen === 'rewards' && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 border border-orange-600">
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <Award className="w-20 h-20 mx-auto mb-4 text-orange-400 animate-pulse" />
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🏆</div>
                  </div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
                    My Rewards
                  </h2>
                  <p className="text-orange-300">Track your earnings and achievements 💰</p>
                </div>

                {userInfo && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-2xl p-6 border border-green-700">
                      <h3 className="text-green-300 font-bold mb-4 flex items-center gap-2">
                        <Coins className="w-5 h-5" />
                        💰 Today's Earnings
                      </h3>
                      <div className="text-center">
                        <div className="text-4xl font-black text-green-400 mb-2">
                          {userInfo.wonToday ? '🎉 Won!' : '💔 No wins yet'}
                        </div>
                        <p className="text-green-200 text-sm">
                          {userInfo.wonToday ? 'Congratulations on your win today!' : 'Keep trying to earn your first reward!'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-2xl p-6 border border-yellow-700">
                      <h3 className="text-yellow-300 font-bold mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        📈 Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-black text-yellow-400">{userInfo.dailyCount}</div>
                          <div className="text-yellow-200 text-sm">Quizzes Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-yellow-400">{maxDailyQuizzes - userInfo.dailyCount}</div>
                          <div className="text-yellow-200 text-sm">Remaining</div>
                        </div>
                      </div>
                    </div>

                    {/* Claim Rewards Button - Show if user has won today */}
                    {userInfo.wonToday && currentSessionId && (
                      <button
                        onClick={handleClaimReward}
                        disabled={contractLoading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:from-yellow-700 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 animate-pulse" />
                        {contractLoading ? (
                          <>
                            <Loader className="w-6 h-6 animate-spin relative z-10" />
                            <span className="relative z-10">⏳ Claiming...</span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-6 h-6 relative z-10" />
                            <span className="relative z-10">🎁 Claim Reward</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setCurrentScreen('home')}
                    className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2 mx-auto font-semibold"
                  >
                    <Home className="w-4 h-4" />
                    🏠 Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOPICS SCREEN */}
        {currentScreen === 'topics' && (
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
                  🧠 Choose Your Topic
                </h2>
                <p className="text-orange-300 text-lg">Select a Celo topic for your AI-generated quiz 🎯</p>
                {(aiLoading || contractLoading) && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-orange-400 bg-orange-900 bg-opacity-30 p-4 rounded-xl border border-orange-700">
                    <Loader className="w-6 h-6 animate-spin" />
                    <span className="font-bold">
                      {aiLoading ? '🤖 AI is generating 10 personalized questions...' : '⛓️ Starting quiz on blockchain...'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => !(aiLoading || contractLoading) && handleTopicSelect(topic)}
                    disabled={aiLoading || contractLoading || !canTakeQuiz}
                    className={`bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:scale-105 text-left border border-orange-600 relative overflow-hidden ${
                      (aiLoading || contractLoading || !canTakeQuiz) ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-400'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-900 to-red-900 opacity-10" />
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${topic.color} flex items-center justify-center text-2xl mb-4 relative z-10 shadow-lg`}>
                      {topic.icon}
                    </div>
                    <h3 className="text-xl font-black text-orange-300 mb-2 relative z-10">{topic.title}</h3>
                    <p className="text-orange-200 text-sm relative z-10">{topic.description}</p>
                    <div className="absolute top-2 right-2 text-2xl opacity-50">🔥</div>
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2 mx-auto font-semibold"
                >
                  <Home className="w-4 h-4" />
                  🏠 Back to Home
                </button>
              </div>
              
              {(aiError || contractError) && (
                <div className="mt-6 p-4 bg-gradient-to-r from-red-900 to-red-800 rounded-2xl text-red-200 text-center border border-red-600">
                  <strong>💥 Error:</strong> {aiError || contractError}
                  {selectedTopic && (
                    <button
                      onClick={() => handleTopicSelect(selectedTopic)}
                      className="ml-4 text-red-400 underline hover:text-red-300 font-bold"
                    >
                      🔄 Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {currentScreen === 'quiz' && questions.length > 0 && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 border border-orange-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900 to-red-900 opacity-5" />
                
                {/* Enhanced Timer Section */}
                <div className="mb-6 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-orange-400 font-bold">
                      📝 Question {currentQuestion + 1} of {questions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-5 h-5 ${isTimeRunningOut ? 'text-red-500 animate-pulse' : 'text-orange-400'}`} />
                      <span className={`text-lg font-black ${isTimeRunningOut ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                        ⏰ {timeLeft}s
                      </span>
                    </div>
                  </div>

                  {/* Animated Countdown Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
                      <div 
                        className={`h-4 rounded-full transition-all duration-1000 ease-linear ${
                          isTimeRunningOut 
                            ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' 
                            : 'bg-gradient-to-r from-orange-600 to-red-600'
                        }`}
                        style={{ 
                          width: `${countdownPercentage}%`,
                          transition: showExplanation ? 'none' : 'width 1s linear'
                        }}
                      />
                    </div>
                    
                    {/* Pulsing indicator when time is running out */}
                    {isTimeRunningOut && !showExplanation && (
                      <div className="absolute -top-1 -bottom-1 left-0 right-0 bg-red-500 rounded-full animate-ping opacity-20" />
                    )}
                  </div>

                  {/* Visual countdown indicator */}
                  {!showExplanation && (
                    <div className="flex justify-center mt-6">
                      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl transition-all duration-300 ${
                        isTimeRunningOut 
                          ? 'border-red-500 text-red-400 bg-red-900 bg-opacity-30 animate-bounce shadow-red-500/50 shadow-lg' 
                          : 'border-orange-500 text-orange-400 bg-orange-900 bg-opacity-30 shadow-orange-500/50 shadow-lg'
                      }`}>
                        {timeLeft}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar for Questions */}
                <div className="w-full bg-gray-700 rounded-full h-3 mb-8 border border-gray-600 relative z-10">
                  <div 
                    className="bg-gradient-to-r from-orange-600 to-red-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
                
                <h3 className="text-2xl font-black text-orange-300 mb-8 relative z-10">
                  🤔 {questions[currentQuestion].question}
                </h3>
                
                <div className="space-y-4 mb-8 relative z-10">
                  {questions[currentQuestion].options.map((option, index) => {
                    let buttonClass = "w-full p-4 text-left border-2 rounded-2xl transition-all hover:shadow-lg font-semibold ";
                    
                    if (!showExplanation) {
                      buttonClass += "border-orange-600 bg-gradient-to-r from-gray-800 to-gray-900 text-orange-200 hover:border-orange-400 hover:from-orange-900 hover:to-red-900 transform hover:scale-105";
                    } else {
                      if (index === questions[currentQuestion].correctAnswer) {
                        buttonClass += "border-green-500 bg-gradient-to-r from-green-900 to-green-800 text-green-200 shadow-green-500/50 shadow-lg";
                      } else if (index === userAnswers[currentQuestion] && index !== questions[currentQuestion].correctAnswer) {
                        buttonClass += "border-red-500 bg-gradient-to-r from-red-900 to-red-800 text-red-200 shadow-red-500/50 shadow-lg";
                      } else {
                        buttonClass += "border-gray-600 bg-gray-800 text-gray-400 opacity-60";
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
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${
                            !showExplanation ? 'bg-orange-600 text-white' : 
                            index === questions[currentQuestion].correctAnswer ? 'bg-green-600 text-white' :
                            index === userAnswers[currentQuestion] && index !== questions[currentQuestion].correctAnswer ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1">{option}</span>
                          {showExplanation && index === questions[currentQuestion].correctAnswer && (
                            <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
                          )}
                          {showExplanation && index === userAnswers[currentQuestion] && index !== questions[currentQuestion].correctAnswer && (
                            <XCircle className="w-6 h-6 text-red-400 animate-pulse" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {showExplanation && quizResults[currentQuestion] && (
                  <div className={`p-6 rounded-2xl mb-6 border-2 relative z-10 ${
                    quizResults[currentQuestion].isCorrect 
                      ? 'bg-gradient-to-r from-green-900 to-green-800 border-green-600 shadow-green-500/50 shadow-lg' 
                      : 'bg-gradient-to-r from-red-900 to-red-800 border-red-600 shadow-red-500/50 shadow-lg'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {quizResults[currentQuestion].isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 animate-pulse" />
                      )}
                      <span className={`font-black text-lg ${
                        quizResults[currentQuestion].isCorrect ? 'text-green-200' : 'text-red-200'
                      }`}>
                        {quizResults[currentQuestion].isCorrect ? '🎉 Correct! Amazing!' : '💔 Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-200 font-medium">{quizResults[currentQuestion].explanation}</p>
                  </div>
                )}
                
                <div className="flex justify-between relative z-10">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2 font-bold hover:bg-orange-900 hover:bg-opacity-30 rounded-xl"
                    disabled={contractLoading}
                  >
                    <RefreshCw className="w-5 h-5" />
                    🔄 Restart
                  </button>
                  
                  {showExplanation && (
                    <button
                      onClick={handleNext}
                      disabled={contractLoading}
                      className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black flex items-center gap-3 hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 transform hover:scale-105 shadow-lg"
                    >
                      {contractLoading ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : currentQuestion < questions.length - 1 ? (
                        '➡️ Next Question'
                      ) : (
                        '🏁 View Results'
                      )}
                      {!contractLoading && <ArrowRight className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {currentScreen === 'results' && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 text-center border border-orange-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900 to-red-900 opacity-10 animate-pulse" />
                
                <div className="mb-8 relative z-10">
                  <div className="text-8xl mb-4 animate-bounce">
                    {calculateScore(userAnswers).percentage >= 80 ? '🏆' : 
                     calculateScore(userAnswers).percentage >= 60 ? '🎉' : '📚'}
                  </div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
                    Quiz Complete!
                  </h2>
                  <p className="text-orange-300 text-lg font-semibold">
                    You scored {calculateScore(userAnswers).correct} out of {calculateScore(userAnswers).total} questions 🎯
                  </p>
                </div>
                
                <div className="mb-8 relative z-10">
                  <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-4">
                    {calculateScore(userAnswers).percentage}%
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-6 border border-gray-600">
                    <div 
                      className="bg-gradient-to-r from-orange-600 to-red-600 h-6 rounded-full transition-all duration-2000 shadow-lg"
                      style={{ width: `${calculateScore(userAnswers).percentage}%` }}
                    />
                  </div>
                  
                  {/* Earnings Display */}
                  <div className="mt-6 p-6 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-2xl border border-yellow-700">
                    <div className="text-2xl font-black text-yellow-300 mb-2">
                      💰 Potential Earnings
                    </div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                      {calculateScore(userAnswers).percentage >= 60 ? '0.6-1.0' : '0'} CELO
                    </div>
                    <div className="text-sm text-yellow-200 mt-2">
                      {calculateScore(userAnswers).percentage >= 60 
                        ? `🎉 ${calculateScore(userAnswers).correct} correct answers qualify for rewards!`
                        : '💔 Need 60%+ to earn rewards'
                      }
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8 relative z-10">
                  <div className={`p-6 rounded-2xl border-2 ${
                    calculateScore(userAnswers).percentage >= 80 
                      ? 'bg-gradient-to-r from-green-900 to-green-800 border-green-600' 
                      : calculateScore(userAnswers).percentage >= 60 
                      ? 'bg-gradient-to-r from-yellow-900 to-orange-900 border-yellow-600' 
                      : 'bg-gradient-to-r from-red-900 to-red-800 border-red-600'
                  }`}>
                    <h3 className="font-black text-xl mb-3">
                      {calculateScore(userAnswers).percentage >= 80 ? '🌟 Excellent! Master Level!' : 
                       calculateScore(userAnswers).percentage >= 60 ? '👍 Good Job! Well Done!' : 
                       '💪 Keep Learning! Practice More!'}
                    </h3>
                    <p className="text-sm opacity-90">
                      {calculateScore(userAnswers).percentage >= 80 
                        ? '🚀 Outstanding knowledge of Celo! You\'re ready to build amazing things!' 
                        : calculateScore(userAnswers).percentage >= 60 
                        ? '📈 Good understanding! Review missed topics to reach mastery level.'
                        : '📖 Keep studying Celo concepts. Every expert was once a beginner!'}
                    </p>
                  </div>
                  
                  {calculateScore(userAnswers).percentage >= 60 && (
                    <button
                      onClick={handleClaimReward}
                      disabled={contractLoading}
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:from-yellow-700 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 relative overflow-hidden shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 animate-pulse" />
                      {contractLoading ? (
                        <>
                          <Loader className="w-6 h-6 animate-spin relative z-10" />
                          <span className="relative z-10">⏳ Claiming...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-6 h-6 relative z-10" />
                          <span className="relative z-10">🎁 Claim Reward</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex gap-4 relative z-10">
                  <button
                    onClick={() => setCurrentScreen('topics')}
                    disabled={contractLoading}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-2xl font-black hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 transform hover:scale-105"
                  >
                    🧠 Try Another Topic
                  </button>
                  
                  <button
                    onClick={handleRestart}
                    disabled={contractLoading}
                    className="flex-1 border-2 border-orange-600 text-orange-400 py-3 rounded-2xl font-black hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 transform hover:scale-105"
                  >
                    🔄 Start Over
                  </button>
                </div>
                
                <div className="mt-8 text-xs text-orange-300 bg-black bg-opacity-30 p-3 rounded-lg border border-orange-800 relative z-10">
                  🤖 Quiz powered by OpenAI • 🔗 Built on Celo • 💰 Rewards via Smart Contract
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