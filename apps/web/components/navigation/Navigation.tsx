'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Menu, UserCircle2, LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { DesktopMenu } from './DesktopMenu'
import { MobileMenu } from './MobileMenu'
import { MenuToggle } from './MenuToggle'
import { useWeb3 } from '@/app/_context/Web3Context'
import { useAuth } from '@clerk/nextjs'
// import { useUser } from '@clerk/clerk-react'
import Web3 from 'web3'



interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
}

interface SupportedNetworks {
  [key: string]: NetworkConfig;
}

const SUPPORTED_NETWORKS: SupportedNetworks = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'
  },
  KOPLI: {
    chainId: 5318008,
    name: 'Kopli',
    rpcUrl: 'https://kopli-rpc.rkt.ink'
  }
};

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { isSignedIn, signOut } = useAuth()
  console.log('isSignedIn', isSignedIn)
  // const { user } = useUser()

  
  const {
    selectedNetwork,
    setSelectedNetwork,
    account,
    setAccount,
    web3,
    setWeb3
  } = useWeb3()

  const connectWallet = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setAccount(accounts[0])
        const web3Instance = new Web3(window.ethereum)
        const chainId = await web3Instance.eth.getChainId()
        setSelectedNetwork(getCurrentNetworkKey(Number(chainId)))
        setWeb3(web3Instance)
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err)
      setError(err?.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const switchNetwork = async (networkName: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    try {
      setIsLoading(true)
      const network = SUPPORTED_NETWORKS[networkName.toUpperCase()]
      if (!network) throw new Error('Unsupported network')

      const chainIdHex = `0x${network.chainId.toString(16)}`
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        })
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
            }],
          })
        } else {
          throw switchError
        }
      }

      setSelectedNetwork(networkName)
      const web3Instance = new Web3(window.ethereum)
      setWeb3(web3Instance)
    } catch (err: any) {
      console.error('Error switching network:', err)
      setError(err?.message || 'Failed to switch network')
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentNetworkKey = (currentChainId: number): string => {
    return Object.keys(SUPPORTED_NETWORKS).find(
      key => SUPPORTED_NETWORKS[key].chainId === currentChainId
    ) || ''
  }

  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Instance = new Web3(window.ethereum)
      setWeb3(web3Instance)

      web3Instance.eth.getChainId().then((currentChainId) => {
        const networkKey = getCurrentNetworkKey(Number(currentChainId))
        setSelectedNetwork(networkKey)
      })

      web3Instance.eth.getAccounts().then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      })

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        } else {
          setAccount('')
        }
      }

      const handleChainChanged = (newChainId: string) => {
        const chainIdDecimal = parseInt(newChainId, 16)
        const networkKey = getCurrentNetworkKey(chainIdDecimal)
        setSelectedNetwork(networkKey)
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  return (
    <motion.nav 
      className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1>Reactor</h1>
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