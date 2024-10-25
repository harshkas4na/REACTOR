// components/navigation/MobileMenu.tsx
'use client'
import { motion } from 'framer-motion'
import { NAVIGATION_ITEMS } from '../../data/constants'
import Link from 'next/link'

interface MobileMenuProps {
  isOpen: boolean
}

export function MobileMenu({ isOpen }: MobileMenuProps) {
  if (!isOpen) return null

  return (
    <motion.div 
      className="sm:hidden absolute top-16 inset-x-0 bg-gray-800 shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-2 pt-2 pb-3 space-y-1">
        {NAVIGATION_ITEMS.map(({ label, path }) => (
          <Link
            key={label}
            href={path}
            className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ease-in-out"
          >
            {label}
          </Link>
        ))}
      </div>
    </motion.div>
  )
}