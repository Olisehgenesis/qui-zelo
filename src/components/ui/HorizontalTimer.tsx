import { Clock, Sparkles } from 'lucide-react';

interface HorizontalTimerProps {
  timeLeft: number;
  totalTime?: number;
}

export const HorizontalTimer = ({ timeLeft, totalTime = 15 }: HorizontalTimerProps) => {
  const progress = (timeLeft / totalTime) * 100;
  
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'from-red-400 to-orange-500';
    if (timeLeft <= 7) return 'from-orange-400 to-amber-500';
    return 'from-emerald-400 to-teal-500';
  };

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#050505]" />
          <span className="text-sm font-bold text-[#050505]">⏰ Time Left</span>
        </div>
        <span className={`font-black text-xl ${timeLeft <= 5 ? 'text-[#ef4444]' : 'text-[#050505]'}`}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="relative w-full bg-[#e8e8e8] rounded-full h-4 overflow-hidden shadow-inner border-[0.1em] border-[#050505]">
        <div 
          className={`h-full bg-gradient-to-r ${getTimerColor()} rounded-full shadow-lg transition-all duration-1000 ease-out`}
          style={{ width: `${progress}%` }}
        >
          {timeLeft <= 5 && (
            <div className="absolute inset-0 bg-red-400/50 animate-pulse" />
          )}
        </div>
      </div>
      
      {timeLeft <= 5 && (
        <div className="text-center mt-3">
          <span className="text-[#ef4444] font-bold text-sm flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#ef4444]" />
            <span>⚡ Time running out!</span>
            <Sparkles className="w-4 h-4 text-[#ef4444]" />
          </span>
        </div>
      )}
    </div>
  );
};

