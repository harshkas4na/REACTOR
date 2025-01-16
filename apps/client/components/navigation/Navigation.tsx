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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Responsive logo sizing */}
          <Link href="/" className="flex-shrink-0">
            <Image 
              src="/logo6-2.png" 
              alt="Reactor Logo" 
              width={200} 
              height={50}
              className="w-[150px] sm:w-[180px] md:w-[200px] h-auto" 
            /> 
          </Link>
          <DesktopMenu />
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Network Select - Hide on mobile */}
            <div className="hidden sm:block">
              <Select 
                value={selectedNetwork} 
                onValueChange={(value) => switchNetwork(value)}
              >
                <SelectTrigger className="w-[120px] md:w-[180px]">
                  <SelectValue placeholder="Select Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>
                  <SelectItem value="KOPLI">Kopli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Connect Wallet Button - Responsive width */}
            <Button
              onClick={connectWallet}
              disabled={isLoading}
              color='primary'
              variant={error ? "destructive" : "default"}
              className="text-xs sm:text-sm px-2 sm:px-4"
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
            <div className="hidden sm:block">
              {isSignedIn ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="relative"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = '/sign-in'}
                  aria-label="Sign in"
                >
                  <UserCircle2 className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Theme Toggle */}
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="hidden sm:inline-flex"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button> */}

            {/* Menu Toggle */}
            <MenuToggle 
              isOpen={isMenuOpen} 
              onToggle={() => setIsMenuOpen(!isMenuOpen)} 
            />
          </div>
        </div>
      </div>
      <MobileMenu isOpen={isMenuOpen} />
    </motion.nav>
  )
}