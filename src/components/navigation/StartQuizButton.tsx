'use client';

import { Play } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface StartQuizButtonProps {
  onClick: () => void;
  isLoading: boolean;
  aiLoading: boolean;
  canQuiz: boolean;
}

export const StartQuizButton = ({
  onClick,
  isLoading,
  aiLoading,
  canQuiz,
}: StartQuizButtonProps) => {
  return (
    <div className="fixed bottom-28 sm:bottom-32 right-4 sm:right-6 z-50" style={{ zIndex: 9999 }}>
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C65C1] via-[#9D7FE8] to-[#7C65C1] rounded-full blur-xl opacity-60 animate-pulse" style={{ 
          width: 'calc(100% + 1.5rem)', 
          height: 'calc(100% + 1.5rem)',
          top: '-0.75rem',
          left: '-0.75rem'
        }} />
        
        <button
          onClick={onClick}
          onTouchStart={(e) => {
            e.preventDefault();
            onClick();
          }}
          disabled={isLoading || aiLoading || !canQuiz}
          className="relative bg-gradient-to-br from-[#7C65C1] via-[#9D7FE8] to-[#6952A3] w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[0.25em] border-[#050505] flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-mobile shadow-[0.4em_0.4em_0_#000000] hover:shadow-[0.6em_0.6em_0_#000000] hover:-translate-x-[0.2em] hover:-translate-y-[0.2em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.2em_0.2em_0_#000000] hover:scale-110 group overflow-hidden"
          style={{
            touchAction: 'manipulation',
            pointerEvents: 'auto',
            animation: 'playButtonPulse 2s ease-in-out infinite'
          }}
          title={
            !canQuiz 
              ? "You've reached your daily quiz limit. Please wait for the cooldown period." 
              : "Start a new quiz"
          }
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Play icon */}
          <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-300">
            {isLoading || aiLoading ? (
              <LoadingSpinner size={6} color="text-white" />
            ) : (
              <div className="relative">
                <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white ml-1 drop-shadow-2xl filter brightness-110" />
                {/* Sparkle effect */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75" />
                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }} />
              </div>
            )}
          </div>
          
          {/* Ripple effect on click */}
          <div className="absolute inset-0 rounded-full bg-white/30 scale-0 group-active:scale-150 opacity-0 group-active:opacity-100 transition-all duration-500" />
        </button>
      </div>
    </div>
  );
};

