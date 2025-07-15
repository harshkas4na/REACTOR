'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { NAVIGATION_ITEMS } from '../../data/constants'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function DesktopMenu() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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
      {NAVIGATION_ITEMS.map((item) => {
        if (item.type === 'dropdown') {
          const isActive = activeDropdown === item.label;
          
          return (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              <button className="text-gray-300 hover:text-primary py-2 relative group flex items-center gap-1">
                <span className="relative z-10 px-1 text-sm font-medium transition-colors duration-300 ease-in-out">
                  {item.label}
                </span>
                <ChevronDown 
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isActive ? 'rotate-180' : ''
                  }`} 
                />
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out" />
              </button>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 bg-black/95 border border-gray-700 rounded-md shadow-lg backdrop-blur-sm min-w-[200px] z-50"
                  >
                    <div className="py-2">
                      {item.items?.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          className="block px-4 py-2 text-sm text-gray-300 hover:text-primary hover:bg-gray-800/50 transition-colors duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        } else {
          return (
            <Link
              key={item.label}
              href={item.path!}
              className="text-gray-300 hover:text-primary py-2 relative group"
            >
              <span className="relative z-10 px-1 text-sm font-medium transition-colors duration-300 ease-in-out">
                {item.label}
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out" />
            </Link>
          );
        }
      })}
    </div>
  );
}