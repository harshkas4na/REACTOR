'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Menu, UserCircle2, LogOut } from 'lucide-react'
import { DesktopMenu } from './DesktopMenu'
import { MobileMenu } from './MobileMenu'
import { MenuToggle } from './MenuToggle'
import { useWeb3 } from '@/app/_context/Web3Context'
import { useAuth } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'



export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { isSignedIn, signOut } = useAuth()
  

  
  const {
    selectedNetwork,
    account,
    connectWallet,
    switchNetwork
  } = useWeb3()

  

 

  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  

  return (
    <motion.nav 
      className="sticky top-0 z-50 w-full border-b border-border backdrop-blur-sm"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image 
              src="/logo6-2.png" 
              alt="Reactor Logo" 
              width={200} 
              height={50}
              className="w-[120px] sm:w-[150px] md:w-[180px] lg:w-[200px] h-auto" 
            /> 
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:block flex-shrink-0">
            <DesktopMenu />
          </div>

          {/* Right Section */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
            {/* Network Select */}
            <div className="hidden md:block">
              <Select 
                value={selectedNetwork} 
                onValueChange={(value) => switchNetwork(value)}
              >
                <SelectTrigger className="w-[120px] lg:w-[180px] text-xs sm:text-sm">
                  <SelectValue placeholder="Select Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>
                  <SelectItem value="KOPLI">Kopli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Connect Wallet Button */}
            <Button
              onClick={connectWallet}
              disabled={isLoading}
              color='primary'
              variant={error ? "destructive" : "default"}
              className="text-xs sm:text-sm px-2 sm:px-3 md:px-4 min-w-0 truncate max-w-[120px] sm:max-w-[150px]"
            >
              {isLoading ? (
                "Connecting..."
              ) : error ? (
                "Error"
              ) : account ? (
                formatAddress(account)
              ) : (
                "Connect"
              )}
            </Button>

            {/* Auth Button */}
            <div className="hidden md:block">
              {isSignedIn ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="relative w-8 h-8 sm:w-9 sm:h-9"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = '/sign-in'}
                  className="relative w-8 h-8 sm:w-9 sm:h-9"
                  aria-label="Sign in"
                >
                  <UserCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
            </div>

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
      <MobileMenu isOpen={isMenuOpen} />
    </motion.nav>
  );
}
