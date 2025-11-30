'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { celo } from 'viem/chains';
import { useSwitchChain, useChainId, useAccount } from 'wagmi';

// Hooks
import { useQuizelo } from '../hooks/useQuizelo';
import { useTopics, TopicWithMetadata } from '../hooks/useTopics';
import { useAI } from '../hooks/useAI';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAppContext } from '../contexts/AppContext';
import { useSDK } from '../hooks/useSDK';
import { useAutoConnect } from '../hooks/useAutoConnect';

// Components - Pages
import { HomeContent } from './pages/HomeContent';
import { LeaderboardContent } from './pages/LeaderboardContent';
import { ProfileContent } from './pages/ProfileContent';
import { QuizInterface } from './pages/QuizInterface';
import { ResultsPage } from './pages/ResultsPage';

// Components - Modals
import {
  FeeCurrencyModal,
  QuizInfoModal,
  QuizGenerationModal,
  TransactionModal,
  NetworkCheckModal,
  ConnectWalletModal,
  TopicModal,
} from './modals';

// Components - Navigation
import { BottomNavigation, StartQuizButton } from './navigation';

// Components - UI
import { LoadingSpinner } from './ui/LoadingSpinner';
import { StatusDisplay } from './StatusDisplay';

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

const QuizeloApp = () => {
  // State Management
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
  const [transactionErrorMessage, setTransactionErrorMessage] = useState('');
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
  const [showFeeCurrencyModal, setShowFeeCurrencyModal] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkingActiveSession, setCheckingActiveSession] = useState(false);
  const [dismissedResumeSession, setDismissedResumeSession] = useState<string | null>(null);

  // Hooks
  const quizelo = useQuizelo();
  const { topics, selectedTopic, selectTopic } = useTopics();
  const { generateQuestions, loading: aiLoading, error: aiError, questions, markAnswer, calculateScore } = useAI();
  const { } = useLeaderboard();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const { addError, setContractStatus, setAccountStatus } = useAppContext();
  const { address, isConnected } = useAccount();
  
  // SDK and Auto-connect
  const { context, isSDKLoaded, isMiniApp, isInFarcaster } = useSDK();
  const { isMiniPayWallet } = useAutoConnect({
    isSDKLoaded,
    isMiniApp,
    isInFarcaster,
    isConnected,
    context,
  });

  // Refs for preventing duplicate modals
  const hasShownConnectModal = useRef(false);
  const hasShownFeeCurrencyModal = useRef(false);

  // Update account status in context
  useEffect(() => {
    setAccountStatus({
      isConnected,
      address: address || null,
      chainId: chainId || null,
      userInfo: quizelo.userInfo ? {
        dailyCount: quizelo.userInfo.dailyCount,
        lastQuiz: quizelo.userInfo.lastQuizTime,
        nextQuizTime: quizelo.userInfo.nextQuizTime,
        wonToday: quizelo.userInfo.wonToday,
        canQuiz: quizelo.userInfo.canQuiz,
      } : null,
      userStats: quizelo.userStats ? {
        totalQuizzes: quizelo.userStats.totalQuizzes,
        totalEarnings: quizelo.userStats.totalEarnings,
        bestScore: quizelo.userStats.bestScore,
        averageScore: quizelo.userStats.averageScore,
        currentStreak: quizelo.userStats.currentStreak,
        longestStreak: quizelo.userStats.longestStreak,
        totalWins: quizelo.userStats.totalWins,
        lastActivity: quizelo.userStats.lastActivity,
      } : null,
      isLoading: quizelo.isLoading,
      error: networkError || null,
    });
  }, [isConnected, address, chainId, networkError, quizelo.userInfo, quizelo.userStats, quizelo.isLoading, setAccountStatus]);
  
  // Update contract status in context
  useEffect(() => {
    if (quizelo.contractStats) {
      setContractStatus({
        isOperational: quizelo.contractStats.operational,
        balance: quizelo.contractStats.balance,
        minBalance: quizelo.contractStats.minBalance,
        activeQuizCount: quizelo.contractStats.activeQuizCount,
        totalQuizzes: quizelo.contractStats.totalQuizzes,
        totalRewards: quizelo.contractStats.totalRewards,
        totalFees: quizelo.contractStats.totalFees,
        isLoading: quizelo.isLoading,
        error: quizelo.error || null,
      });
    }
  }, [quizelo.contractStats, quizelo.isLoading, quizelo.error, setContractStatus]);
  
  // Show errors in context
  useEffect(() => {
    if (quizelo.error) {
      addError(quizelo.error, 'error');
    }
  }, [quizelo.error, addError]);
  
  useEffect(() => {
    if (aiError) {
      addError(aiError, 'warning');
    }
  }, [aiError, addError]);
  
  useEffect(() => {
    if (networkError) {
      addError(networkError, 'error');
    }
  }, [networkError, addError]);

  // Handle answer selection
  const handleAnswer = useCallback((answerIndex: number) => {
    if (isAnswered || isTimeUp) return;
    
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

  // Timer effect for quiz questions
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
    } else if (address && !quizelo.isConnected) {
      // Wallet is connected but quizelo hook hasn't detected it yet
    } else if (!address && !quizelo.isConnected && !isMiniApp) {
      setShowConnectWallet(true);
    } else if (address && quizelo.isConnected) {
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
      setShowConnectWallet(true);
    }
  }, [address, quizelo.isConnected, isMiniApp, isConnected, isInFarcaster, quizelo]);

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
    
    // Clear any active session when starting new quiz
    setActiveSessionId(null);
    setDismissedResumeSession(null);
    sessionStorage.removeItem('quizelo_active_session');
    
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

  const startQuizFlow = useCallback(async (topic = selectedTopic, token?: string, betAmount?: bigint) => {
    if (!topic) {
      console.error('No topic provided to startQuizFlow');
      setTimeout(() => setShowTopicModal(true), 0);
      return;
    }
    
    // Double check network before starting
    if (chainId !== celo.id) {
      setShowNetworkModal(true);
      await switchToCelo();
      return;
    }

    if (!token || !betAmount) {
      console.error('Token and bet amount required');
      return;
    }

    try {
      // Clear previous error
      setTransactionErrorMessage('');
      
      // Show transaction modal immediately
      setShowTransactionModal(true);
      setTransactionStatus('pending');
      setCurrentTxHash('');
      
      // Start the quiz flow with callbacks for approval steps
      let approvalHash: string | null = null;
      const result = await quizelo.startQuiz(
        token, 
        betAmount,
        // onApprovalNeeded callback
        () => {
          setTransactionStatus('pending');
          setCurrentTxHash('');
          setTransactionErrorMessage('');
        },
        // onApprovalComplete callback - approval hash will be set by startQuiz
        (hash?: string) => {
          if (hash) {
            approvalHash = hash;
            setCurrentTxHash(hash);
          }
          setTransactionStatus('pending');
          setTransactionErrorMessage('');
        }
      );
      
      // Update transaction hash if available (from startQuiz transaction)
      if (quizelo.txHash) {
        setCurrentTxHash(quizelo.txHash);
      } else if (approvalHash) {
        // If we only have approval hash, keep showing it
        setCurrentTxHash(approvalHash);
      }
      
      if (result.success) {
        setQuizSessionId(result.sessionId);
        setTransactionStatus('success');
        setTransactionErrorMessage('');
        
        // Clear any previous active session and dismissed resume
        setActiveSessionId(null);
        setDismissedResumeSession(null);
        
        // Store session in sessionStorage to track active session
        if (result.sessionId) {
          sessionStorage.setItem('quizelo_active_session', result.sessionId);
        }
        
        // Wait a bit for user to see success, then proceed
        setTimeout(() => {
          setShowTransactionModal(false);
          setShowQuizGeneration(true);
          
          // Generate questions after transaction is confirmed
          generateQuestions(topic).then(() => {
            setShowQuizGeneration(false);
            // IMPORTANT: Set quiz state BEFORE setting isInQuiz to ensure quiz interface shows
            setShowResults(false);
            setCurrentQuestionIndex(0);
            setUserAnswers([]);
            setTimeLeft(15);
            setIsAnswered(false);
            setIsTimeUp(false);
            // Set isInQuiz last to trigger quiz interface render
            setIsInQuiz(true);
          }).catch((error) => {
            console.error('Error generating questions:', error);
            setShowQuizGeneration(false);
            // Clear session storage if questions failed to generate
            sessionStorage.removeItem('quizelo_active_session');
            // Show error but don't block the flow
          });
        }, 1500);
      } else {
        // Get error message from quizelo hook
        const errorMsg = quizelo.error || 'Failed to start quiz. Please try again.';
        setTransactionErrorMessage(errorMsg);
        setTransactionStatus('error');
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setTransactionErrorMessage(errorMsg);
      setTransactionStatus('error');
    }
  }, [selectedTopic, chainId, switchToCelo, quizelo, generateQuestions]);

  const handleStartQuiz = useCallback(async (token: string, betAmount: bigint) => {
    setShowQuizInfo(false);
    
    if (!selectedTopic) {
      console.error('No topic selected when trying to start quiz');
      setTimeout(() => setShowTopicModal(true), 0);
      return;
    }
    
    await startQuizFlow(selectedTopic, token, betAmount);
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
    }
  }, [quizSessionId, finalScore, quizelo]);

  const handleRetakeQuiz = useCallback(() => {
    setShowResults(false);
    setQuizSessionId(null);
    setFinalScore(null);
    setShowTopicModal(true);
  }, []);

  // Handle wallet connection state and fee currency selection
  useEffect(() => {
    if (!isSDKLoaded) {
      setShowConnectWallet(false);
      return;
    }

    if (isMiniApp && isInFarcaster) {
      setShowConnectWallet(false);
      hasShownConnectModal.current = false;
      return;
    }

    if (isConnected) {
      setShowConnectWallet(false);
      hasShownConnectModal.current = false;
      return;
    }

    if (!isConnected && !hasShownConnectModal.current) {
      const timer = setTimeout(() => {
        if (!isConnected) {
          setShowConnectWallet(true);
          hasShownConnectModal.current = true;
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isMiniApp, isInFarcaster, isSDKLoaded]);

  // Separate effect for fee currency modal
  useEffect(() => {
    if (
      isConnected && 
      isSDKLoaded && 
      !quizelo.selectedToken && 
      quizelo.supportedTokens.length > 0 && 
      !showFeeCurrencyModal &&
      !hasShownFeeCurrencyModal.current
    ) {
      const timer = setTimeout(() => {
        setShowFeeCurrencyModal(true);
        hasShownFeeCurrencyModal.current = true;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isSDKLoaded, quizelo.selectedToken, quizelo.supportedTokens.length, showFeeCurrencyModal]);

  // Initialize app when SDK is loaded
  useEffect(() => {
    if (!isSDKLoaded) return;
    
    const initializeApp = async () => {
      try {
        const promises = [];
        
        if (quizelo.refetchContractStats) {
          promises.push(
            quizelo.refetchContractStats().catch(() => null)
          );
        }
        
        if (isConnected && address) {
          if (quizelo.refetchUserInfo) {
            promises.push(
              quizelo.refetchUserInfo().catch(() => null)
            );
          }
          
          if (quizelo.refetchActiveQuizTakers) {
            promises.push(
              quizelo.refetchActiveQuizTakers().catch(() => null)
            );
          }
        }
        
        await Promise.all(promises);
      } catch (error) {
        console.warn('Failed to initialize app:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      initializeApp();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isSDKLoaded, isConnected, address, quizelo.refetchContractStats, quizelo.refetchUserInfo, quizelo.refetchActiveQuizTakers, quizelo]);

  // Additional effect to load data when connection status changes
  useEffect(() => {
    if (isSDKLoaded && isConnected && address) {
      const loadUserData = async () => {
        try {
          await Promise.all([
            quizelo.refetchUserInfo?.().catch(() => null),
            quizelo.refetchActiveQuizTakers?.().catch(() => null),
            quizelo.refetchUserStats?.().catch(() => null)
          ]);
        } catch (error) {
          console.warn('Failed to load user data:', error);
        }
      };
      
      const timeoutId = setTimeout(() => {
        loadUserData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isSDKLoaded, isConnected, address, quizelo.refetchUserInfo, quizelo.refetchActiveQuizTakers, quizelo.refetchUserStats, quizelo]);

  // Check for active quiz session on mount and when activeQuizTakers changes
  // Only show resume if user is in the same browser session (not after refresh/leave)
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!isConnected || !address || !quizelo.activeQuizTakers || quizelo.activeQuizTakers.length === 0) {
        setActiveSessionId(null);
        return;
      }

      // Check if user has an in-memory session (same browser session)
      // If they refreshed or left, don't show resume option
      const storedSessionId = sessionStorage.getItem('quizelo_active_session');
      if (!storedSessionId) {
        // User refreshed or left - don't show resume
        setActiveSessionId(null);
        return;
      }

      // Prevent concurrent checks
      if (checkingActiveSession) return;
      setCheckingActiveSession(true);

      try {
        // Check each active session to find one belonging to current user
        for (const sessionId of quizelo.activeQuizTakers) {
          // Only check the session that matches stored session
          if (sessionId !== storedSessionId) continue;
          
          const session = await quizelo.getQuizSession(sessionId);
          if (session && session.user.toLowerCase() === address.toLowerCase() && session.active && !session.claimed) {
            const now = Math.floor(Date.now() / 1000);
            if (session.expiryTime > now) {
              // Found active session for this user and it matches stored session
              // Only show if not dismissed
              if (dismissedResumeSession !== sessionId) {
                setActiveSessionId(sessionId);
              }
              setCheckingActiveSession(false);
              return;
            }
          }
        }
        // No active session found or doesn't match stored session
        setActiveSessionId(null);
        sessionStorage.removeItem('quizelo_active_session');
      } catch (error) {
        console.warn('Failed to check active session:', error);
        setActiveSessionId(null);
        sessionStorage.removeItem('quizelo_active_session');
      } finally {
        setCheckingActiveSession(false);
      }
    };

    // Only check if not already checking
    if (!checkingActiveSession) {
      checkActiveSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, quizelo.activeQuizTakers, quizelo.getQuizSession, dismissedResumeSession]);

  // Resume quiz function
  const handleResumeQuiz = useCallback(async () => {
    if (!activeSessionId || !selectedTopic) return;

    try {
      setShowQuizGeneration(true);
      
      // Generate questions for the topic
      await generateQuestions(selectedTopic);
      
      setShowQuizGeneration(false);
      // Set quiz state
      setQuizSessionId(activeSessionId);
      setShowResults(false);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setTimeLeft(15);
      setIsAnswered(false);
      setIsTimeUp(false);
      // Set isInQuiz last to trigger quiz interface render
      setIsInQuiz(true);
    } catch (error) {
      console.error('Error resuming quiz:', error);
      setShowQuizGeneration(false);
      // Clear session if resume fails
      sessionStorage.removeItem('quizelo_active_session');
      setActiveSessionId(null);
    }
  }, [activeSessionId, selectedTopic, generateQuestions]);

  // Dismiss resume quiz
  const handleDismissResume = useCallback(() => {
    if (activeSessionId) {
      setDismissedResumeSession(activeSessionId);
      setActiveSessionId(null);
      // Clear session storage so it won't show again
      sessionStorage.removeItem('quizelo_active_session');
    }
  }, [activeSessionId]);

  // Clear session storage when quiz is completed or user leaves quiz
  useEffect(() => {
    if (showResults || (!isInQuiz && quizSessionId)) {
      // Quiz completed or user left - clear session storage
      sessionStorage.removeItem('quizelo_active_session');
      setActiveSessionId(null);
    }
  }, [showResults, isInQuiz, quizSessionId]);

  // Clear session storage on page unload (user leaves/refreshes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('quizelo_active_session');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
 
  // Loading screen for SDK
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
      {/* Main Content */}
      <div className="min-h-screen w-full mobile-container pb-32 sm:pb-40">
        {showResults ? (
          <ResultsPage
            finalScore={finalScore!}
            selectedTopic={selectedTopic}
            isLoading={quizelo.isLoading}
            onClaimReward={handleClaimReward}
            onRetakeQuiz={handleRetakeQuiz}
            onBackToHome={() => {
              setShowResults(false);
              setQuizSessionId(null);
              setFinalScore(null);
            }}
          />
        ) : isInQuiz ? (
          <QuizInterface
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            selectedTopic={selectedTopic}
            timeLeft={timeLeft}
            isAnswered={isAnswered}
            userAnswers={userAnswers}
            showQuestionResult={showQuestionResult}
            currentQuestionResult={currentQuestionResult}
            onAnswer={handleAnswer}
            onContinue={handleContinueToNext}
          />
        ) : (
          <div className="py-4 sm:py-6">
            {activeTab === 'home' && (
              <HomeContent 
                isMiniApp={isMiniApp}
                isInFarcaster={isInFarcaster}
                context={context}
                setShowConnectWallet={setShowConnectWallet}
                setShowTopicModal={setShowTopicModal}
                switchToCelo={switchToCelo}
                isSwitchingNetwork={isSwitchingNetwork}
                setShowFeeCurrencyModal={setShowFeeCurrencyModal}
                activeSessionId={activeSessionId}
                onResumeQuiz={handleResumeQuiz}
                onDismissResume={handleDismissResume}
                checkingActiveSession={checkingActiveSession}
                onStartQuizClick={() => setShowTopicModal(true)}
                isLoading={quizelo.isLoading}
                aiLoading={aiLoading}
                canQuiz={quizelo.userInfo ? quizelo.userInfo.canQuiz : true}
              />
            )}
            {activeTab === 'leaderboard' && <LeaderboardContent />}
            {activeTab === 'profile' && (
              <ProfileContent 
                isMiniApp={isMiniApp}
                isInFarcaster={isInFarcaster}
                context={context}
                showProfileDropdown={showProfileDropdown}
                setShowProfileDropdown={setShowProfileDropdown}
                setShowConnectWallet={setShowConnectWallet}
              />
            )}
          </div>
        )}
      </div>

      {/* Start Quiz Button - Only show outside Farcaster (for non-Farcaster users) */}
      {!isInQuiz && !showResults && !isInFarcaster && (
        <StartQuizButton
          onClick={() => setShowTopicModal(true)}
          isLoading={quizelo.isLoading}
          aiLoading={aiLoading}
          canQuiz={quizelo.userInfo ? quizelo.userInfo.canQuiz : true}
        />
      )}

      {/* Bottom Navigation */}
      {!isInQuiz && !showResults && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Status Display */}
      <StatusDisplay />
      
      {/* Modals */}
      <ConnectWalletModal
        isVisible={showConnectWallet}
        onClose={() => setShowConnectWallet(false)}
        isMiniApp={isMiniApp}
        isInFarcaster={isInFarcaster}
      />
      
      <TopicModal
        isVisible={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        topics={topics}
        onSelectTopic={handleTopicSelect}
      />
      
      <QuizGenerationModal 
        isVisible={showQuizGeneration} 
        topic={selectedTopic} 
      />
      
      <TransactionModal 
        isVisible={showTransactionModal}
        status={transactionStatus}
        txHash={currentTxHash}
        errorMessage={transactionErrorMessage}
        onClose={() => {
          setShowTransactionModal(false);
          setTransactionErrorMessage('');
        }}
      />
      
      <NetworkCheckModal 
        showNetworkModal={showNetworkModal}
        isSwitchingNetwork={isSwitchingNetwork} 
        networkError={networkError} 
        switchToCelo={switchToCelo}
        setShowNetworkModal={setShowNetworkModal}
      />
      
      <QuizInfoModal 
        isVisible={showQuizInfo}
        onClose={() => setShowQuizInfo(false)}
        onStart={handleStartQuiz}
        isLoading={quizelo.isLoading}
      />
      
      <FeeCurrencyModal
        isVisible={showFeeCurrencyModal}
        onSelect={(tokenAddress) => {
          quizelo.setSelectedToken(tokenAddress);
          setShowFeeCurrencyModal(false);
        }}
        onClose={() => setShowFeeCurrencyModal(false)}
        supportedTokens={quizelo.supportedTokens}
        isMiniPayWallet={isMiniPayWallet}
      />
    </div>
  );
};

export default QuizeloApp;
