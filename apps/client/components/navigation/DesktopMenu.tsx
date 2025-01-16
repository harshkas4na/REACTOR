// components/navigation/DesktopMenu.tsx
import { NAVIGATION_ITEMS } from '../../data/constants'
import { NavLink } from './NavLink'

export function DesktopMenu() {
  return (
    <div className="hidden md:ml-6 md:flex md:space-x-6 lg:space-x-8">
      {NAVIGATION_ITEMS.map(({ label, path }) => (
        <NavLink key={label} href={path}>
          {label}
        </NavLink>
      ))}
    </div>
  )
}