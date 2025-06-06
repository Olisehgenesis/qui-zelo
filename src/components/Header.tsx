import React, { useState, useEffect } from 'react';
import { Menu, X, Wallet, User, ChevronDown, Zap, Trophy, Home, Info } from 'lucide-react';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    };
  }
}

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
          setError('');
        } else {
          setIsConnected(false);
          setAddress('');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    setError('');
    
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask or another Ethereum wallet to use this feature');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
        console.log('Wallet connected:', accounts[0]);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      if ((err as any).code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError('Failed to connect wallet');
      }
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress('');
    setError('');
    console.log('Wallet disconnected');
  };

  return (
    <header className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 shadow-xl border-b-4 border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Enhanced Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-white drop-shadow-lg">
              Quizelo
              <div className="text-xs font-normal text-amber-100 -mt-1">
                Powered by Celo
              </div>
            </div>
          </div>

          {/* Desktop Navigation with animations */}
          <nav className="hidden md:flex items-center space-x-2">
            <NavButton icon={Home} text="Home" />
            <NavButton icon={Trophy} text="Leaderboard" />
            <NavButton icon={Info} text="About" />
          </nav>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Wallet Button */}
            <div className="relative dropdown-container">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 bg-amber-600 text-white hover:bg-amber-700 shadow-lg"
                >
                  <Wallet className="w-5 h-5" />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 bg-white text-amber-600 hover:bg-gray-50 shadow-lg"
                >
                  <Wallet className="w-5 h-5" />
                  <span>{formatAddress(address)}</span>
                </button>
              )}
              {error && (
                <div className="absolute right-0 mt-2 px-3 py-2 text-xs text-red-600 bg-white rounded-lg shadow-lg border border-red-200 max-w-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Profile Button */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 bg-white text-amber-600 px-4 py-2 rounded-xl font-medium shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl py-2 z-50 border border-amber-100">
                  <button className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors duration-200">
                    <Trophy className="w-4 h-4 mr-3" />
                    My Quizzes
                  </button>
                  <button className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors duration-200">
                    <User className="w-4 h-4 mr-3" />
                    Settings
                  </button>
                  <button className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200">
                    <X className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-t border-amber-200">
          <div className="px-4 pt-4 pb-6 space-y-2">
            <MobileNavButton icon={Home} text="Home" />
            <MobileNavButton icon={Trophy} text="Leaderboard" />
            <MobileNavButton icon={Info} text="About" />
            
            <div className="border-t border-amber-200 pt-2 mt-4">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="flex items-center w-full text-left px-4 py-3 rounded-xl text-amber-600 font-medium hover:bg-amber-50 transition-colors duration-200"
                >
                  <Wallet className="w-5 h-5 mr-3" />
                  Connect Wallet
                </button>
              ) : (
                <div className="px-4 py-2 text-sm text-amber-600 font-medium">
                  Connected: {formatAddress(address)}
                </div>
              )}
              <MobileNavButton icon={User} text="Profile" />
            </div>
            
            {error && (
              <div className="mx-4 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

// Navigation button component for desktop
const NavButton = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <button className="flex items-center space-x-2 text-white hover:text-amber-100 px-4 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 font-medium">
    <Icon className="w-5 h-5" />
    <span>{text}</span>
  </button>
);

// Navigation button component for mobile
const MobileNavButton = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors duration-200 font-medium">
    <Icon className="w-5 h-5 mr-3" />
    {text}
  </button>
);


export default Header;