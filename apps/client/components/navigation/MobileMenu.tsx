// components/navigation/MobileMenu.tsx
'use client'
import { motion } from 'framer-motion'
import { NAVIGATION_ITEMS } from '../../data/constants'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { useWeb3 } from '../../app/_context/Web3Context'
interface MobileMenuProps {
  isOpen: boolean
}


export function MobileMenu({ isOpen }: MobileMenuProps) {
  if (!isOpen) return null
  const { switchNetwork,selectedNetwork } = useWeb3()

  return (
    <motion.div 
      className="sm:hidden fixed top-16 inset-x-0 z-20 bg-black/95  shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-4 space-y-2">
        {NAVIGATION_ITEMS.map(({ label, path }) => (
          <Link
            key={label}
            href={path}
            className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-in-out"
          >
            {label}
          </Link>
        ))}
        {/* Additional mobile-only items */}
        <div className="pt-4 border-t border-gray-700">
          <Select 
            value={selectedNetwork} 
            onValueChange={(value) => switchNetwork(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEPOLIA">Ethereum Sepolia</SelectItem>
              <SelectItem value="KOPLI">Kopli</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  )
}