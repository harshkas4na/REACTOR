import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AlphaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <motion.div 
      className="w-full bg-slate-900/80 backdrop-blur-sm border-b border-purple-500/20 z-20 relative py-3 px-4 text-center"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-center relative">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse opacity-80" />
          <p className="text-slate-300 text-sm font-medium">
            Alpha Release — Some features may be unstable or subject to change
          </p>
        </div>
        
        <button 
          onClick={handleDismiss}
          className="absolute right-0 p-1.5 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-slate-200"
          aria-label="Dismiss alpha warning"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}