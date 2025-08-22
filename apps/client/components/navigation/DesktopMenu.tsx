'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { NAVIGATION_ITEMS } from '../../data/constants'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DesktopMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI?: () => void; // New prop for opening AI
}

export function DesktopMenu({ isOpen, onClose, onOpenAI }: DesktopMenuProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  // const [isAIOpen, setIsAIOpen] = useState(false)


  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center space-x-8">
  {NAVIGATION_ITEMS.map((item) => (
    <Link
      key={item.label}
      href={item.path!}
      className="text-gray-300 hover:text-primary py-2 relative group"
    >
      <span className="relative z-10 px-1 text-base font-medium transition-colors duration-300 ease-in-out">
        {item.label}
      </span>
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out" />
    </Link>
  ))}

  {/* Add ReactorAI here */}
  <button
    onClick={() => onOpenAI?.()}
    className="text-gray-300 hover:text-primary py-2 relative group"
  >
    <span className="relative z-10 px-1 text-base font-medium transition-colors duration-300 ease-in-out">
      ReactorAI
    </span>
    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out" />
  </button>
</div>

  );
}