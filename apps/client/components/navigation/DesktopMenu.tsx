// components/navigation/DesktopMenu.tsx
import { NAVIGATION_ITEMS } from '../../data/constants'
import { NavLink } from './NavLink'

export function DesktopMenu() {
  return (
    <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
      {NAVIGATION_ITEMS.map(({ label, path }) => (
        <NavLink key={label} href={path}>
          {label}
        </NavLink>
      ))}
    </div>
  )
}