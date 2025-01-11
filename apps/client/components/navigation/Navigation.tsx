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
      className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className='text-4xl font-bold'>Reactor</h1>
          <DesktopMenu />
          <div className="flex items-center space-x-4">
            <Select 
              value={selectedNetwork} 
              onValueChange={(value) => switchNetwork(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>
                <SelectItem value="KOPLI">Kopli</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={connectWallet}
              disabled={isLoading}
              variant={error ? "destructive" : "default"}
            >
              {isLoading ? (
                "Connecting..."
              ) : error ? (
                "Error Connecting"
              ) : account ? (
                formatAddress(account)
              ) : (
                "Connect Wallet"
              )}
            </Button>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
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