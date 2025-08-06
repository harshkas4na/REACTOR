'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Menu, UserCircle2, LogOut, Wallet, Sparkles } from 'lucide-react'
import { DesktopMenu } from './DesktopMenu'
import { MobileMenu } from './MobileMenu'
import { MenuToggle } from './MenuToggle'
import { useWeb3 } from '@/app/_context/Web3Context'
import Image from 'next/image'
import Link from 'next/link'
import AlphaBanner from './AlphaBanner'
import ReactorAI from '@/components/ai/ReactorAI'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAIOpen, setIsAIOpen] = useState(false)
  
  const {
    selectedNetwork,
    account,
    connectWallet,
    switchNetwork,
    isMobileDevice,
    isLoading,
    error,
    openMetaMaskApp
  } = useWeb3();

  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <>
      <AlphaBanner />

      <motion.nav 
        className="sticky top-0 z-50 w-full border-b border-border "
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <Image 
                  src="/Full Logo/Color/DarkBg@2x.svg" 
                  alt="Reactor Logo" 
                  width={200} 
                  height={200}
                  quality={100}
                  className="transition-transform duration-300 group-hover:scale-105" 
                />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:block flex-shrink-0">
              <DesktopMenu />
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
              {/* ReactorAI Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => setIsAIOpen(true)}
                  variant="ghost"
                  className="relative overflow-hidden px-3 py-2 text-sm font-medium transition-all duration-300 hover:bg-primary/10 border border-transparent hover:border-primary/20"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center relative">
                      <Sparkles className="w-3 h-3 text-foreground" />
                      {/* Notification indicator */}
                      <motion.div 
                        className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="w-1.5 h-1.5 bg-foreground rounded-full" />
                      </motion.div>
                    </div>
                    <span className="hidden sm:inline text-foreground">ReactorAI</span>
                  </div>
                </Button>
              </motion.div>

              {/* Network Select */}
              <div className="hidden md:block">
                <Select 
                  value={selectedNetwork} 
                  onValueChange={(value) => {
                    if (isMobileDevice && !window.ethereum) {
                      const shouldOpenApp = window.confirm(
                        'Would you like to open MetaMask app to switch networks?'
                      );
                      if (shouldOpenApp) {
                        openMetaMaskApp();
                      }
                      return;
                    }
                    switchNetwork(value);
                  }}
                >
                  <SelectTrigger className="w-[120px] lg:w-[180px] text-xs sm:text-sm">
                    <SelectValue placeholder="Select Network" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Testnets */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                        Testnets
                      </div>
                    <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>
                    <SelectItem value="LASNA">Reactive Lasna</SelectItem>
                    <SelectItem value="BSC_TESTNET">BSC Testnet (Origin)</SelectItem>
                    <SelectItem value="POLYGON_AMOY">Polygon Amoy (Origin)</SelectItem>
                    <SelectItem value="AVALANCHE_FUJI">Avalanche Fuji (Origin)</SelectItem>
                    <SelectItem value="BASE_SEPOLIA">Base Sepolia (Origin)</SelectItem>
                    
                    {/* Divider */}
                    <div className="h-px bg-zinc-800 my-1" />
                    
                    {/* Mainnets */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                        Mainnets
                      </div>
                    <SelectItem value="ETHEREUM">Ethereum Mainnet</SelectItem>
                    <SelectItem value="BSC">Binance Smart Chain</SelectItem>
                    <SelectItem value="AVALANCHE">Avalanche C-Chain</SelectItem>
                    <SelectItem value="BASE">Base Chain</SelectItem>
                    <SelectItem value="ARBITRUM">Arbitrum One</SelectItem>
                    <SelectItem value="SONIC">Sonic Mainnet</SelectItem>
                    <SelectItem value="HYPEREVM">HyperEVM</SelectItem>
                    <SelectItem value="REACT">Reactive Mainnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Wallet Connection */}
              <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={connectWallet}
                    disabled={isLoading}
                    variant={error ? "destructive" : account ? "secondary" : "default"}
                    className={`
                      relative overflow-hidden px-4 py-2 text-sm font-medium transition-all duration-300
                      ${account 
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30' 
                        : error 
                          ? 'bg-destructive hover:bg-destructive/90' 
                          : 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isLoading ? (
                          "Connecting..."
                        ) : error ? (
                          isMobileDevice ? "Open MetaMask" : "Install MetaMask"
                        ) : account ? (
                          formatAddress(account)
                        ) : (
                          "Connect Wallet"
                        )}
                      </span>
                      <span className="sm:hidden">
                        {isLoading ? "..." : error ? "!" : account ? formatAddress(account) : "Connect"}
                      </span>
                    </div>
                    
                    {/* Loading animation */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    )}
                  </Button>
                </motion.div>

              {/* Menu Toggle - Always visible on screens < lg */}
              <div className="lg:hidden">
                <MenuToggle 
                  isOpen={isMenuOpen} 
                  onToggle={() => setIsMenuOpen(!isMenuOpen)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <MobileMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          onOpenAI={() => setIsAIOpen(true)}
        />
      </motion.nav>

      {/* ReactorAI Component */}
      <ReactorAI 
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />
    </>
  );
}