'use client';

import { Trophy, Coins, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TopicWithMetadata } from '../../hooks/useTopics';

interface ScoreResult {
  percentage: number;
  correct: number;
  total: number;
}

interface ResultsPageProps {
  finalScore: ScoreResult;
  selectedTopic: TopicWithMetadata | null;
  isLoading: boolean;
  onClaimReward: () => void;
  onRetakeQuiz: () => void;
  onBackToHome: () => void;
}

export const ResultsPage = ({
  finalScore,
  selectedTopic,
  isLoading,
  onClaimReward,
  onRetakeQuiz,
  onBackToHome,
}: ResultsPageProps) => {
  const getScoreEmoji = (percentage: number) => {
    if (percentage >= 90) return '👑';
    if (percentage >= 80) return '🏆';
    if (percentage >= 70) return '🥇';
    if (percentage >= 60) return '🎯';
    return '💪';
  };

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return 'LEGENDARY! 🌟';
    if (percentage >= 80) return 'AMAZING! 🎯';
    if (percentage >= 70) return 'GREAT JOB! 🚀';
    if (percentage >= 60) return 'WELL DONE! 💫';
    return 'KEEP GOING! 💪';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return '#7C65C1';
    if (percentage >= 60) return '#10b981';
    return '#6b7280';
  };

  return (
    <div className="fixed inset-0 bg-[#f7f7f7] overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Celebration Header - Retro Theme */}
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-6 sm:p-8 text-center relative z-[2]">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center mx-auto mb-4 sm:mb-6`} style={{ backgroundColor: getScoreBgColor(finalScore.percentage) }}>
                <span className="text-3xl sm:text-4xl">{getScoreEmoji(finalScore.percentage)}</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black text-[#050505] mb-2">
                🎊 Quest Complete!
              </h1>
              
              <p className="text-[#6b7280] text-sm sm:text-base font-semibold">
                🎉 Check out your epic results!
              </p>
            </div>
          </div>

          {/* Score Card - Retro Theme */}
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-6 sm:p-8 relative z-[2]">
              <div className="text-center">
                <div className={`text-5xl sm:text-7xl font-black mb-3`} style={{ color: getScoreBgColor(finalScore.percentage) }}>
                  {finalScore.percentage}%
                </div>
                
                <p className="text-xl sm:text-2xl font-black text-[#050505] mb-2">
                  {getScoreMessage(finalScore.percentage)}
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-[#6b7280]">
                  <Trophy className="w-4 h-4 text-[#050505]" />
                  <span className="text-sm sm:text-base font-semibold">
                    🎯 {finalScore.correct} out of {finalScore.total} correct
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Badge - Retro Theme */}
          <div className="retro-card-group relative">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-4 sm:p-6 relative z-[2]">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-3xl sm:text-4xl bg-[#7C65C1] w-14 h-14 sm:w-16 sm:h-16 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center">
                  {selectedTopic?.icon}
                </div>
                <div>
                  <h3 className="font-black text-[#050505] text-base sm:text-lg">✨ {selectedTopic?.title}</h3>
                  <p className="text-[#6b7280] text-sm sm:text-base font-semibold">{selectedTopic?.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Retro Theme */}
          <div className="space-y-4">
            {finalScore?.percentage >= 60 && (
              <button
                onClick={onClaimReward}
                disabled={isLoading}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-4 rounded-[0.4em] font-bold text-lg border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center space-x-3 uppercase tracking-[0.05em]"
              >
                {isLoading ? (
                  <LoadingSpinner size={6} color="text-white" />
                ) : (
                  <>
                    <Coins className="w-6 h-6 text-white" />
                    <span className="text-white">🎁 Claim Your Reward!</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={onRetakeQuiz}
              className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-4 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all flex items-center justify-center space-x-3 uppercase tracking-[0.05em]"
            >
              <RefreshCw className="w-5 h-5 text-white" />
              <span className="text-white">🚀 Take Another Quest</span>
            </button>
            
            <button
              onClick={onBackToHome}
              className="w-full bg-white hover:bg-[#f7f7f7] text-[#050505] py-4 rounded-[0.4em] font-semibold border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
            >
              🏠 Back to Home Base
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
