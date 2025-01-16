// components/navigation/MenuToggle.tsx
'use client'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MenuToggleProps {
  isOpen: boolean
  onToggle: () => void
}

export function MenuToggle({ isOpen, onToggle }: MenuToggleProps) {
  return (
    <div className="sm:hidden flex items-center">
      <Button variant="ghost" size="icon" onClick={onToggle}>
        {isOpen ? 
          <X className="h-6 w-6 text-primary" /> : 
          <Menu className="h-6 w-6 text-primary" />
        }
      </Button>
    </div>
  )
}