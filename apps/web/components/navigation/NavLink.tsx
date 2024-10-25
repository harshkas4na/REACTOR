'use client'
import Link from 'next/link'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className = '' }: NavLinkProps) {
  return (
    <Link 
      href={href} 
      className={`text-gray-300 hover:text-primary py-2 relative group ${className}`}
    >
      <span className="relative z-10 px-1 text-sm font-medium transition-colors duration-300 ease-in-out">
        {children}
      </span>
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out" />
    </Link>
  )
}