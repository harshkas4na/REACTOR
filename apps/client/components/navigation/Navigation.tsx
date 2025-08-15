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
// ReactorAI quick-open button removed; ReactorAI remains available elsewhere

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Removed AI quick-open state per header simplification
  
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
        className="sticky top-0 z-50 w-full border-b border-primary/10 backdrop-blur-md bg-background/60 supports-[backdrop-filter]:bg-background/40"
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
              {/* ReactorAI link moved to the main menu */}

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
                  <SelectTrigger className="w-[140px] lg:w-[200px] text-sm lg:text-base rounded-full bg-background/70 border-border text-foreground">
                    <SelectValue placeholder="Select Network" className="text-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/80 backdrop-blur-md border-border text-foreground">
                    {/* Testnets */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Testnets
                      </div>
                    <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>

                    {/* Divider */}
                    <div className="h-px bg-border my-1" />
                    
                    {/* Mainnets (coming soon) */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Mainnets
                      </div>
                    <SelectItem value="ETHEREUM" disabled>Ethereum Mainnet (Coming Soon)</SelectItem>
                    <SelectItem value="BASE" disabled>Base Mainnet (Coming Soon)</SelectItem>
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
                      relative overflow-hidden px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full
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
        />
      </motion.nav>

    </>
  );
}