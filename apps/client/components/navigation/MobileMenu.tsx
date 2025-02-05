'use client'
import { motion } from 'framer-motion'
import { NAVIGATION_ITEMS } from '../../data/constants'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWeb3 } from '../../app/_context/Web3Context'
import { Button } from "@/components/ui/button"
import { UserCircle2, LogOut } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { switchNetwork, selectedNetwork } = useWeb3();
  const { isSignedIn, signOut } = useAuth();

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

  return (
    <motion.div 
      ref={menuRef}
      className="lg:hidden fixed top-16 inset-x-0 z-[100] bg-black/95 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-4 space-y-4">
        {/* Navigation Links */}
        {NAVIGATION_ITEMS.map(({ label, path }) => (
          <Link
            key={label}
            href={path}
            className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-in-out"
            onClick={onClose}
          >
            {label}
          </Link>
        ))}

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
                    value="KOPLI" 
                    className="text-gray-200 hover:bg-gray-700/50"
                  >
                    Kopli Testnet
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
                    { value: "AVALANCHE", label: "Avalanche C-Chain" },
                    { value: "ARBITRUM", label: "Arbitrum One" },
                    { value: "MANTA", label: "Manta Pacific" },
                    { value: "BASE", label: "Base Chain" },
                    { value: "BSC", label: "Binance Smart Chain" },
                    { value: "POLYGON", label: "Polygon PoS" },
                    { value: "POLYGON_ZKEVM", label: "Polygon zkEVM" },
                    { value: "OPBNB", label: "opBNB Mainnet" }
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

        {/* Authentication */}
        <div className="pt-4 border-t border-gray-700">
          {isSignedIn ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-primary"
              onClick={() => {
                signOut();
                onClose();
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-primary"
              onClick={() => {
                window.location.href = '/sign-in';
                onClose();
              }}
            >
              <UserCircle2 className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}