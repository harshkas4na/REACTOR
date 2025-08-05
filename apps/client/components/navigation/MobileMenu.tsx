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
    onOpenAI?.(); // Open AI
    onClose(); // Close mobile menu
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
        <div className="pb-4 border-b border-gray-700">
          <Button
            onClick={handleAIClick}
            className="w-full bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30 text-primary-foreground justify-start text-left h-auto py-3 px-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center relative">
                <Sparkles className="w-4 h-4 text-foreground" />
                {/* Notification indicator */}
                <motion.div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full" />
                </motion.div>
              </div>
              <div>
                <span className="font-medium text-foreground">ReactorAI</span>
                <p className="text-xs text-muted-foreground">Your DeFi automation assistant</p>
              </div>
            </div>
          </Button>
        </div>

        {/* Navigation Links */}
        {NAVIGATION_ITEMS.map((item) => {
          if (item.type === 'dropdown') {
            const isOpen = openDropdowns.includes(item.label);
            return (
              <div key={item.label} className="space-y-2">
                <button
                  onClick={() => toggleDropdown(item.label)}
                  className="w-full text-left text-gray-300 hover:text-primary hover:bg-gray-700 flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-in-out"
                >
                  {item.label}
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 space-y-1"
                  >
                    {item.items?.map((subItem) => (
                      <Link
                        key={subItem.path}
                        href={subItem.path}
                        className="block text-gray-400 hover:text-primary hover:bg-gray-700/50 px-4 py-2 rounded-md text-sm transition-all duration-300 ease-in-out"
                        onClick={handleLinkClick}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          } else {
            return (
              <Link
                key={item.label}
                href={item.path!}
                className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-in-out"
                onClick={handleLinkClick}
              >
                {item.label}
              </Link>
            );
          }
        })}

        {/* Network Selection */}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Select Network</p>
          <Select 
            defaultValue={selectedNetwork} 
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
                  <SelectItem 
                    value="LASNA" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Reactive Lasna
                  </SelectItem>
                  <SelectItem 
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
                  </SelectItem>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-700 my-2" />

                {/* Mainnets Group */}
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    Mainnets
                  </div>
                  {[
                    { value: "ETHEREUM", label: "Ethereum Mainnet" },
                    { value: "BSC", label: "Binance Smart Chain" },
                    { value: "AVALANCHE", label: "Avalanche C-Chain" },
                    { value: "BASE", label: "Base Chain" },
                    { value: "ARBITRUM", label: "Arbitrum One" },
                    { value: "SONIC", label: "Sonic Mainnet" },
                    { value: "HYPEREVM", label: "HyperEVM" },
                    { value: "REACT", label: "Reactive Mainnet" }
                  ].map(network => (
                    <SelectItem 
                      key={network.value}
                      value={network.value}
                      className="text-gray-200 hover:bg-gray-700/50"
                    >
                      {network.label}
                    </SelectItem>
                  ))}
                </div>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}