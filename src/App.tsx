import  { useState, useEffect } from 'react';
import { Trophy, Play, ArrowRight, CheckCircle, XCircle,  Coins, Loader, Home, RefreshCw, Clock } from 'lucide-react';
import { useAI, Topic as AITopic } from './hooks/useAI';
import Header from './components/Header';


interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface QuizResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  userAnswer: number;
}

// Mock hooks for demo - replace with your actual hooks in production
const useTopics = () => {
  const topics: Topic[] = [
    {
      id: 'celo-basics',
      title: 'Celo Basics',
      description: 'Learn about Celo blockchain fundamentals',
      icon: '🌱',
      color: 'from-green-400 to-emerald-600'
    },
    {
      id: 'mobile-defi',
      title: 'Mobile DeFi',
      description: 'Mobile-first decentralized finance on Celo',
      icon: '📱',
      color: 'from-blue-400 to-cyan-600'
    },
    {
      id: 'stable-coins',
      title: 'Stable Coins',
      description: 'cUSD, cEUR and Celo stablecoins',
      icon: '💰',
      color: 'from-yellow-400 to-orange-600'
    },
    {
      id: 'regenerative-finance',
      title: 'ReFi',
      description: 'Regenerative Finance and climate impact',
      icon: '🌍',
      color: 'from-emerald-400 to-teal-600'
    },
    {
      id: 'public-goods',
      title: 'Public Goods',
      description: 'Funding and supporting public goods on Celo',
      icon: '🏛️',
      color: 'from-purple-400 to-indigo-600'
    },
    {
      id: 'governance',
      title: 'Governance',
      description: 'Celo governance and community participation',
      icon: '⚖️',
      color: 'from-pink-400 to-rose-600'
    }
  ];

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  return {
    topics,
    selectedTopic,
    selectTopic: setSelectedTopic,
    clearSelection: () => setSelectedTopic(null)
  };
};

const QuizeloApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [initialTime] = useState(10);

  const { topics, selectedTopic, selectTopic, clearSelection } = useTopics();
  const { questions, loading, error, generateQuestions, markAnswer, calculateScore, resetQuiz } = useAI();

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

  const handleTopicSelect = async (topic: Topic) => {
    selectTopic(topic);
    try {
      // Convert our Topic to AITopic format
      const aiTopic: AITopic = {
        title: topic.title,
        description: topic.description
      };
      
      // Use your OpenAI API key here
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
      await generateQuestions(aiTopic, apiKey);
      
      setCurrentScreen('quiz');
      setCurrentQuestion(0);
      setUserAnswers([]);
      setShowExplanation(false);
      setQuizResults([]);
      setTimeLeft(10);
    } catch (err) {
      alert(`Failed to generate questions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAnswer = (answerIndex: number) => {
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
      setTimeLeft(10);
    } else {
      setCurrentScreen('results');
    }
  };

  const handleRestart = () => {
    setUserAnswers([]);
    setQuizResults([]);
    setCurrentQuestion(0);
    setShowExplanation(false);
    resetQuiz();
    clearSelection();
    setCurrentScreen('home');
  };

  const mintReward = () => {
    const score = calculateScore(userAnswers);
    alert(`🎉 Congratulations! You scored ${score.percentage}%\n\nIn a real app, this would mint your reward NFT on Celo blockchain!`);
  };

  // Calculate countdown percentage for animations
  const countdownPercentage = (timeLeft / initialTime) * 100;
  const isTimeRunningOut = timeLeft <= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />
      <main className="pt-16">
        {currentScreen === 'home' && (
          <div className="flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🌱</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Quizelo</h1>
                <p className="text-gray-600">Master Celo with AI-powered quizzes</p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl p-6 text-white">
                  <Trophy className="w-8 h-8 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Learn & Earn</h3>
                  <p className="text-sm opacity-90">Complete AI-generated quizzes and mint reward NFTs</p>
                </div>
                
                <button
                  onClick={() => setCurrentScreen('topics')}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  Start Quiz
                </button>
              </div>
              
              <div className="mt-8 text-xs text-gray-500">
                Powered by OpenAI & Celo
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
                {loading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    AI is generating 10 personalized questions...
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => !loading && handleTopicSelect(topic)}
                    disabled={loading}
                    className={`bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:scale-105 text-left ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 rounded-2xl text-red-800 text-center">
                  <strong>Error:</strong> {error}
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
                        disabled={showExplanation}
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
                        {quizResults[currentQuestion].isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{quizResults[currentQuestion].explanation}</p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restart
                  </button>
                  
                  {showExplanation && (
                    <button
                      onClick={handleNext}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      {currentQuestion < questions.length - 1 ? 'Next Question' : 'View Results'}
                      <ArrowRight className="w-5 h-5" />
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
                      onClick={mintReward}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105"
                    >
                      <Coins className="w-5 h-5" />
                      Mint Reward NFT
                    </button>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentScreen('topics')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                  >
                    Try Another Topic
                  </button>
                  
                  <button
                    onClick={handleRestart}
                    className="flex-1 border-2 border-green-500 text-green-600 py-3 rounded-2xl font-semibold hover:bg-green-50 transition-all"
                  >
                    Start Over
                  </button>
                </div>
                
                <div className="mt-8 text-xs text-gray-500">
                  Quiz powered by OpenAI • Built on Celo
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default QuizeloApp;