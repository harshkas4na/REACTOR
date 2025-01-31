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
    <div className="lg:hidden flex items-center">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onToggle}
        className="text-gray-300 hover:text-primary"
      >
        {isOpen ? 
          <X className="h-6 w-6" /> : 
          <Menu className="h-6 w-6" />
        }
      </Button>
    </div>
  );
}