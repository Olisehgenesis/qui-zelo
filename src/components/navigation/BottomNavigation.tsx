'use client';

import { Home, Trophy, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-[0.35em] border-[#050505] px-2 sm:px-4 py-3 sm:py-4 z-20 shadow-[0_-0.7em_0_#000000] mobile-safe-area">
      <div className="flex justify-around max-w-sm mx-auto">
        {[
          { tab: 'home', icon: Home, label: '🏠 Home' },
          { tab: 'leaderboard', icon: Trophy, label: '🏆 Ranks' },
          { tab: 'profile', icon: User, label: '👤 Profile' }
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => onTabChange(item.tab)}
            className={`flex flex-col items-center space-y-1 sm:space-y-2 py-2 sm:py-3 px-2 sm:px-4 rounded-[0.3em] transition-all btn-mobile border-[0.15em] ${
              activeTab === item.tab 
                ? 'bg-[#7C65C1] border-[#050505] text-white shadow-[0.2em_0.2em_0_#000000]' 
                : 'bg-white border-[#050505] text-[#050505] hover:bg-[#f7f7f7] shadow-[0.15em_0.15em_0_#000000]'
            }`}
          >
            <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

