'use client';

import { Brain } from 'lucide-react';
import { HorizontalTimer } from '../ui/HorizontalTimer';
import { QuestionResultModal } from '../modals/QuestionResultModal';
import { TopicWithMetadata } from '../../hooks/useTopics';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuestionResult {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  userAnswer: string;
  isLastQuestion: boolean;
}

interface QuizInterfaceProps {
  questions: Question[];
  currentQuestionIndex: number;
  selectedTopic: TopicWithMetadata | null;
  timeLeft: number;
  isAnswered: boolean;
  userAnswers: number[];
  showQuestionResult: boolean;
  currentQuestionResult: QuestionResult | null;
  onAnswer: (answerIndex: number) => void;
  onContinue: () => void;
}

export const QuizInterface = ({
  questions,
  currentQuestionIndex,
  selectedTopic,
  timeLeft,
  isAnswered,
  userAnswers,
  showQuestionResult,
  currentQuestionResult,
  onAnswer,
  onContinue,
}: QuizInterfaceProps) => {
  if (!questions[currentQuestionIndex]) return null;

  const question = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-[#f7f7f7] overflow-y-auto">
      <div className="min-h-screen p-mobile">
        <div className="max-w-sm mx-auto">
          {/* Game Header - Retro Theme */}
          <div className="retro-card-group relative mb-4 sm:mb-6">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-mobile relative z-[2]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-[#050505] text-mobile-sm">🎯 {selectedTopic?.title}</h1>
                  <p className="text-mobile-xs text-[#6b7280] font-semibold">
                    🎮 Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timer - Mobile optimized */}
          <HorizontalTimer 
            timeLeft={timeLeft} 
            totalTime={15} 
          />

          {/* Progress - Retro Theme */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-mobile-sm font-bold text-[#050505]">🏆 Progress</span>
              <span className="text-mobile-sm font-bold text-[#050505]">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-[#e8e8e8] rounded-full h-3 overflow-hidden border-[0.1em] border-[#050505]">
              <div 
                className="bg-[#7C65C1] h-full rounded-full transition-all duration-800 ease-out"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card - Retro Theme */}
          <div className="retro-card-group relative mb-6">
            <div className="retro-pattern-overlay" />
            <div className="retro-card bg-white p-mobile relative z-[2]">
              <div className="relative">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#7C65C1] rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-mobile-sm font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <h2 className="text-mobile-base sm:text-xl font-black text-[#050505] leading-relaxed">
                    🤔 {question.question}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => onAnswer(index)}
                      disabled={isAnswered}
                      className={`w-full p-4 sm:p-5 text-left rounded-[0.4em] border-[0.2em] transition-all group relative overflow-hidden btn-mobile ${
                        isAnswered
                          ? index === question.correctAnswer
                            ? 'border-[#10b981] bg-[#f0fdf4] shadow-[0.2em_0.2em_0_#10b981]'
                            : index === userAnswers[currentQuestionIndex]
                            ? 'border-[#ef4444] bg-[#fef2f2] shadow-[0.2em_0.2em_0_#ef4444]'
                            : 'border-[#e8e8e8] bg-white'
                          : 'border-[#050505] bg-white hover:border-[#7C65C1] hover:bg-[#f7f7f7] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#7C65C1] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
                      }`}
                    >
                      <div className="relative flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-[0.3em] border-[0.15em] flex items-center justify-center font-bold transition-all ${
                          isAnswered
                            ? index === question.correctAnswer
                              ? 'border-[#10b981] bg-[#10b981] text-white'
                              : index === userAnswers[currentQuestionIndex]
                              ? 'border-[#ef4444] bg-[#ef4444] text-white'
                              : 'border-[#e8e8e8] bg-[#f7f7f7] text-[#6b7280]'
                            : 'border-[#050505] bg-white text-[#050505] group-hover:border-[#7C65C1] group-hover:bg-[#7C65C1] group-hover:text-white'
                        }`}>
                          <span className="text-sm font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <span className="text-[#050505] group-hover:text-[#050505] font-semibold text-mobile-sm flex-1">
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
      </div>

      {/* Question Result Modal */}
      {showQuestionResult && currentQuestionResult && (
        <QuestionResultModal
          result={currentQuestionResult}
          correctAnswer={currentQuestionResult.correctAnswer}
          userAnswer={currentQuestionResult.userAnswer}
          onContinue={onContinue}
          isLastQuestion={currentQuestionResult.isLastQuestion}
        />
      )}
    </div>
  );
};
