'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { TopicWithMetadata } from '../../hooks/useTopics';

interface TopicModalProps {
  isVisible: boolean;
  onClose: () => void;
  topics: TopicWithMetadata[];
  onSelectTopic: (topic: TopicWithMetadata) => void;
}

export const TopicModal = ({ 
  isVisible, 
  onClose, 
  topics, 
  onSelectTopic 
}: TopicModalProps) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-end sm:items-center justify-center z-[9999] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <div className="retro-card-group relative w-full sm:max-w-md">
          <div className="retro-pattern-overlay" />
          <motion.div 
            className="retro-card bg-white rounded-t-[0.6em] sm:rounded-[0.6em] w-full max-h-[80vh] overflow-y-auto z-[2]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'relative',
              zIndex: 10000
            }}
          >
            <div className="sticky top-0 retro-title-header z-[3]">
              <span>🎯 Choose Your Quest</span>
              <button 
                onClick={onClose}
                className="p-2 rounded-[0.3em] hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="retro-card-group relative">
                  <div className="retro-pattern-overlay" />
                  <button
                    onClick={() => {
                      onSelectTopic(topic);
                      onClose();
                    }}
                    className="retro-card bg-white p-4 sm:p-6 w-full text-left group relative z-[2]"
                  >
                    <div className="relative flex items-center space-x-4">
                      <div className="text-3xl sm:text-4xl bg-[#7C65C1] group-hover:bg-[#6952A3] w-14 h-14 sm:w-16 sm:h-16 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] flex items-center justify-center transition-all">
                       {topic.icon}
                     </div>
                     <div className="flex-1">
                       <h4 className="font-black text-[#050505] group-hover:text-[#7C65C1] text-base sm:text-lg mb-1 transition-colors">
                         ✨ {topic.title}
                       </h4>
                       <p className="text-[#6b7280] group-hover:text-[#050505] transition-colors text-sm sm:text-base font-semibold">
                         {topic.description}
                       </p>
                     </div>
                     <ChevronRight className="w-6 h-6 text-[#6b7280] group-hover:text-[#7C65C1] transition-colors" />
                   </div>
                 </button>
               </div>
             ))}
           </div>
         </motion.div>
       </div>
     </motion.div>
   </AnimatePresence>
 );
};

