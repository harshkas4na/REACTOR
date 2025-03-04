// components/AlphaBanner.tsx
import { motion } from 'framer-motion';

export default function AlphaBanner() {
  return (
    <motion.div 
      className="w-full bg-amber-500 z-20 pointer-auto-layout py-2 px-4 text-center text-black"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="font-medium">
        ⚠️ This dApp is in its alpha phase. Some features may be unstable or subject to change. 
        Please use with caution.
      </p>
    </motion.div>
  );
}