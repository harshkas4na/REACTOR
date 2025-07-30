"use client"

import { useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from "next-themes"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export const CHAINS = {
    '11155111': {
      id: 11155111,
      name: 'Ethereum Sepolia',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
      icon: '🟣'
    },
    '1': {
      id: 1,
      name: 'Ethereum Mainnet',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
      icon: '⚪'
    },
    '43114': {
      id: 43114,
      name: 'Avalanche C-Chain',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
      icon: '❄️'
    },
    '42161': {
      id: 42161,
      name: 'Arbitrum One',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
      icon: '🔵'
    },
    '169': {
      id: 169,
      name: 'Manta Pacific',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
      icon: '🐋'
    },
    '8453': {
      id: 8453,
      name: 'Base Chain',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
      icon: '🔷'
    },
    '56': {
      id: 56,
      name: 'Binance Smart Chain',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
      icon: '🟡'
    },
    '137': {
      id: 137,
      name: 'Polygon PoS',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
      icon: '🟣'
    },
    '1101': {
      id: 1101,
      name: 'Polygon zkEVM',
      hasCallbacks: false,
      isOrigin: false,
      isDestination: false,
      icon: '💜'
    },
    '204': {
      id: 204,
      name: 'opBNB Mainnet',
      hasCallbacks: false,
      isOrigin: false,
      isDestination: false,
      icon: '🟨'
    },
    '5318007': {
      id: 5318007,
      name: 'Lasna Testnet',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
      icon: '🟦'
    }
  };

  export function NavigationHeader() {
    const { setTheme, theme } = useTheme();
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
    const [selectedNetwork, setSelectedNetwork] = useState<string>('11155111'); // Default to Sepolia
  
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">RSC Flow Tracker</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger className="w-[220px]">
                <SelectValue>
                  {selectedNetwork ? (
                    <div className="flex items-center">
                      <span className="mr-2">{CHAINS[selectedNetwork as keyof typeof CHAINS].icon}</span>
                      {CHAINS[selectedNetwork as keyof typeof CHAINS].name}
                    </div>
                  ) : (
                    "Select Network"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHAINS).map(([id, chain]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center">
                      <span className="mr-2">{chain.icon}</span>
                      {chain.name}
                      {chain.hasCallbacks && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 rounded-full px-2">
                          Callbacks
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <div 
              className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
              }`} 
              title={`Status: ${connectionStatus}`}
            />
          </div>
        </div>
      </nav>
    );
  }