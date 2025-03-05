import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AlphaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  // No need to check localStorage on mount since we want it visible on refresh

  const handleDismiss = () => {
    setIsVisible(false);
    // We don't store in localStorage since we want it to reappear after refresh
  };

  if (!isVisible) return null;

  return (
    <motion.div 
      className="w-full bg-amber-500 z-20 relative py-2 px-4 text-center text-black"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <p className="font-medium pr-8">
        ⚠️ This dApp is in its alpha phase. Some features may be unstable or subject to change. 
        Please use with caution.
      </p>
      <button 
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-amber-600 transition-colors"
        aria-label="Dismiss alpha warning"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}