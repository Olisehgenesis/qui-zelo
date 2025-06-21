import { useState } from 'react';
import type { Topic } from './useAI';

export interface TopicWithMetadata extends Topic {
  id: string;
  icon: string;
  color: string;
}

export const useTopics = () => {
  const [selectedTopic, setSelectedTopic] = useState<TopicWithMetadata | null>(null);

  // Celo-themed topics
  const topics: TopicWithMetadata[] = [
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
      id: 'celo-governance',
      title: 'Governance',
      description: 'Celo governance and community participation',
      icon: '🗳️',
      color: 'from-purple-400 to-indigo-600'
    },
    {
      id: 'valora-wallet',
      title: 'Valora Wallet',
      description: 'Using Valora and Celo wallets',
      icon: '👛',
      color: 'from-pink-400 to-rose-600'
    },
    {
      id: 'celo-development',
      title: 'Celo Development',
      description: 'Building dApps on Celo blockchain',
      icon: '💻',
      color: 'from-indigo-400 to-purple-600'
    },
    {
      id: 'carbon-credits',
      title: 'Carbon Credits',
      description: 'Environmental impact and carbon offsetting',
      icon: '🌿',
      color: 'from-teal-400 to-green-600'
    }
  ];

  const selectTopic = (topic: TopicWithMetadata) => {
    setSelectedTopic(topic);
  };

  const clearSelection = () => {
    setSelectedTopic(null);
  };

  return {
    topics,
    selectedTopic,
    selectTopic,
    clearSelection
  };
};