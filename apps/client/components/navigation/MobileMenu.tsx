'use client'
import { motion } from 'framer-motion'
import { NAVIGATION_ITEMS } from '../../data/constants'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWeb3 } from '../../app/_context/Web3Context'
import { Button } from "@/components/ui/button"
import { UserCircle2, LogOut, ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI?: () => void; // New prop for opening AI
}

export function MobileMenu({ isOpen, onClose, onOpenAI }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { switchNetwork, selectedNetwork } = useWeb3();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is on a Select component or its content
      const target = event.target as HTMLElement;
      const isSelectClick = target.closest('[role="combobox"]') || 
                          target.closest('[role="listbox"]');

      if (menuRef.current && 
          !menuRef.current.contains(event.target as Node) && 
          !isSelectClick) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNetworkChange = (value: string) => {
    switchNetwork(value);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const handleLinkClick = () => {
    onClose();
    setOpenDropdowns([]);
  };

  const handleAIClick = () => {
    onClose();
  };

  return (
    <motion.div 
      ref={menuRef}
      className="lg:hidden fixed top-16 inset-x-0 z-[100] bg-black/95 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-4 space-y-4">
        {/* ReactorAI Button - Prominent placement at top */}
       

        {/* Navigation Links */}
        {NAVIGATION_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.path!}
            className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-4 py-3 rounded-md text-base font-medium transition-all duration-300 ease-in-out"
            onClick={handleLinkClick}
          >
            {item.label}
          </Link>
        ))}

        {/* Network Selection */}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Select Network</p>
          <Select 
            defaultValue={selectedNetwork || 'SEPOLIA'} 
            onValueChange={handleNetworkChange}
          >
            <SelectTrigger className="w-full bg-gray-800/50 border-gray-700">
              <SelectValue placeholder="Select Network" />
            </SelectTrigger>
            <SelectContent 
              className="bg-gray-800 border-gray-700 max-h-[300px] overflow-y-auto"
              position="popper"
              side="bottom"
              align="start"
            >
              <div className="p-2 pointer-events-auto">
                {/* Testnets Group */}
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    Testnets
                  </div>
                  <SelectItem 
                    value="SEPOLIA" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Ethereum Sepolia
                  </SelectItem>
                  {/* Removed Lasna as a separate option */}
                  {/* <SelectItem 
                    value="BSC_TESTNET" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    BSC Testnet (Origin)
                  </SelectItem>
                  <SelectItem 
                    value="POLYGON_AMOY" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Polygon Amoy (Origin)
                  </SelectItem>
                  <SelectItem 
                    value="AVALANCHE_FUJI" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Avalanche Fuji (Origin)
                  </SelectItem>
                  <SelectItem 
                    value="BASE_SEPOLIA" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Base Sepolia (Origin)
                  </SelectItem> */}
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-700 my-2" />

                {/* Mainnets Group (coming soon) */}
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    Mainnets
                  </div>
                  <SelectItem value="ETHEREUM" disabled className="text-gray-400">Ethereum Mainnet (Coming Soon)</SelectItem>
                  <SelectItem value="BASE" disabled className="text-gray-400">Base Mainnet (Coming Soon)</SelectItem>
                </div>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}