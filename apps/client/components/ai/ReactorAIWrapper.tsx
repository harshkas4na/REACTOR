'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactorAI from '@/components/ai/ReactorAI';

export default function ReactorAIWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewFeature, setHasNewFeature] = useState(false);

  // Check if user has seen the AI feature before
  useEffect(() => {
    const hasSeenAI = localStorage.getItem('reactor-ai-seen');
    if (!hasSeenAI) {
      setHasNewFeature(true);
      // Auto-remove the notification after 10 seconds
      const timer = setTimeout(() => {
        setHasNewFeature(false);
        localStorage.setItem('reactor-ai-seen', 'true');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    if (hasNewFeature) {
      setHasNewFeature(false);
      localStorage.setItem('reactor-ai-seen', 'true');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating AI Button */}


      {/* AI Chat Interface */}
      <ReactorAI isOpen={isOpen} onClose={handleClose} />
    </>
  );
}